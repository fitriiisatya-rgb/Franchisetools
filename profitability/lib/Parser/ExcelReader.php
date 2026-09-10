<?php

namespace App\Parser;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Reads .xlsx workbooks and auto-detects the "wide monthly P&L" sheet by
 * header signature (month-name row + description column), not by sheet
 * name or position. Ported 1:1 from the validated TypeScript implementation
 * (src/lib/parser/excelReader.ts) — same detection scoring, same 2-column
 * value-fallback rule downstream in PnlSheetParser.
 */
final class ExcelReader
{
    /** @var array<int, array{name: string, num: int, aliases: string[]}> */
    private const MONTHS_ID = [
        ['name' => 'JANUARI', 'num' => 1, 'aliases' => ['januari', 'jan']],
        ['name' => 'FEBRUARI', 'num' => 2, 'aliases' => ['februari', 'feb']],
        ['name' => 'MARET', 'num' => 3, 'aliases' => ['maret', 'mar']],
        ['name' => 'APRIL', 'num' => 4, 'aliases' => ['april', 'apr']],
        ['name' => 'MEI', 'num' => 5, 'aliases' => ['mei', 'may']],
        ['name' => 'JUNI', 'num' => 6, 'aliases' => ['juni', 'jun']],
        ['name' => 'JULI', 'num' => 7, 'aliases' => ['juli', 'jul']],
        ['name' => 'AGUSTUS', 'num' => 8, 'aliases' => ['agustus', 'agu', 'aug']],
        ['name' => 'SEPTEMBER', 'num' => 9, 'aliases' => ['september', 'sep', 'sept']],
        ['name' => 'OKTOBER', 'num' => 10, 'aliases' => ['oktober', 'okt', 'oct']],
        ['name' => 'NOVEMBER', 'num' => 11, 'aliases' => ['november', 'nov']],
        ['name' => 'DESEMBER', 'num' => 12, 'aliases' => ['desember', 'des', 'dec']],
    ];

    private static function matchMonth(string $text): ?array
    {
        $t = mb_strtolower(trim($text));
        foreach (self::MONTHS_ID as $m) {
            if (in_array($t, $m['aliases'], true)) {
                return $m;
            }
        }
        return null;
    }

    /** Extract a computed (formula-resolved) primitive value from a cell. */
    private static function cellComputedValue(\PhpOffice\PhpSpreadsheet\Cell\Cell $cell)
    {
        $raw = $cell->getValue();
        if ($raw === null) {
            return null;
        }
        if (is_string($raw) && $raw !== '' && $raw[0] === '=') {
            // Formula cell: use the cached value Excel itself last computed
            // (matches openpyxl data_only=True / exceljs .result), instead
            // of re-evaluating with PhpSpreadsheet's own calc engine — this
            // avoids engine-compatibility drift and is much faster across a
            // 99-sheet, multi-year workbook.
            $old = $cell->getOldCalculatedValue();
            if ($old !== null) {
                return self::normalizeValue($old);
            }
            try {
                return self::normalizeValue($cell->getCalculatedValue());
            } catch (\Throwable $e) {
                return null;
            }
        }
        return self::normalizeValue($raw);
    }

    private static function normalizeValue($v)
    {
        if ($v instanceof RichText) {
            return $v->getPlainText();
        }
        if ($v instanceof \DateTimeInterface) {
            return $v->format('c');
        }
        if (is_object($v)) {
            return method_exists($v, '__toString') ? (string) $v : null;
        }
        return $v;
    }

    /** Reads a worksheet into a 0-indexed 2D array of raw cell primitive values. */
    public static function sheetToGrid(Worksheet $sheet): array
    {
        $highestRow = $sheet->getHighestDataRow();
        $highestColIdx = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

        $grid = [];
        for ($r = 1; $r <= $highestRow; $r++) {
            $rowArr = array_fill(0, $highestColIdx, null);
            for ($c = 1; $c <= $highestColIdx; $c++) {
                $coord = Coordinate::stringFromColumnIndex($c) . $r;
                $cell = $sheet->getCell($coord);
                $rowArr[$c - 1] = self::cellComputedValue($cell);
            }
            $grid[] = $rowArr;
        }
        return $grid;
    }

    private static function extractYearFromRow(array $row, int $col): ?int
    {
        foreach ([$col, $col + 1, $col - 1] as $c) {
            $v = $row[$c] ?? null;
            if (is_string($v) && preg_match('/(20\d{2})/', $v, $m)) {
                return (int) $m[1];
            }
        }
        return null;
    }

