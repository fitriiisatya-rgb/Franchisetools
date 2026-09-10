<?php

require __DIR__ . '/bootstrap.php';

$pageTitle = 'Profitability Analysis';
$activeNav = 'dashboard';
require __DIR__ . '/partials/header.php';
?>

<div id="app" data-outlet-id="<?= isset($_GET['outlet']) ? (int) $_GET['outlet'] : '' ?>">
  <div class="empty-state">Memuat data...</div>
</div>

<script src="assets/js/vendor/chart.umd.min.js"></script>
<script src="assets/js/format.js"></script>
<script src="assets/js/dashboard.js"></script>

<?php require __DIR__ . '/partials/footer.php'; ?>
