<?php

namespace App\Parser;

/**
 * Ported 1:1 from src/lib/parser/pnlSheetParser.ts. Extracts leaf accounting
 * lines from the detected wide-P&L sheet grid, using the exact same rollup
 * exclusion patterns and the validated "2-column block fallback" value rule.
 */
final class PnlSheetParser
{
    /** @var array<int, array{key:string, pattern:string}> */
    private const ROLLUP_PATTERNS = [
        ['key' => 'REVENUE_GROSS', 'pattern' => '/^pendapatan kotor/i'],
        ['key' => 'NET_SALES', 'pattern' => '/^penjualan bersih/i'],
        ['key' => 'COGS_SECTION_TOTAL', 'pattern' => '/^harga pokok penjualan$/i'],
        ['key' => 'GROSS_PROFIT_SOURCE', 'pattern' => '/^laba kotor/i'],
        ['key' => 'OPEX_SECTION_HEADER', 'pattern' => '/^biaya operasional$/i'],
        ['key' => 'OPEX_GAJI_PARENT', 'pattern' => '/^beban gaji$/i'],
        ['key' => 'OPEX_MARKETING_PARENT', 'pattern' => '/^sales\s*&?\s*marketing tools expenses/i'],
        ['key' => 'OPEX_LAINLAIN_PARENT', 'pattern' => '/^biaya operasional lain-lain$/i'],
        ['key' => 'TOTAL_OPEX_SOURCE', 'pattern' => '/^total biaya/i'],
        ['key' => 'OPERATING_PROFIT_SOURCE', 'pattern' => '/^profit ebitda/i'],
        ['key' => 'SHARING_FEE', 'pattern' => '/^sharing fee/i'],
        ['key' => 'FRANCHISEE_SPLIT', 'pattern' => '/^franchisee/i'],
        ['key' => 'FRANCHISOR_SPLIT', 'pattern' => '/^franschisor|^franchisor/i'],
    ];

    private const TERMINAL_PATTERN = '/^profit ebitda/i';

    private static function findRollupKey(string $desc): ?string
    {
        foreach (self::ROLLUP_PATTERNS as $r) {
            if (preg_match($r['pattern'], $desc) === 1) {
                return $r['key'];
            }
        }
        return null;
    }

    /**
     * "2-column block fallback" rule: each month header occupies a 2-column
     * block (value column + indentation spacer column); different rows in
     * this workbook put their number in either the first or second column
     * of the block depending on manual formatting/indent level, so we take
     * whichever of the two is non-null. Validated against every reconciled
     * subtotal in the pilot file.
     */
    private static function readMonthValue(array $row, int $col): ?float
    {
        $a = $row[$col] ?? null;
        $b = $row[$col + 1] ?? null;
        $v = $a !== null ? $a : $b;
        if ($v === null) {
            return null;
        }
        if (is_int($v) || is_float($v)) {
            return (float) $v;
        }
        if (is_string($v)) {
            $cleaned = preg_replace('/[^0-9.\-]/', '', $v);
            if ($cleaned === '' || $cleaned === '-') {
                return null;
            }
            if (!is_numeric($cleaned)) {
                return null;
            }
            return (float) $cleaned;
        }
        return null;
    }

    /**
     * @param array $grid 0-indexed grid from ExcelReader::sheetToGrid()
     * @param array $info detection info from ExcelReader::detectWidePnlSheet()
     * @return array{leaves: array, rollups: array, headerRow: int, rowsScanned: int, rowsSkippedEmpty: int}
     */
    public static function parse(array $grid, array $info): array
    {
        $leaves = [];
        $rollups = [];
        $startRow = $info['headerRowIdx'] + 2; // skip header + date-range row
        $emptyStreak = 0;
        $rowsScanned = 0;
        $rowsSkippedEmpty = 0;
        $gridCount = count($grid);

        for ($r = $startRow; $r < $gridCount; $r++) {
            $row = $grid[$r] ?? [];
            $rawDesc = $row[$info['descColIdx']] ?? null;
            $desc = is_string($rawDesc) ? trim($rawDesc) : '';

            $hasAnyValue = false;
            foreach ($info['months'] as $m) {
                if (self::readMonthValue($row, $m['col']) !== null) {
                    $hasAnyValue = true;
                    break;
                }
            }

            if ($desc === '' && !$hasAnyValue) {
                $emptyStreak++;
                $rowsSkippedEmpty++;
                if ($emptyStreak >= 3) {
                    break;
                }
                continue;
            }
            $emptyStreak = 0;
            $rowsScanned++;

            if ($desc === '') {
                continue;
            }

            $rollupKey = self::findRollupKey($desc);

            foreach ($info['months'] as $m) {
                $val = self::readMonthValue($row, $m['col']);
                if ($val === null) {
                    continue;
                }
                $period = sprintf('%d-%02d', $m['year'], $m['monthNum']);
                if ($rollupKey !== null) {
                    $rollups[] = ['key' => $rollupKey, 'sourceRow' => $r, 'desc' => $desc, 'period' => $period, 'value' => $val];
                } else {
                    $leaves[] = [
                        'sourceSheet' => $info['sheetName'],
                        'sourceRow' => $r,
                        'accountName' => $desc,
                        'period' => $period,
                        'year' => $m['year'],
                        'month' => $m['monthNum'],
                        'amount' => $val,
                    ];
                }
            }

            if (preg_match(self::TERMINAL_PATTERN, $desc) === 1) {
                break;
            }
        }

        return [
            'leaves' => $leaves,
            'rollups' => $rollups,
            'headerRow' => $info['headerRowIdx'],
            'rowsScanned' => $rowsScanned,
            'rowsSkippedEmpty' => $rowsSkippedEmpty,
        ];
    }
}