    /**
     * Detects a "wide monthly P&L" sheet: a row containing many month-name
     * labels across columns, with a nearby row giving each month's year, and
     * a description column holding line-item labels.
     *
     * @param array $grid 0-indexed 2D array from sheetToGrid()
     * @return array{sheetName:string, headerRowIdx:int, dateRowIdx:?int, descColIdx:int, months:array}|null
     */
    public static function detectWidePnlSheet(array $grid, string $sheetName): ?array
    {
        $scanLimit = min(count($grid), 8);
        for ($r = 0; $r < $scanLimit; $r++) {
            $row = $grid[$r] ?? [];
            $monthHits = [];
            $colCount = count($row);
            for ($c = 0; $c < $colCount; $c++) {
                $cell = $row[$c];
                if (!is_string($cell)) {
                    continue;
                }
                // Defensive: if a merged label were ever propagated across
                // columns (PhpSpreadsheet's readDataOnly mode does not do
                // this — only the anchor cell holds the value — but keep the
                // guard for parity with the TS/exceljs port and safety).
                if ($c > 0 && ($row[$c - 1] ?? null) === $cell) {
                    continue;
                }
                $m = self::matchMonth($cell);
                if ($m === null) {
                    continue;
                }
                $year = self::extractYearFromRow($grid[$r + 1] ?? [], $c)
                    ?? self::extractYearFromRow($row, $c)
                    ?? (int) date('Y');
                $monthHits[] = ['monthName' => $m['name'], 'monthNum' => $m['num'], 'year' => $year, 'col' => $c];
            }
            if (count($monthHits) >= 6) {
                $descCol = 1;
                for ($rr = max(0, $r - 1); $rr <= $r; $rr++) {
                    $hRow = $grid[$rr] ?? [];
                    $limit = min(count($hRow), $monthHits[0]['col']);
                    for ($c = 0; $c < $limit; $c++) {
                        $cell = $hRow[$c] ?? null;
                        if (is_string($cell) && preg_match('/deskripsi|akun|account|description|uraian|keterangan/i', $cell)) {
                            $descCol = $c;
                        }
                    }
                }
                return [
                    'sheetName' => $sheetName,
                    'headerRowIdx' => $r,
                    'dateRowIdx' => ($r + 1 < count($grid)) ? $r + 1 : null,
                    'descColIdx' => $descCol,
                    'months' => $monthHits,
                ];
            }
        }
        return null;
    }

    /**
     * Loads the workbook, scans every sheet, and returns the best-scoring
     * wide-P&L sheet candidate plus a full per-sheet detection log.
     *
     * @return array{pnlSheet: ?array, pnlGrid: ?array, detectionLog: array}
     */
    public static function scanWorkbook(string $filePath): array
    {
        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($filePath);

        $detectionLog = [];
        $best = null; // ['info' => ..., 'grid' => ..., 'score' => ...]

        foreach ($spreadsheet->getSheetNames() as $sheetName) {
            $sheet = $spreadsheet->getSheetByName($sheetName);
            $grid = self::sheetToGrid($sheet);
            $info = self::detectWidePnlSheet($grid, $sheetName);
            if ($info === null) {
                $detectionLog[] = ['sheetName' => $sheetName, 'selected' => false, 'reason' => 'no wide monthly P&L header signature detected'];
                continue;
            }
            $score = count($info['months']);
            if (preg_match('/pnl|p&l|laba rugi|income statement/i', $sheetName)) {
                $score += 10;
            }
            $descTextParts = [];
            $slice = array_slice($grid, $info['headerRowIdx'], 60);
            foreach ($slice as $row) {
                $descTextParts[] = (string) ($row[$info['descColIdx']] ?? '');
            }
            $descText = mb_strtolower(implode(' ', $descTextParts));
            if (preg_match('/pendapatan|hpp|biaya|laba|profit|revenue|omzet/', $descText)) {
                $score += 5;
            }
            $detectionLog[] = [
                'sheetName' => $sheetName,
                'selected' => false,
                'reason' => "candidate wide P&L sheet (score {$score}, " . count($info['months']) . ' month columns)',
            ];
            if ($best === null || $score > $best['score']) {
                $best = ['info' => $info, 'grid' => $grid, 'score' => $score];
            }
        }

        if ($best !== null) {
            foreach ($detectionLog as $i => $d) {
                if ($d['sheetName'] === $best['info']['sheetName']) {
                    $detectionLog[$i] = [
                        'sheetName' => $best['info']['sheetName'],
                        'selected' => true,
                        'reason' => "selected as primary P&L source sheet (score {$best['score']})",
                    ];
                    break;
                }
            }
        }

        // Free memory: PhpSpreadsheet objects can be large across 99 sheets.
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return [
            'pnlSheet' => $best['info'] ?? null,
            'pnlGrid' => $best['grid'] ?? null,
            'detectionLog' => $detectionLog,
        ];
    }
}
