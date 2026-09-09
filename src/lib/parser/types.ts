export interface DetectedMonthColumn {
  monthName: string; // e.g. 'JANUARI'
  monthNum: number; // 1-12
  year: number;
  col: number; // 0-indexed column of the month label
}

export interface WidePnlSheetInfo {
  sheetName: string;
  headerRowIdx: number; // row containing month labels
  dateRowIdx: number | null; // row containing "01 - 31 Januari 2026" style ranges (for year detection)
  descColIdx: number; // column holding account/line description text
  months: DetectedMonthColumn[];
}

export interface ParsedLeafRow {
  sourceSheet: string;
  sourceRow: number; // 0-indexed
  accountName: string;
  period: string; // YYYY-MM
  year: number;
  month: number;
  amount: number;
}

export interface SheetDetectionLog {
  sheetName: string;
  selected: boolean;
  reason: string;
}

export interface ParseDebugInfo {
  sheetsTotal: number;
  sheetsUsed: string[];
  sheetsIgnored: number;
  sheetDetectionLog: SheetDetectionLog[];
  headerRow: number | null;
  detectedFields: string[];
  rowsParsed: number;
  rowsSkipped: number;
  detectedPeriods: string[];
  messages: string[];
}
