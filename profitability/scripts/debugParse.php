<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Parser\ExcelReader;
use App\Parser\PnlSheetParser;

$path = $argv[1] ?? null;
if (!$path) {
    fwrite(STDERR, "Usage: php debugParse.php <path-to-xlsx>\n");
    exit(1);
}

$t0 = microtime(true);
$scan = ExcelReader::scanWorkbook($path);
printf("Scan took %.2fs\n", microtime(true) - $t0);

if ($scan['pnlSheet'] === null) {
    echo "No P&L sheet detected.\n";
    exit(1);
}

echo "Selected sheet: {$scan['pnlSheet']['sheetName']}\n";
echo "Months detected: " . count($scan['pnlSheet']['months']) . "\n";
foreach ($scan['pnlSheet']['months'] as $m) {
    echo "  {$m['monthName']} {$m['year']} col={$m['col']}\n";
}
echo "DescCol: {$scan['pnlSheet']['descColIdx']} HeaderRow: {$scan['pnlSheet']['headerRowIdx']}\n";

$selected = array_values(array_filter($scan['detectionLog'], fn($d) => $d['selected']));
echo "Selected reason: " . ($selected[0]['reason'] ?? '-') . "\n";
echo "Total sheets scanned: " . count($scan['detectionLog']) . "\n";

$parsed = PnlSheetParser::parse($scan['pnlGrid'], $scan['pnlSheet']);
echo "rowsScanned={$parsed['rowsScanned']} leaves=" . count($parsed['leaves']) . " rollups=" . count($parsed['rollups']) . "\n";

echo "\nSample leaves:\n";
foreach (array_slice($parsed['leaves'], 0, 5) as $l) {
    echo json_encode($l) . "\n";
}

echo "\nRevenue leaves sum by period (accountName contains 'Pendapatan'):\n";
$byPeriod = [];
foreach ($parsed['leaves'] as $l) {
    if (stripos($l['accountName'], 'pendapatan') !== false) {
        $byPeriod[$l['period']] = ($byPeriod[$l['period']] ?? 0) + $l['amount'];
    }
}
ksort($byPeriod);
foreach ($byPeriod as $p => $v) {
    echo "  $p => " . number_format($v, 2) . "\n";
}
