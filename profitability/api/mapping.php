<?php

require __DIR__ . '/../bootstrap.php';

use App\Db;
use App\Http;
use App\Mapping\Classifier;

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $rows = Db::get()->query('SELECT * FROM account_mapping ORDER BY mapping_priority ASC, id ASC')->fetchAll();
    Http::jsonResponse(['rules' => $rows]);
}

if ($method !== 'POST') {
    Http::errorResponse('Method not allowed', 405);
}

$body = Http::jsonBody();
$accountPattern = trim((string) ($body['accountPattern'] ?? ''));
$normalizedAccount = trim((string) ($body['normalizedAccount'] ?? ''));
$pnlGroup = trim((string) ($body['pnlGroup'] ?? ''));
$analysisGroup = trim((string) ($body['analysisGroup'] ?? ''));
$subcategory = isset($body['subcategory']) && $body['subcategory'] !== '' ? (string) $body['subcategory'] : null;
$mappingPriority = isset($body['mappingPriority']) ? (int) $body['mappingPriority'] : 20;

if ($accountPattern === '' || $normalizedAccount === '' || $pnlGroup === '' || $analysisGroup === '') {
    Http::errorResponse('accountPattern, normalizedAccount, pnlGroup, analysisGroup wajib diisi.', 400);
}

$validGroups = ['REVENUE', 'SALES_DEDUCTION', 'PROMO', 'COGS', 'ONLINE_COST', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE'];
if (!in_array($pnlGroup, $validGroups, true) || !in_array($analysisGroup, $validGroups, true)) {
    Http::errorResponse('Group tidak valid. Pilih salah satu: ' . implode(', ', $validGroups), 400);
}

$pdo = Db::get();
$ins = $pdo->prepare(
    "INSERT INTO account_mapping (account_pattern, normalized_account, pnl_group, analysis_group, subcategory, mapping_priority, match_type, source)
     VALUES (?, ?, ?, ?, ?, ?, 'contains', 'manual')"
);
$ins->execute([$accountPattern, $normalizedAccount, $pnlGroup, $analysisGroup, $subcategory, $mappingPriority]);
$ruleId = (int) $pdo->lastInsertId();

Classifier::loadRules(true); // refresh cache so the new rule applies immediately

// Reclassify any existing UNMAPPED transactions that now match this rule.
$candidates = $pdo->query("SELECT id, account_name FROM transactions WHERE category = 'UNMAPPED'")->fetchAll();
$update = $pdo->prepare('UPDATE transactions SET category = ?, subcategory = ?, analysis_group = ?, mapping_id = ? WHERE id = ?');

$reclassified = 0;
$pdo->beginTransaction();
foreach ($candidates as $c) {
    $cls = Classifier::classifyAccount($c['account_name']);
    if ($cls['pnlGroup'] !== 'UNMAPPED') {
        $update->execute([$cls['pnlGroup'], $cls['subcategory'], $cls['analysisGroup'], $cls['mappingId'], $c['id']]);
        $reclassified++;
    }
}
$pdo->commit();

Http::jsonResponse(['ruleId' => $ruleId, 'reclassified' => $reclassified]);
