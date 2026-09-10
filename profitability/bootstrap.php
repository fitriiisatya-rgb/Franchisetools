<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak stack traces to the browser in prod
date_default_timezone_set('Asia/Jakarta');

require __DIR__ . '/vendor/autoload.php';

use App\Mapping\Classifier;

// Boots the DB (creates schema on first run) and seeds mapping rules once.
\App\Db::get();
Classifier::ensureSeedRules();
