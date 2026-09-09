import crypto from 'crypto';
import { db } from '@/lib/db';
import { scanWorkbook } from '@/lib/parser/excelReader';
import { parsePnlSheet, type RollupValue } from '@/lib/parser/pnlSheetParser';
import { detectOutletName, slugifyCode, sanitizeFilename } from '@/lib/parser/outletDetect';
import { classifyAccount, ensureSeedRules } from '@/lib/mapping/classify';
import type { ParsedLeafRow } from '@/lib/parser/types';

ensureSeedRules();

// Legacy binary .xls (OLE2 format) is intentionally not accepted: the parser
// (exceljs) only reads OOXML .xlsx, and no safe/maintained legacy .xls reader
// was available to add — see Known Limitations in the project report.
export const ALLOWED_EXTENSIONS = ['.xlsx'];
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. — real xlsx signature

export class IngestValidationError extends Error {}

export interface IngestResult {
  status: 'completed' | 'duplicate_skipped';
  uploadId: number;
  outletId: number;
  outletName: string;
  filename: string;
  detectedPeriods: string[];
  sheetsTotal: number;
  sheetsUsed: number;
  sheetsIgnored: number;
  rowsProcessed: number;
  rowsMapped: number;
  rowsUnmapped: number;
  dataQualityPct: number;
  reconciliation: { key: string; period: string; sourceValue: number; computedValue: number; variancePct: number; status: string }[];
  message: string;
}

