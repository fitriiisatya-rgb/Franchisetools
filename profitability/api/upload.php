<?php

require __DIR__ . '/../bootstrap.php';

use App\Http;
use App\Ingest;
use App\IngestValidationError;

Http::requireMethod('POST');

if (!isset($_FILES['file'])) {
    Http::errorResponse('File tidak ditemukan pada request.', 400);
}

$file = $_FILES['file'];

$uploadErrors = [
    UPLOAD_ERR_INI_SIZE => 'File melebihi batas upload_max_filesize pada konfigurasi server (php.ini).',
    UPLOAD_ERR_FORM_SIZE => 'File melebihi batas ukuran yang diizinkan formulir.',
    UPLOAD_ERR_PARTIAL => 'File hanya terupload sebagian. Coba upload ulang.',
    UPLOAD_ERR_NO_FILE => 'Tidak ada file yang diupload.',
    UPLOAD_ERR_NO_TMP_DIR => 'Server tidak memiliki folder sementara untuk upload.',
    UPLOAD_ERR_CANT_WRITE => 'Server gagal menulis file ke disk.',
    UPLOAD_ERR_EXTENSION => 'Upload dihentikan oleh ekstensi PHP pada server.',
];

if ($file['error'] !== UPLOAD_ERR_OK) {
    Http::errorResponse($uploadErrors[$file['error']] ?? 'Upload gagal (kode error ' . $file['error'] . ').', 422);
}

if (!is_uploaded_file($file['tmp_name'])) {
    Http::errorResponse('Upload tidak valid.', 400);
}

$outletName = isset($_POST['outletName']) ? trim((string) $_POST['outletName']) : '';
$outletCode = isset($_POST['outletCode']) ? trim((string) $_POST['outletCode']) : '';

try {
    $result = Ingest::ingestWorkbook(
        $file['tmp_name'],
        $file['name'],
        ['name' => $outletName ?: null, 'code' => $outletCode ?: null],
        (int) $file['size']
    );
    Http::jsonResponse($result);
} catch (IngestValidationError $e) {
    Http::errorResponse($e->getMessage(), 422);
} catch (\Throwable $e) {
    error_log('Upload processing failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    Http::errorResponse('Terjadi kesalahan internal saat memproses file.', 500);
}
