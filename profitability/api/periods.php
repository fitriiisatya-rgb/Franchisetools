<?php

require __DIR__ . '/../bootstrap.php';

use App\Engine\PnlEngine;
use App\Http;

Http::requireMethod('GET');

$outletId = (int) ($_GET['outletId'] ?? 0);
if ($outletId <= 0) {
    Http::errorResponse('outletId is required', 400);
}

Http::jsonResponse(['periods' => PnlEngine::getAvailablePeriods($outletId)]);
