<?php

require __DIR__ . '/../bootstrap.php';

use App\Db;
use App\Http;

Http::requireMethod('GET');

$rows = Db::get()->query(
    "SELECT o.id, o.code, o.name,
        (SELECT COUNT(*) FROM transactions t WHERE t.outlet_id = o.id) as tx_count,
        (SELECT COUNT(DISTINCT period) FROM transactions t WHERE t.outlet_id = o.id) as periods_count,
        (SELECT MAX(period) FROM transactions t WHERE t.outlet_id = o.id) as latest_period,
        (SELECT u.data_quality_pct FROM uploads u WHERE u.outlet_id = o.id AND u.status = 'completed' ORDER BY u.uploaded_at DESC LIMIT 1) as latest_quality_pct,
        (SELECT COUNT(*) FROM uploads u WHERE u.outlet_id = o.id AND u.status = 'completed') as uploads_count
     FROM outlets o ORDER BY o.name ASC"
)->fetchAll();

$outlets = array_map(static fn ($r) => [
    'id' => (int) $r['id'],
    'code' => $r['code'],
    'name' => $r['name'],
    'tx_count' => (int) $r['tx_count'],
    'periods_count' => (int) $r['periods_count'],
    'latest_period' => $r['latest_period'],
    'latest_quality_pct' => $r['latest_quality_pct'] !== null ? (float) $r['latest_quality_pct'] : null,
    'uploads_count' => (int) $r['uploads_count'],
], $rows);

Http::jsonResponse(['outlets' => $outlets]);
