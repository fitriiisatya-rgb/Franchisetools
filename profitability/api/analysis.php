<?php

require __DIR__ . '/../bootstrap.php';

use App\Engine\AnalysisEngine;
use App\Http;

Http::requireMethod('GET');

$outletId = (int) ($_GET['outletId'] ?? 0);
$period = $_GET['period'] ?? '';
$comparePeriod = $_GET['comparePeriod'] ?? '';

if ($outletId <= 0 || $period === '' || $comparePeriod === '') {
    Http::errorResponse('outletId, period, and comparePeriod are required', 400);
}

$analysis = AnalysisEngine::buildFullAnalysis($outletId, $period, $comparePeriod);
if ($analysis === null) {
    Http::errorResponse('Data tidak ditemukan untuk periode yang dipilih.', 404);
}

Http::jsonResponse($analysis);
