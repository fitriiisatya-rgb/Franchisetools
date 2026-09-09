import type { WidePnlSheetInfo, ParsedLeafRow, ParseDebugInfo } from './types';

// Rollup / subtotal rows in the source sheet. These are NOT stored as leaf
// transactions (their value is the sum of sibling leaf rows below/around them,
// per the source file's own formulas) — storing them too would double-count.
// They ARE used as reconciliation anchors: after summing our leaf transactions
// we compare against these source-reported totals and flag any variance.
const ROLLUP_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: 'REVENUE_GROSS', pattern: /^pendapatan kotor/i },
  { key: 'NET_SALES', pattern: /^penjualan bersih/i },
  { key: 'COGS_SECTION_TOTAL', pattern: /^harga pokok penjualan$/i },
  { key: 'GROSS_PROFIT_SOURCE', pattern: /^laba kotor/i },
  { key: 'OPEX_SECTION_HEADER', pattern: /^biaya operasional$/i },
  { key: 'OPEX_GAJI_PARENT', pattern: /^beban gaji$/i },
  { key: 'OPEX_MARKETING_PARENT', pattern: /^sales\s*&?\s*marketing tools expenses/i },
  { key: 'OPEX_LAINLAIN_PARENT', pattern: /^biaya operasional lain-lain$/i },
  { key: 'TOTAL_OPEX_SOURCE', pattern: /^total biaya/i },
  { key: 'OPERATING_PROFIT_SOURCE', pattern: /^profit ebitda/i },
  { key: 'SHARING_FEE', pattern: /^sharing fee/i },
  { key: 'FRANCHISEE_SPLIT', pattern: /^franchisee/i },
  { key: 'FRANCHISOR_SPLIT', pattern: /^franschisor|^franchisor/i },
];

const TERMINAL_PATTERN = /^profit ebitda/i;

function findRollupKey(desc: string): string | null {
  for (const r of ROLLUP_PATTERNS) if (r.pattern.test(desc)) return r.key;
  return null;
}

/** Reads a value for a given month using the "2-column block fallback" rule:
 * each month header occupies a 2-column block (value column + indentation
 * spacer column); different rows in this workbook put their number in
 * either the first or second column of the block depending on manual
 * formatting/indent level, so we take whichever of the two is non-null.
 * Validated against every reconciled subtotal in the pilot file.
 */
function readMonthValue(row: unknown[], col: number): number | null {
  const a = row[col];
  const b = row[col + 1];
  const v = a !== null && a !== undefined ? a : b;
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export interface RollupValue {
  key: string;
  sourceRow: number;
  desc: string;
  period: string;
  value: number;
}

export interface PnlParseResult {
  leaves: ParsedLeafRow[];
  rollups: RollupValue[];
  headerRow: number;
  rowsScanned: number;
  rowsSkippedEmpty: number;
}

export function parsePnlSheet(grid: unknown[][], info: WidePnlSheetInfo): PnlParseResult {
  const leaves: ParsedLeafRow[] = [];
  const rollups: RollupValue[] = [];
  const startRow = info.headerRowIdx + 2; // skip header + date-range row
  let emptyStreak = 0;
  let rowsScanned = 0;
  let rowsSkippedEmpty = 0;

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const rawDesc = row[info.descColIdx];
    const desc = typeof rawDesc === 'string' ? rawDesc.trim() : '';

    const hasAnyValue = info.months.some((m) => readMonthValue(row, m.col) !== null);

    if (!desc && !hasAnyValue) {
      emptyStreak++;
      rowsSkippedEmpty++;
      if (emptyStreak >= 3) break;
      continue;
    }
    emptyStreak = 0;
    rowsScanned++;

    if (!desc) continue;

    const rollupKey = findRollupKey(desc);

    for (const m of info.months) {
      const val = readMonthValue(row, m.col);
      if (val === null) continue;
      const period = `${m.year}-${String(m.monthNum).padStart(2, '0')}`;
      if (rollupKey) {
        rollups.push({ key: rollupKey, sourceRow: r, desc, period, value: val });
      } else {
        leaves.push({
          sourceSheet: info.sheetName,
          sourceRow: r,
          accountName: desc,
          period,
          year: m.year,
          month: m.monthNum,
          amount: val,
        });
      }
    }

    if (TERMINAL_PATTERN.test(desc)) break;
  }

  return { leaves, rollups, headerRow: info.headerRowIdx, rowsScanned, rowsSkippedEmpty };
}
