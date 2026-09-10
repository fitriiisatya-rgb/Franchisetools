<?php

require __DIR__ . '/../bootstrap.php';

use App\Ingest;

$path = $argv[1] ?? null;
if (!$path) {
    fwrite(STDERR, "Usage: php testParse.php <path-to-xlsx>\n");
    exit(1);
}

$result = Ingest::ingestWorkbook($path, basename($path), [], filesize($path));
echo json_encode($result, JSON_PRETTY_PRINT) . "\n";
