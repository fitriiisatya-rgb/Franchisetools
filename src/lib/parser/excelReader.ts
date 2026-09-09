import ExcelJS from 'exceljs';
import type { DetectedMonthColumn, WidePnlSheetInfo, SheetDetectionLog } from './types';

const MONTHS_ID: { name: string; num: number; aliases: string[] }[] = [
  { name: 'JANUARI', num: 1, aliases: ['januari', 'jan'] },
  { name: 'FEBRUARI', num: 2, aliases: ['februari', 'feb'] },
  { name: 'MARET', num: 3, aliases: ['maret', 'mar'] },
  { name: 'APRIL', num: 4, aliases: ['april', 'apr'] },
  { name: 'MEI', num: 5, aliases: ['mei', 'may'] },
  { name: 'JUNI', num: 6, aliases: ['juni', 'jun'] },
  { name: 'JULI', num: 7, aliases: ['juli', 'jul'] },
  { name: 'AGUSTUS', num: 8, aliases: ['agustus', 'agu', 'aug'] },
  { name: 'SEPTEMBER', num: 9, aliases: ['september', 'sep', 'sept'] },
  { name: 'OKTOBER', num: 10, aliases: ['oktober', 'okt', 'oct'] },
  { name: 'NOVEMBER', num: 11, aliases: ['november', 'nov'] },
  { name: 'DESEMBER', num: 12, aliases: ['desember', 'des', 'dec'] },
];

function matchMonth(text: string): { name: string; num: number } | null {
  const t = text.trim().toLowerCase();
  for (const m of MONTHS_ID) {
    if (m.aliases.some((a) => t === a)) return { name: m.name, num: m.num };
  }
  return null;
}

function cellToPrimitive(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // Formula cell: { formula, result } — use cached computed result.
    if ('result' in value) {
      const r = (value as { result: unknown }).result;
      if (typeof r === 'number') return r;
      if (typeof r === 'string') return r;
      return null;
    }
    // Rich text: { richText: [{text}, ...] }
    if ('richText' in value) {
      const parts = (value as { richText: { text: string }[] }).richText;
      return parts.map((p) => p.text).join('');
    }
    // Hyperlink: { text, hyperlink }
    if ('text' in value) {
      const t = (value as { text: unknown }).text;
      return typeof t === 'string' ? t : null;
    }
  }
  return null;
}

/** Reads a worksheet into a 2D array of raw cell primitive values (row-major, 0-indexed). */
export function sheetToGrid(ws: ExcelJS.Worksheet): unknown[][] {
  const grid: unknown[][] = [];
  const rowCount = Math.max(ws.rowCount, ws.actualRowCount);
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const colCount = Math.max(ws.columnCount, row.actualCellCount, row.cellCount);
    const rowArr: unknown[] = new Array(colCount).fill(null);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      rowArr[c - 1] = cellToPrimitive(cell.value);
    }
    grid.push(rowArr);
  }
  return grid;
}

function extractYearFromRow(row: unknown[], col: number): number | null {
  for (const c of [col, col + 1, col - 1]) {
    const v = row[c];
    if (typeof v === 'string') {
      const m = v.match(/(20\d{2})/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return null;
}

/**
 * Detects a "wide monthly P&L" sheet: a row containing many month-name labels
 * across columns, with a nearby row giving each month's year, and a description
 * column holding line-item labels. Detection is signature-based (header text +
 * column pattern), not tied to sheet name or position.
 */
export function detectWidePnlSheet(grid: unknown[][], sheetName: string): WidePnlSheetInfo | null {
  const scanLimit = Math.min(grid.length, 8);
  for (let r = 0; r < scanLimit; r++) {
    const row = grid[r] ?? [];
    const monthHits: DetectedMonthColumn[] = [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== 'string') continue;
      // Merged header cells (e.g. "DESEMBER" spanning a 2-column block) come
      // back with the same value repeated across every column of the merge —
      // only the leftmost column is the true label; skip the repeats.
      if (c > 0 && row[c - 1] === cell) continue;
      const m = matchMonth(cell);
      if (!m) continue;
      const year = extractYearFromRow(grid[r + 1] ?? [], c) ?? extractYearFromRow(row, c) ?? new Date().getFullYear();
      monthHits.push({ monthName: m.name, monthNum: m.num, year, col: c });
    }
    if (monthHits.length >= 6) {
      let descCol = 1;
      for (let rr = Math.max(0, r - 1); rr <= r; rr++) {
        const hRow = grid[rr] ?? [];
        for (let c = 0; c < Math.min(hRow.length, monthHits[0].col); c++) {
          const cell = hRow[c];
          if (typeof cell === 'string' && /deskripsi|akun|account|description|uraian|keterangan/i.test(cell)) {
            descCol = c;
          }
        }
      }
      return {
        sheetName,
        headerRowIdx: r,
        dateRowIdx: r + 1 < grid.length ? r + 1 : null,
        descColIdx: descCol,
        months: monthHits,
      };
    }
  }
  return null;
}

export interface WorkbookScanResult {
  pnlSheet: WidePnlSheetInfo | null;
  pnlGrid: unknown[][] | null;
  detectionLog: SheetDetectionLog[];
}

export async function scanWorkbook(buffer: Buffer): Promise<WorkbookScanResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const detectionLog: SheetDetectionLog[] = [];
  let best: { info: WidePnlSheetInfo; grid: unknown[][]; score: number } | null = null;

  for (const ws of workbook.worksheets) {
    const sheetName = ws.name;
    const grid = sheetToGrid(ws);
    const info = detectWidePnlSheet(grid, sheetName);
    if (!info) {
      detectionLog.push({ sheetName, selected: false, reason: 'no wide monthly P&L header signature detected' });
      continue;
    }
    let score = info.months.length;
    if (/pnl|p&l|laba rugi|income statement/i.test(sheetName)) score += 10;
    const descText = grid
      .slice(info.headerRowIdx, info.headerRowIdx + 60)
      .map((row) => String(row[info.descColIdx] ?? ''))
      .join(' ')
      .toLowerCase();
    if (/pendapatan|hpp|biaya|laba|profit|revenue|omzet/.test(descText)) score += 5;
    detectionLog.push({ sheetName, selected: false, reason: `candidate wide P&L sheet (score ${score}, ${info.months.length} month columns)` });
    if (!best || score > best.score) best = { info, grid, score };
  }

  if (best) {
    const idx = detectionLog.findIndex((d) => d.sheetName === best!.info.sheetName);
    if (idx >= 0) {
      detectionLog[idx] = {
        sheetName: best.info.sheetName,
        selected: true,
        reason: `selected as primary P&L source sheet (score ${best.score})`,
      };
    }
  }

  return {
    pnlSheet: best?.info ?? null,
    pnlGrid: best?.grid ?? null,
    detectionLog,
  };
}
