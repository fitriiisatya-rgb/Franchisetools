<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Parser\ExcelReader;
use App\Parser\PnlSheetParser;
use App\Mapping\Classifier;

$path = $argv[1] ?? null;
if (!$path) {
    fwrite(STDERR, "Usage: php debugParse2.php <path>\n");
    exit(1);
}

// Use a throwaway sqlite db for this probe so we don't touch storage/data.
putenv('APP_TEST_DB=1');

Classifier::ensureSeedRules();

$scan = ExcelReader::scanWorkbook($path);
$parsed = PnlSheetParser::parse($scan['pnlGrid'], $scan['pnlSheet']);

$dist = [];
$unmapped = [];
foreach ($parsed['leaves'] as $leaf) {
    $cls = Classifier::classifyAccount($leaf['accountName']);
    $dist[$cls['pnlGroup']] = ($dist[$cls['pnlGroup']] ?? 0) + 1;
    if ($cls['pnlGroup'] === 'UNMAPPED') {
        $unmapped[$leaf['accountName']] = true;
    }
}

echo "Category distribution:\n";
foreach ($dist as $k => $v) {
    echo "  $k => $v\n";
}
echo "Unmapped account names:\n";
foreach (array_keys($unmapped) as $name) {
    echo "  - $name\n";
}
