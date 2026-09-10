<?php
/** @var string $pageTitle */
$pageTitle = $pageTitle ?? 'Profitability Analysis';
$activeNav = $activeNav ?? 'dashboard';
?><!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($pageTitle) ?> — Bakery Business</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">🍞</div>
      <div>
        <div class="sidebar-title">Bakery Business</div>
        <div class="sidebar-subtitle">Profitability Tools</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <a class="sidebar-link <?= $activeNav === 'dashboard' ? 'active' : '' ?>" href="index.php"><span class="icon">📈</span> Profitability Analysis</a>
      <a class="sidebar-link <?= $activeNav === 'upload' ? 'active' : '' ?>" href="upload.php"><span class="icon">⬆️</span> Upload Laporan</a>
      <a class="sidebar-link <?= $activeNav === 'data-quality' ? 'active' : '' ?>" href="data-quality.php"><span class="icon">✅</span> Data Quality</a>
    </nav>
  </aside>
  <main class="main">
    <div class="container">
