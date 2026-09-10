<?php

namespace App;

use App\Mapping\Classifier;
use App\Parser\ExcelReader;
use App\Parser\OutletDetect;
use App\Parser\PnlSheetParser;

final class IngestValidationError extends \RuntimeException
{
}

/** Ported 1:1 from src/lib/ingest.ts. */
final class Ingest
{
    public const ALLOWED_EXTENSIONS = ['.xlsx'];
    public const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private const ZIP_MAGIC = "PK\x03\x04";

    /** @var array<int, array{key:string, tolerancePct: float}> */
    private const RECONCILE_KEYS = ['REVENUE_GROSS', 'NET_SALES', 'GROSS_PROFIT_SOURCE', 'TOTAL_OPEX_SOURCE', 'OPERATING_PROFIT_SOURCE'];

    private static function computedFrom(string $key, array $agg): ?float
    {
        return match ($key) {
            'REVENUE_GROSS' => $agg['revenueLeaves'] + $agg['promo'],
            'NET_SALES' => $agg['revenueLeaves'],
            // Source's own "Laba Kotor" nets online commission into COGS; our
            // dashboard reports Gross Profit and Online Cost as separate
            // driver lines instead, so reconcile against the source's own
            // definition here (commission included).
            'GROSS_PROFIT_SOURCE' => $agg['revenueLeaves'] - $agg['cogsPure'] - $agg['onlineCost'],
            'TOTAL_OPEX_SOURCE' => $agg['opex'],
            'OPERATING_PROFIT_SOURCE' => $agg['revenueLeaves'] - $agg['cogsPure'] - $agg['onlineCost'] - $agg['opex'],
            default => null,
        };
    }