function validateFileBuffer(filename: string, buffer: Buffer) {
  const ext = (filename.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new IngestValidationError(`Tipe file tidak didukung: ${ext || '(tidak ada ekstensi)'}. Gunakan .xlsx.`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new IngestValidationError(`Ukuran file melebihi batas maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }
  if (buffer.length < 8) {
    throw new IngestValidationError('File kosong atau rusak.');
  }
  const isZip = buffer.subarray(0, 4).equals(ZIP_MAGIC);
  if (!isZip) {
    throw new IngestValidationError('Signature file tidak sesuai format .xlsx (ZIP/OOXML) yang valid. Ekstensi file tidak dapat dipercaya begitu saja.');
  }
}

// Rollup keys we can reconcile against a computed leaf-level sum.
const RECONCILE_TARGETS: { key: string; computedFrom: (agg: PeriodAgg) => number; tolerancePct: number }[] = [
  { key: 'REVENUE_GROSS', computedFrom: (a) => a.revenueLeaves + a.promo, tolerancePct: 0.5 },
  { key: 'NET_SALES', computedFrom: (a) => a.revenueLeaves, tolerancePct: 0.5 },
  // Source's own "Laba Kotor" nets online commission into COGS; our dashboard
  // reports Gross Profit and Online Cost as separate driver lines instead, so
  // reconcile against the source's definition here (commission included).
  { key: 'GROSS_PROFIT_SOURCE', computedFrom: (a) => a.revenueLeaves - a.cogsPure - a.onlineCost, tolerancePct: 0.5 },
  { key: 'TOTAL_OPEX_SOURCE', computedFrom: (a) => a.opex, tolerancePct: 0.5 },
  { key: 'OPERATING_PROFIT_SOURCE', computedFrom: (a) => a.revenueLeaves - a.cogsPure - a.onlineCost - a.opex, tolerancePct: 0.5 },
];

interface PeriodAgg {
  revenueLeaves: number;
  promo: number;
  cogsPure: number;
  onlineCost: number;
  opex: number;
}

export async function ingestWorkbook(
  buffer: Buffer,
  originalFilename: string,
  outletOverride?: { name?: string; code?: string }
): Promise<IngestResult> {
  const filename = sanitizeFilename(originalFilename);
  validateFileBuffer(filename, buffer);

  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const outletName = outletOverride?.name?.trim() || detectOutletName(filename);
  const outletCode = outletOverride?.code?.trim() || slugifyCode(outletName) || 'outlet-' + fileHash.slice(0, 8);

  let outlet = db.prepare('SELECT id FROM outlets WHERE code = ?').get(outletCode) as { id: number } | undefined;
  if (!outlet) {
    const info = db.prepare('INSERT INTO outlets (code, name) VALUES (?, ?)').run(outletCode, outletName);
    outlet = { id: info.lastInsertRowid as number };
  }
  const outletId = outlet.id;

  const existing = db
    .prepare("SELECT * FROM uploads WHERE outlet_id = ? AND file_hash = ? AND status = 'completed'")
    .get(outletId, fileHash) as Record<string, unknown> | undefined;
  if (existing) {
    return {
      status: 'duplicate_skipped',
      uploadId: existing.id as number,
      outletId,
      outletName,
      filename,
      detectedPeriods: JSON.parse((existing.detected_periods as string) || '[]'),
      sheetsTotal: existing.sheets_total as number,
      sheetsUsed: existing.sheets_used as number,
      sheetsIgnored: existing.sheets_ignored as number,
      rowsProcessed: existing.rows_processed as number,
      rowsMapped: existing.rows_mapped as number,
      rowsUnmapped: existing.rows_unmapped as number,
      dataQualityPct: existing.data_quality_pct as number,
      reconciliation: [],
      message: 'File identik dengan upload sebelumnya sudah pernah diproses — tidak diproses ulang untuk mencegah duplikasi data.',
    };
  }

  const scan = await scanWorkbook(buffer);
  if (!scan.pnlSheet || !scan.pnlGrid) {
    throw new IngestValidationError(
      'Tidak ditemukan sheet P&L bulanan yang dapat dikenali (dibutuhkan sheet dengan header berisi minimal 6 nama bulan dan kolom deskripsi akun).'
    );
  }

  const parsed = parsePnlSheet(scan.pnlGrid, scan.pnlSheet);

  // classify + compute per-period aggregates for reconciliation
  const periodAgg = new Map<string, PeriodAgg>();
  const classified: { leaf: ParsedLeafRow; category: string; analysisGroup: string; subcategory: string | null; normalized: string; mappingId: number | null }[] = [];

  for (const leaf of parsed.leaves) {
    const cls = classifyAccount(leaf.accountName);
    classified.push({
      leaf,
      category: cls.pnlGroup,
      analysisGroup: cls.analysisGroup,
      subcategory: cls.subcategory,
      normalized: cls.normalizedAccount,
      mappingId: cls.mappingId,
    });
    const agg = periodAgg.get(leaf.period) ?? { revenueLeaves: 0, promo: 0, cogsPure: 0, onlineCost: 0, opex: 0 };
    if (cls.pnlGroup === 'REVENUE') agg.revenueLeaves += leaf.amount;
    else if (cls.analysisGroup === 'PROMO') agg.promo += leaf.amount;
    else if (cls.analysisGroup === 'COGS') agg.cogsPure += leaf.amount;
    else if (cls.analysisGroup === 'ONLINE_COST') agg.onlineCost += leaf.amount;
    else if (cls.analysisGroup === 'OPEX') agg.opex += leaf.amount;
    periodAgg.set(leaf.period, agg);
  }

  // Detected periods: only months where actual revenue was recorded (excludes
  // empty future months present as blank columns in the source template).
  const detectedPeriods = [...periodAgg.entries()]
    .filter(([, a]) => a.revenueLeaves > 0)
    .map(([p]) => p)
    .sort();

  if (detectedPeriods.length === 0) {
    throw new IngestValidationError('Sheet P&L ditemukan tetapi tidak ada periode dengan data omzet > 0.');
  }

  const detectedPeriodSet = new Set(detectedPeriods);
  const rowsInScopeClassified = classified.filter((c) => detectedPeriodSet.has(c.leaf.period));
  const rowsProcessed = rowsInScopeClassified.length;
  const rowsUnmapped = rowsInScopeClassified.filter((c) => c.category === 'UNMAPPED').length;
  const rowsMapped = rowsProcessed - rowsUnmapped;
  const dataQualityPct = rowsProcessed > 0 ? Math.round((rowsMapped / rowsProcessed) * 1000) / 10 : 0;

  const sheetsUsedCount = scan.detectionLog.filter((d) => d.selected).length;
  const sheetsTotal = scan.detectionLog.length;
  const sheetsIgnored = sheetsTotal - sheetsUsedCount;

  const debugLog = {
    sheetDetection: scan.detectionLog,
    headerRow: parsed.headerRow,
    detectedFields: [...new Set(rowsInScopeClassified.map((c) => c.normalized))],
    rowsScanned: parsed.rowsScanned,
    rowsSkippedEmpty: parsed.rowsSkippedEmpty,
    mappingSuccess: rowsMapped,
    mappingFailed: rowsUnmapped,
    unmappedAccountNames: [...new Set(rowsInScopeClassified.filter((c) => c.category === 'UNMAPPED').map((c) => c.leaf.accountName))],
    detectedPeriods,
  };

  const insertUpload = db.prepare(`
    INSERT INTO uploads (outlet_id, filename, file_hash, status, detected_periods, sheets_total, sheets_used, sheets_ignored, rows_processed, rows_mapped, rows_unmapped, data_quality_pct, debug_log)
    VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteExistingForPeriod = db.prepare('DELETE FROM transactions WHERE outlet_id = ? AND period = ?');
  const insertTx = db.prepare(`
    INSERT INTO transactions (upload_id, outlet_id, period, year, month, source_file, source_sheet, source_row, account_code, account_name, description, category, subcategory, analysis_group, mapping_id, debit, credit, amount)
    VALUES (@upload_id, @outlet_id, @period, @year, @month, @source_file, @source_sheet, @source_row, NULL, @account_name, NULL, @category, @subcategory, @analysis_group, @mapping_id, 0, 0, @amount)
  `);

  const replacedPeriods: string[] = [];

  const uploadId = db.transaction(() => {
    for (const p of detectedPeriods) {
      const count = (db.prepare('SELECT COUNT(*) as c FROM transactions WHERE outlet_id = ? AND period = ?').get(outletId, p) as { c: number }).c;
      if (count > 0) replacedPeriods.push(p);
      deleteExistingForPeriod.run(outletId, p);
    }

    const info = insertUpload.run(
      outletId,
      filename,
      fileHash,
      JSON.stringify(detectedPeriods),
      sheetsTotal,
      sheetsUsedCount,
      sheetsIgnored,
      rowsProcessed,
      rowsMapped,
      rowsUnmapped,
      dataQualityPct,
      JSON.stringify(debugLog)
    );
    const newUploadId = info.lastInsertRowid as number;

    for (const c of rowsInScopeClassified) {
      insertTx.run({
        upload_id: newUploadId,
        outlet_id: outletId,
        period: c.leaf.period,
        year: c.leaf.year,
        month: c.leaf.month,
        source_file: filename,
        source_sheet: c.leaf.sourceSheet,
        source_row: c.leaf.sourceRow,
        account_name: c.leaf.accountName,
        category: c.category,
        subcategory: c.subcategory,
        analysis_group: c.analysisGroup,
        mapping_id: c.mappingId,
        amount: c.leaf.amount,
      });
    }
    return newUploadId;
  })();

  // Reconciliation checks against source-reported subtotals
  const reconciliation: IngestResult['reconciliation'] = [];
  const rollupsByKeyPeriod = new Map<string, RollupValue[]>();
  for (const r of parsed.rollups) {
    if (!detectedPeriodSet.has(r.period)) continue;
    const arr = rollupsByKeyPeriod.get(r.key) ?? [];
    arr.push(r);
    rollupsByKeyPeriod.set(r.key, arr);
  }
  const insertCheck = db.prepare(`
    INSERT INTO reconciliation_checks (upload_id, period, check_name, source_value, computed_value, variance, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const checkTx = db.transaction(() => {
    for (const target of RECONCILE_TARGETS) {
      const rows = rollupsByKeyPeriod.get(target.key) ?? [];
      for (const row of rows) {
        const agg = periodAgg.get(row.period);
        if (!agg) continue;
        const computed = target.computedFrom(agg);
        const denom = Math.abs(row.value) > 1 ? Math.abs(row.value) : 1;
        const variancePct = (Math.abs(computed - row.value) / denom) * 100;
        const status = variancePct <= target.tolerancePct ? 'OK' : 'MISMATCH';
        insertCheck.run(uploadId, row.period, target.key, row.value, computed, variancePct, status);
        reconciliation.push({ key: target.key, period: row.period, sourceValue: row.value, computedValue: computed, variancePct: Math.round(variancePct * 100) / 100, status });
      }
    }
  });
  checkTx();

  const mismatches = reconciliation.filter((r) => r.status === 'MISMATCH');
  const message =
    (replacedPeriods.length > 0
      ? `Data periode ${replacedPeriods.join(', ')} sebelumnya sudah ada dan telah digantikan (replace) dengan data terbaru dari file ini. `
      : '') +
    `Berhasil memproses ${detectedPeriods.length} periode (${detectedPeriods[0]} s/d ${detectedPeriods[detectedPeriods.length - 1]}).` +
    (mismatches.length > 0 ? ` Peringatan: ${mismatches.length} pengecekan rekonsiliasi memiliki selisih di atas toleransi.` : ' Seluruh pengecekan rekonsiliasi cocok dengan sumber.');

  return {
    status: 'completed',
    uploadId,
    outletId,
    outletName,
    filename,
    detectedPeriods,
    sheetsTotal,
    sheetsUsed: sheetsUsedCount,
    sheetsIgnored,
    rowsProcessed,
    rowsMapped,
    rowsUnmapped,
    dataQualityPct,
    reconciliation,
    message,
  };
}
