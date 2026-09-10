<?php

require __DIR__ . '/bootstrap.php';

$pageTitle = 'Upload Laporan Keuangan';
$activeNav = 'upload';
require __DIR__ . '/partials/header.php';
?>

<div class="page-header">
  <div>
    <h1 class="page-title">Upload Laporan Keuangan</h1>
    <p class="page-subtitle">
      Upload satu atau beberapa file Excel laporan keuangan outlet sekaligus. Sistem otomatis mendeteksi sheet,
      mem-parsing, menormalisasi, melakukan mapping akun, dan menghitung P&amp;L bulanan untuk setiap file — tanpa proses manual.
    </p>
  </div>
</div>

<div id="dropzone" class="dropzone">
  <div class="icon">📄</div>
  <div class="main-text">Klik atau drag &amp; drop file Excel di sini (bisa pilih banyak file sekaligus)</div>
  <div class="sub-text">Format .xlsx, maksimum 25MB per file</div>
  <input id="file-input" type="file" accept=".xlsx" multiple hidden>
</div>

<div style="margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
  <button id="btn-process" class="btn btn-primary" disabled>Process All</button>
  <button id="btn-clear" class="btn btn-secondary" style="display:none;">Clear List</button>
  <span id="queue-summary" class="section-subtitle" style="margin:0;"></span>
</div>

<div id="file-list" class="file-list"></div>

<script src="assets/js/format.js"></script>
<script src="assets/js/upload.js"></script>

<?php require __DIR__ . '/partials/footer.php'; ?>