    private static function validateFile(string $filename, string $tmpPath, int $reportedSize): void
    {
        $ext = '';
        if (preg_match('/\.[^.]+$/', $filename, $m)) {
            $ext = mb_strtolower($m[0]);
        }
        if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            throw new IngestValidationError("Tipe file tidak didukung: " . ($ext !== '' ? $ext : '(tidak ada ekstensi)') . '. Gunakan .xlsx.');
        }
        if ($reportedSize > self::MAX_FILE_SIZE) {
            throw new IngestValidationError('Ukuran file melebihi batas maksimum ' . (self::MAX_FILE_SIZE / (1024 * 1024)) . 'MB.');
        }
        if (!is_file($tmpPath) || filesize($tmpPath) < 8) {
            throw new IngestValidationError('File kosong atau rusak.');
        }
        $fh = fopen($tmpPath, 'rb');
        $magic = fread($fh, 4);
        fclose($fh);
        if ($magic !== self::ZIP_MAGIC) {
            throw new IngestValidationError('Signature file tidak sesuai format .xlsx (ZIP/OOXML) yang valid. Ekstensi file tidak dapat dipercaya begitu saja.');
        }
    }

    /**
     * @param string $tmpPath Path to the uploaded file on disk (e.g. PHP's $_FILES[...]['tmp_name'])
     * @param string $originalFilename Original client-supplied filename
     * @param array{name?: string, code?: string} $outletOverride
     * @param int $reportedSize Size in bytes as reported by the upload (validated against actual file too)
     */
    public static function ingestWorkbook(string $tmpPath, string $originalFilename, array $outletOverride, int $reportedSize): array
    {
        $filename = OutletDetect::sanitizeFilename($originalFilename);
        self::validateFile($filename, $tmpPath, $reportedSize);

        $fileHash = hash_file('sha256', $tmpPath);

        $outletName = trim($outletOverride['name'] ?? '') ?: OutletDetect::detectOutletName($filename);
        $outletCode = trim($outletOverride['code'] ?? '') ?: (OutletDetect::slugifyCode($outletName) ?: ('outlet-' . substr($fileHash, 0, 8)));

        $pdo = Db::get();

        $stmt = $pdo->prepare('SELECT id FROM outlets WHERE code = ?');
        $stmt->execute([$outletCode]);
        $outletRow = $stmt->fetch();
        if ($outletRow) {
            $outletId = (int) $outletRow['id'];
        } else {
            $ins = $pdo->prepare('INSERT INTO outlets (code, name) VALUES (?, ?)');
            $ins->execute([$outletCode, $outletName]);
            $outletId = (int) $pdo->lastInsertId();
        }

        $stmt = $pdo->prepare("SELECT * FROM uploads WHERE outlet_id = ? AND file_hash = ? AND status = 'completed'");
        $stmt->execute([$outletId, $fileHash]);
        $existing = $stmt->fetch();
        if ($existing) {
            return [
                'status' => 'duplicate_skipped',
                'uploadId' => (int) $existing['id'],
                'outletId' => $outletId,
                'outletName' => $outletName,
                'filename' => $filename,
                'detectedPeriods' => json_decode($existing['detected_periods'] ?: '[]', true),
                'sheetsTotal' => (int) $existing['sheets_total'],
                'sheetsUsed' => (int) $existing['sheets_used'],
                'sheetsIgnored' => (int) $existing['sheets_ignored'],
                'rowsProcessed' => (int) $existing['rows_processed'],
                'rowsMapped' => (int) $existing['rows_mapped'],
                'rowsUnmapped' => (int) $existing['rows_unmapped'],
                'dataQualityPct' => (float) $existing['data_quality_pct'],
                'reconciliation' => [],
                'message' => 'File identik dengan upload sebelumnya sudah pernah diproses — tidak diproses ulang untuk mencegah duplikasi data.',
            ];
        }

        $scan = ExcelReader::scanWorkbook($tmpPath);
        if ($scan['pnlSheet'] === null || $scan['pnlGrid'] === null) {
            throw new IngestValidationError('Tidak ditemukan sheet P&L bulanan yang dapat dikenali (dibutuhkan sheet dengan header berisi minimal 6 nama bulan dan kolom deskripsi akun).');
        }

        $parsed = PnlSheetParser::parse($scan['pnlGrid'], $scan['pnlSheet']);

        $periodAgg = []; // period => ['revenueLeaves'=>, 'promo'=>, 'cogsPure'=>, 'onlineCost'=>, 'opex'=>]
        $classified = [];

        foreach ($parsed['leaves'] as $leaf) {
            $cls = Classifier::classifyAccount($leaf['accountName']);
            $classified[] = [
                'leaf' => $leaf,
                'category' => $cls['pnlGroup'],
                'analysisGroup' => $cls['analysisGroup'],
                'subcategory' => $cls['subcategory'],
                'normalized' => $cls['normalizedAccount'],
                'mappingId' => $cls['mappingId'],
            ];
            $p = $leaf['period'];
            if (!isset($periodAgg[$p])) {
                $periodAgg[$p] = ['revenueLeaves' => 0.0, 'promo' => 0.0, 'cogsPure' => 0.0, 'onlineCost' => 0.0, 'opex' => 0.0];
            }
            if ($cls['pnlGroup'] === 'REVENUE') {
                $periodAgg[$p]['revenueLeaves'] += $leaf['amount'];
            } elseif ($cls['analysisGroup'] === 'PROMO') {
                $periodAgg[$p]['promo'] += $leaf['amount'];
            } elseif ($cls['analysisGroup'] === 'COGS') {
                $periodAgg[$p]['cogsPure'] += $leaf['amount'];
            } elseif ($cls['analysisGroup'] === 'ONLINE_COST') {
                $periodAgg[$p]['onlineCost'] += $leaf['amount'];
            } elseif ($cls['analysisGroup'] === 'OPEX') {
                $periodAgg[$p]['opex'] += $leaf['amount'];
            }
        }

        $detectedPeriods = [];
        foreach ($periodAgg as $p => $a) {
            if ($a['revenueLeaves'] > 0) {
                $detectedPeriods[] = $p;
            }
        }
        sort($detectedPeriods);

        if (count($detectedPeriods) === 0) {
            throw new IngestValidationError('Sheet P&L ditemukan tetapi tidak ada periode dengan data omzet > 0.');
        }

        $detectedPeriodSet = array_flip($detectedPeriods);
        $rowsInScope = array_values(array_filter($classified, static fn ($c) => isset($detectedPeriodSet[$c['leaf']['period']])));
        $rowsProcessed = count($rowsInScope);
        $rowsUnmapped = count(array_filter($rowsInScope, static fn ($c) => $c['category'] === 'UNMAPPED'));
        $rowsMapped = $rowsProcessed - $rowsUnmapped;
        $dataQualityPct = $rowsProcessed > 0 ? round(($rowsMapped / $rowsProcessed) * 1000) / 10 : 0.0;

        $sheetsUsedCount = count(array_filter($scan['detectionLog'], static fn ($d) => $d['selected']));
        $sheetsTotal = count($scan['detectionLog']);
        $sheetsIgnored = $sheetsTotal - $sheetsUsedCount;

        $detectedFields = array_values(array_unique(array_map(static fn ($c) => $c['normalized'], $rowsInScope)));
        $unmappedNames = array_values(array_unique(array_map(
            static fn ($c) => $c['leaf']['accountName'],
            array_filter($rowsInScope, static fn ($c) => $c['category'] === 'UNMAPPED')
        )));

        $debugLog = [
            'sheetDetection' => $scan['detectionLog'],
            'headerRow' => $parsed['headerRow'],
            'detectedFields' => $detectedFields,
            'rowsScanned' => $parsed['rowsScanned'],
            'rowsSkippedEmpty' => $parsed['rowsSkippedEmpty'],
            'mappingSuccess' => $rowsMapped,
            'mappingFailed' => $rowsUnmapped,
            'unmappedAccountNames' => $unmappedNames,
            'detectedPeriods' => $detectedPeriods,
        ];

        $replacedPeriods = [];

        $pdo->beginTransaction();
        try {
            $deleteStmt = $pdo->prepare('DELETE FROM transactions WHERE outlet_id = ? AND period = ?');
            $countStmt = $pdo->prepare('SELECT COUNT(*) as c FROM transactions WHERE outlet_id = ? AND period = ?');
            foreach ($detectedPeriods as $p) {
                $countStmt->execute([$outletId, $p]);
                $c = (int) $countStmt->fetch()['c'];
                if ($c > 0) {
                    $replacedPeriods[] = $p;
                }
                $deleteStmt->execute([$outletId, $p]);
            }

            $insertUpload = $pdo->prepare(
                "INSERT INTO uploads (outlet_id, filename, file_hash, status, detected_periods, sheets_total, sheets_used, sheets_ignored, rows_processed, rows_mapped, rows_unmapped, data_quality_pct, debug_log)
                 VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $insertUpload->execute([
                $outletId, $filename, $fileHash, json_encode($detectedPeriods),
                $sheetsTotal, $sheetsUsedCount, $sheetsIgnored,
                $rowsProcessed, $rowsMapped, $rowsUnmapped, $dataQualityPct,
                json_encode($debugLog),
            ]);
            $uploadId = (int) $pdo->lastInsertId();

            $insertTx = $pdo->prepare(
                'INSERT INTO transactions (upload_id, outlet_id, period, year, month, source_file, source_sheet, source_row, account_code, account_name, description, category, subcategory, analysis_group, mapping_id, debit, credit, amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, 0, 0, ?)'
            );
            foreach ($rowsInScope as $c) {
                $leaf = $c['leaf'];
                $insertTx->execute([
                    $uploadId, $outletId, $leaf['period'], $leaf['year'], $leaf['month'],
                    $filename, $leaf['sourceSheet'], $leaf['sourceRow'],
                    $leaf['accountName'], $c['category'], $c['subcategory'], $c['analysisGroup'], $c['mappingId'],
                    $leaf['amount'],
                ]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        // Reconciliation checks against source-reported subtotals
        $reconciliation = [];
        $rollupsByKeyPeriod = [];
        foreach ($parsed['rollups'] as $r) {
            if (!isset($detectedPeriodSet[$r['period']])) {
                continue;
            }
            $rollupsByKeyPeriod[$r['key']][] = $r;
        }

        $insertCheck = $pdo->prepare(
            'INSERT INTO reconciliation_checks (upload_id, period, check_name, source_value, computed_value, variance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $pdo->beginTransaction();
        foreach (self::RECONCILE_KEYS as $key) {
            foreach ($rollupsByKeyPeriod[$key] ?? [] as $row) {
                $agg = $periodAgg[$row['period']] ?? null;
                if ($agg === null) {
                    continue;
                }
                $computed = self::computedFrom($key, $agg);
                $denom = abs($row['value']) > 1 ? abs($row['value']) : 1;
                $variancePct = (abs($computed - $row['value']) / $denom) * 100;
                $status = $variancePct <= 0.5 ? 'OK' : 'MISMATCH';
                $insertCheck->execute([$uploadId, $row['period'], $key, $row['value'], $computed, $variancePct, $status]);
                $reconciliation[] = [
                    'key' => $key,
                    'period' => $row['period'],
                    'sourceValue' => $row['value'],
                    'computedValue' => $computed,
                    'variancePct' => round($variancePct * 100) / 100,
                    'status' => $status,
                ];
            }
        }
        $pdo->commit();

        $mismatches = array_filter($reconciliation, static fn ($r) => $r['status'] === 'MISMATCH');
        $message = '';
        if (count($replacedPeriods) > 0) {
            $message .= 'Data periode ' . implode(', ', $replacedPeriods) . ' sebelumnya sudah ada dan telah digantikan (replace) dengan data terbaru dari file ini. ';
        }
        $message .= sprintf(
            'Berhasil memproses %d periode (%s s/d %s).',
            count($detectedPeriods),
            $detectedPeriods[0],
            $detectedPeriods[count($detectedPeriods) - 1]
        );
        $message .= count($mismatches) > 0
            ? sprintf(' Peringatan: %d pengecekan rekonsiliasi memiliki selisih di atas toleransi.', count($mismatches))
            : ' Seluruh pengecekan rekonsiliasi cocok dengan sumber.';

        return [
            'status' => 'completed',
            'uploadId' => $uploadId,
            'outletId' => $outletId,
            'outletName' => $outletName,
            'filename' => $filename,
            'detectedPeriods' => $detectedPeriods,
            'sheetsTotal' => $sheetsTotal,
            'sheetsUsed' => $sheetsUsedCount,
            'sheetsIgnored' => $sheetsIgnored,
            'rowsProcessed' => $rowsProcessed,
            'rowsMapped' => $rowsMapped,
            'rowsUnmapped' => $rowsUnmapped,
            'dataQualityPct' => $dataQualityPct,
            'reconciliation' => $reconciliation,
            'message' => $message,
        ];
    }
}
