<?php

require __DIR__ . '/../bootstrap.php';

use App\Db;
use App\Http;

Http::requireMethod('GET');

$pdo = Db::get();
$outletId = isset($_GET['outletId']) && $_GET['outletId'] !== '' ? (int) $_GET['outletId'] : null;

$sql = 'SELECT u.id, u.filename, u.status, u.detected_periods, u.sheets_total, u.sheets_used, u.sheets_ignored,
               u.rows_processed, u.rows_mapped, u.rows_unmapped, u.data_quality_pct, u.uploaded_at, u.debug_log,
               o.name as outlet_name, o.id as outlet_id
        FROM uploads u JOIN outlets o ON o.id = u.outlet_id';
$params = [];
if ($outletId !== null) {
    $sql .= ' WHERE u.outlet_id = ?';
    $params[] = $outletId;
}
$sql .= ' ORDER BY u.uploaded_at DESC';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$uploads = array_map(static function ($u) {
    $u['debug_log'] = json_decode($u['debug_log'] ?? '{}', true);
    $u['sheets_total'] = (int) $u['sheets_total'];
    $u['sheets_used'] = (int) $u['sheets_used'];
    $u['sheets_ignored'] = (int) $u['sheets_ignored'];
    $u['rows_processed'] = (int) $u['rows_processed'];
    $u['rows_mapped'] = (int) $u['rows_mapped'];
    $u['rows_unmapped'] = (int) $u['rows_unmapped'];
    $u['data_quality_pct'] = (float) $u['data_quality_pct'];
    return $u;
}, $stmt->fetchAll());

$unmappedSql = "SELECT account_name, source_sheet, COUNT(*) as occurrences, SUM(amount) as total_amount, MAX(period) as latest_period
                FROM transactions WHERE category = 'UNMAPPED'" . ($outletId !== null ? ' AND outlet_id = ?' : '') . '
                GROUP BY account_name, source_sheet ORDER BY occurrences DESC';
$stmt2 = $pdo->prepare($unmappedSql);
$stmt2->execute($outletId !== null ? [$outletId] : []);
$unmapped = array_map(static fn ($r) => [
    'account_name' => $r['account_name'],
    'source_sheet' => $r['source_sheet'],
    'occurrences' => (int) $r['occurrences'],
    'total_amount' => (float) $r['total_amount'],
    'latest_period' => $r['latest_period'],
], $stmt2->fetchAll());

Http::jsonResponse(['uploads' => $uploads, 'unmappedAccounts' => $unmapped]);
