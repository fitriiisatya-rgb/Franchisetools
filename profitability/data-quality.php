<?php

require __DIR__ . '/bootstrap.php';

$pageTitle = 'Data Quality';
$activeNav = 'data-quality';
require __DIR__ . '/partials/header.php';
?>

<div class="page-header">
  <div>
    <h1 class="page-title">Data Quality</h1>
    <p class="page-subtitle">Status kualitas data hasil upload, log deteksi sheet, dan akun yang belum berhasil di-mapping.</p>
  </div>
</div>

<section style="margin-bottom:32px;">
  <div class="section-title">Riwayat Upload</div>
  <div id="upload-history" class="file-list"><div class="empty-state">Memuat...</div></div>
</section>

<section>
  <div class="section-title" style="margin-bottom:4px;">Unmapped Accounts</div>
  <p class="section-subtitle">
    Akun yang belum dikenali sistem. Tambahkan mapping sekali di sini — transaksi terkait (termasuk upload
    bulan berikutnya) akan otomatis terklasifikasi tanpa pekerjaan manual berulang.
  </p>
  <div id="mapping-save-msg"></div>
  <div id="unmapped-list" class="file-list"><div class="empty-state">Memuat...</div></div>
</section>

<script src="assets/js/format.js"></script>
<script src="assets/js/dataQuality.js"></script>

<?php require __DIR__ . '/partials/footer.php'; ?>
