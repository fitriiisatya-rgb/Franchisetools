<?php

require __DIR__ . '/../bootstrap.php';

use App\Ingest;
use App\Engine\AnalysisEngine;

$path = $argv[1] ?? null;
if (!$path) {
    fwrite(STDERR, "Usage: php testAnalysis.php <path-to-xlsx>\n");
    exit(1);
}

$result = Ingest::ingestWorkbook($path, basename($path), [], filesize($path));
fwrite(STDERR, "Ingest: {$result['status']}, quality={$result['dataQualityPct']}%\n");

$analysis = AnalysisEngine::buildFullAnalysis($result['outletId'], '2026-08', '2026-07');
echo json_encode($analysis, JSON_PRETTY_PRINT) . "\n";
