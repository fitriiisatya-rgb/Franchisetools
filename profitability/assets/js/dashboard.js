/* Profitability Analysis dashboard — vanilla JS + Chart.js, mirrors the
 * validated Next.js /profitability page (src/app/profitability/page.tsx)
 * and its components. Two views in one file: outlet summary landing
 * (no ?outlet= param) and the detail dashboard (?outlet=ID). */

(function () {
  'use strict';

  const app = document.getElementById('app');
  const outletIdAttr = app.dataset.outletId;
  const outletId = outletIdAttr ? parseInt(outletIdAttr, 10) : null;

  async function fetchJSON(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  if (!outletId) {
    renderOutletSummary();
  } else {
    renderDetailView(outletId);
  }

  // ---------------------------------------------------------------------
  // OUTLET SUMMARY LANDING VIEW
  // ---------------------------------------------------------------------
  async function renderOutletSummary() {
    app.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Profitability Analysis</h1>
          <p class="page-subtitle">Pilih outlet untuk melihat analisa profitabilitas bulanan.</p>
        </div>
      </div>
      <div id="outlet-grid" class="grid grid-4"><div class="empty-state">Memuat outlet...</div></div>
    `;

    try {
      const { outlets } = await fetchJSON('api/outlets.php');
      const grid = document.getElementById('outlet-grid');
      if (!outlets.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
          Belum ada data. Silakan <a href="upload.php" style="color:#059669;text-decoration:underline;">upload laporan keuangan</a> terlebih dahulu.
        </div>`;
        return;
      }
      grid.innerHTML = outlets.map((o) => {
        const q = o.latest_quality_pct;
        const qClass = q === null ? '' : q >= 95 ? 'good' : q >= 80 ? 'ok' : 'bad';
        return `
        <a class="card outlet-card" href="index.php?outlet=${o.id}" style="text-decoration:none;color:inherit;">
          <div class="name">${escapeHtml(o.name)}</div>
          <div class="meta">${o.periods_count} periode terdeteksi${o.latest_period ? ' · s/d ' + escapeHtml(formatPeriodLabel(o.latest_period)) : ''}</div>
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
            <span class="meta">${o.tx_count} baris data</span>
            ${q !== null ? `<span class="badge-quality ${qClass}">Quality ${q}%</span>` : ''}
          </div>
        </a>`;
      }).join('');
    } catch (e) {
      document.getElementById('outlet-grid').innerHTML = `<div class="empty-state">Gagal memuat outlet: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ---------------------------------------------------------------------
  // DETAIL DASHBOARD VIEW
  // ---------------------------------------------------------------------
  let state = { outlets: [], periods: [], period: '', comparePeriod: '', outletId: outletId };
  let trendChart = null;
  let bridgeChart = null;

  async function renderDetailView(id) {
    app.innerHTML = `
      <div class="page-header">
        <div>
          <div style="margin-bottom:8px;"><a href="index.php" style="font-size:12px;color:#6b7280;text-decoration:none;">&larr; Semua Outlet</a></div>
          <h1 class="page-title">Profitability Analysis</h1>
          <p class="page-subtitle">Analisa kinerja keuangan untuk memahami pertumbuhan omzet, profit, dan faktor penyebabnya.</p>
        </div>
        <div class="filters">
          <label class="filter-label">Outlet <select id="f-outlet"></select></label>
          <label class="filter-label">Periode <select id="f-period"></select></label>
          <label class="filter-label">Bandingkan dengan <select id="f-compare"></select></label>
        </div>
      </div>
      <div id="dash-body"><div class="empty-state">Memuat data...</div></div>
    `;

    try {
      const { outlets } = await fetchJSON('api/outlets.php');
      state.outlets = outlets;
      const outletSel = document.getElementById('f-outlet');
      outletSel.innerHTML = outlets.map((o) => `<option value="${o.id}" ${o.id === id ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
      outletSel.addEventListener('change', () => {
        window.location.href = 'index.php?outlet=' + outletSel.value;
      });

      const { periods } = await fetchJSON('api/periods.php?outletId=' + id);
      state.periods = periods;
      if (periods.length === 0) {
        document.getElementById('dash-body').innerHTML = '<div class="empty-state">Belum ada data untuk outlet ini.</div>';
        return;
      }
      state.period = periods[periods.length - 1];
      state.comparePeriod = periods.length >= 2 ? periods[periods.length - 2] : periods[0];

      renderPeriodSelectors();
      await loadAndRenderAnalysis();
    } catch (e) {
      document.getElementById('dash-body').innerHTML = `<div class="empty-state">Gagal memuat data: ${escapeHtml(e.message)}</div>`;
    }
  }

  function renderPeriodSelectors() {
    const periodSel = document.getElementById('f-period');
    const compareSel = document.getElementById('f-compare');
    periodSel.innerHTML = state.periods.map((p) => `<option value="${p}" ${p === state.period ? 'selected' : ''}>${formatPeriodLabel(p)}</option>`).join('');
    compareSel.innerHTML = state.periods
      .filter((p) => p !== state.period)
      .map((p) => `<option value="${p}" ${p === state.comparePeriod ? 'selected' : ''}>${formatPeriodLabel(p)}</option>`)
      .join('');

    periodSel.onchange = () => {
      state.period = periodSel.value;
      if (state.comparePeriod === state.period) {
        const others = state.periods.filter((p) => p !== state.period);
        state.comparePeriod = others[others.length - 1] || others[0];
      }
      renderPeriodSelectors();
      loadAndRenderAnalysis();
    };
    compareSel.onchange = () => {
      state.comparePeriod = compareSel.value;
      loadAndRenderAnalysis();
    };
  }

  async function loadAndRenderAnalysis() {
    const body = document.getElementById('dash-body');
    try {
      const analysis = await fetchJSON(`api/analysis.php?outletId=${state.outletId}&period=${state.period}&comparePeriod=${state.comparePeriod}`);
      renderAnalysis(analysis);
    } catch (e) {
      body.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
    }
  }

  function renderAnalysis(a) {
    const body = document.getElementById('dash-body');
    body.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:24px;">
        ${kpiCard('📊', '#dbeafe', 'Omzet', formatRupiahFull(a.current.revenue), a.comparison.revenue.pct)}
        ${kpiCard('💰', '#d1fae5', 'Gross Profit', formatRupiahFull(a.current.grossProfit), a.comparison.grossProfit.pct)}
        ${kpiCard('📈', '#fee2e2', 'Operating Profit', formatRupiahFull(a.current.operatingProfit), a.comparison.operatingProfit.pct)}
        ${kpiCard('%', '#fee2e2', 'Profit Margin', a.current.operatingMarginPct.toFixed(1) + '%', null, a.comparison.operatingMarginPt)}
      </div>

      <div class="card status-${a.classification.severity}" style="margin-bottom:24px;">
        <div class="status-card">
          <div class="icon">${severityIcon(a.classification.severity)}</div>
          <div>
            <div class="status-title">${escapeHtml(a.classification.title)}</div>
            <div class="status-desc">${escapeHtml(a.classification.description)}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="section-title">Sales vs Profit Trend</div>
          <div class="section-subtitle">Perkembangan omzet dan profit bulanan (Rp jt)</div>
          <div class="chart-box"><canvas id="trend-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="section-title">Profit Bridge</div>
          <div class="section-subtitle">Faktor yang mempengaruhi perubahan profit dari ${formatPeriodLabel(state.comparePeriod)} ke ${formatPeriodLabel(state.period)}</div>
          <div class="chart-box"><canvas id="bridge-chart"></canvas></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:24px; align-items:start;">
        <div class="card">
          <div class="section-title">Faktor Penyebab Perubahan Profit</div>
          <div class="section-subtitle">Ranking berdasarkan impact terbesar terhadap profit</div>
          ${renderDrivers(a.drivers)}
        </div>
        <div class="card">
          <div class="section-title">Perbandingan ${formatPeriodLabel(state.comparePeriod)} vs ${formatPeriodLabel(state.period)}</div>
          ${renderComparisonTable(a.comparison)}
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="section-title">Analisa Bulanan</div>
        <ul class="narrative-list">
          ${a.narrative.map((n) => `<li><span>${toneIcon(n.tone)}</span><span>${escapeHtml(n.text)}</span></li>`).join('')}
        </ul>
      </div>

      ${a.anomalies.length ? `
      <div class="card">
        <div class="section-title">Anomaly Flags</div>
        <ul class="narrative-list">
          ${a.anomalies.map((f) => `<li style="color:${f.level === 'high' ? '#dc2626' : '#ea580c'}"><span>${f.level === 'high' ? '🔴' : '🟠'}</span><span>${escapeHtml(f.message)}</span></li>`).join('')}
        </ul>
      </div>` : ''}
    `;

    buildTrendChart(a.trend);
    buildBridgeChart(a.bridge, state.period, state.comparePeriod);
  }

  function kpiCard(icon, bg, label, value, changePct, changePt) {
    let changeHtml = '';
    if (changePct !== undefined && changePct !== null) {
      const positive = changePct >= 0;
      changeHtml = `<div class="kpi-change ${positive ? 'pos' : 'neg'}">${positive ? '▲' : '▼'} ${formatPct(changePct)} vs periode lalu</div>`;
    } else if (changePt !== undefined && changePt !== null) {
      const positive = changePt >= 0;
      changeHtml = `<div class="kpi-change ${positive ? 'pos' : 'neg'}">${positive ? '▲' : '▼'} ${formatPt(changePt)} vs periode lalu</div>`;
    }
    return `
      <div class="card">
        <div class="kpi-top">
          <div class="kpi-icon" style="background:${bg}">${icon}</div>
          <div class="kpi-label">${escapeHtml(label)}</div>
        </div>
        <div class="kpi-value">${value}</div>
        ${changeHtml}
      </div>`;
  }

  function severityIcon(sev) {
    return { positive: '✅', warning: '⚠️', negative: '⚠️', info: 'ℹ️' }[sev] || 'ℹ️';
  }
  function toneIcon(tone) {
    return { positive: '✅', negative: '🔴', neutral: '⚪', info: '🔵' }[tone] || '⚪';
  }

  function renderDrivers(drivers) {
    const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.impact)), 1);
    return drivers.map((d) => {
      const positive = d.impact >= 0;
      const widthPct = Math.max((Math.abs(d.impact) / maxAbs) * 100, 4);
      return `
        <div class="driver-row">
          <div class="driver-name">${escapeHtml(d.name)}</div>
          <div class="driver-bar-track"><div class="driver-bar-fill ${positive ? 'pos' : 'neg'}" style="width:${widthPct}%"></div></div>
          <div class="driver-value ${positive ? 'pos' : 'neg'}">${positive ? '+' : '-'}${formatRupiah(Math.abs(d.impact))}</div>
          <div class="driver-hint ${positive ? 'pos' : 'neg'}">${positive ? 'Mendukung pertumbuhan' : 'Menekan profit'}</div>
        </div>`;
    }).join('');
  }

  function renderComparisonTable(cmp) {
    const rows = [
      ['Omzet', cmp.previous.revenue, cmp.current.revenue, cmp.revenue.abs, cmp.revenue.pct, false],
      ['Gross Profit', cmp.previous.grossProfit, cmp.current.grossProfit, cmp.grossProfit.abs, cmp.grossProfit.pct, false],
      ['GP Margin', cmp.previous.grossMarginPct, cmp.current.grossMarginPct, cmp.grossMarginPt, null, true],
      ['Promo', cmp.previous.promo, cmp.current.promo, cmp.promo.abs, cmp.promo.pct, false],
      ['Online Cost', cmp.previous.onlineCost, cmp.current.onlineCost, cmp.onlineCost.abs, cmp.onlineCost.pct, false],
      ['OPEX', cmp.previous.opex, cmp.current.opex, cmp.opex.abs, cmp.opex.pct, false],
      ['Operating Profit', cmp.previous.operatingProfit, cmp.current.operatingProfit, cmp.operatingProfit.abs, cmp.operatingProfit.pct, false],
      ['Profit Margin', cmp.previous.operatingMarginPct, cmp.current.operatingMarginPct, cmp.operatingMarginPt, null, true],
    ];
    const body = rows.map(([label, prev, cur, changeAbs, changePct, isPct]) => {
      const positive = changeAbs >= 0;
      return `<tr>
        <td>${escapeHtml(label)}</td>
        <td class="text-right tabular">${isPct ? prev.toFixed(1) + '%' : formatRupiahFull(prev)}</td>
        <td class="text-right tabular" style="font-weight:500;">${isPct ? cur.toFixed(1) + '%' : formatRupiahFull(cur)}</td>
        <td class="text-right tabular" style="font-weight:500;color:${positive ? '#16a34a' : '#dc2626'}">${isPct ? formatPt(changeAbs) : formatPct(changePct)}</td>
      </tr>`;
    }).join('');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Indikator</th><th class="text-right">${formatPeriodLabel(state.comparePeriod)}</th><th class="text-right">${formatPeriodLabel(state.period)}</th><th class="text-right">Perubahan</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function buildTrendChart(trend) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    const labels = trend.map((t) => formatPeriodShort(t.period));
    const revenue = trend.map((t) => Math.round(t.revenue / 1_000_000));
    const profit = trend.map((t) => Math.round(t.operatingProfit / 1_000_000));
    trendChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Omzet (Rp jt)', data: revenue, backgroundColor: '#93c5fd', borderRadius: 4, yAxisID: 'y', order: 1 },
          { type: 'line', label: 'Profit (Rp jt)', data: profit, borderColor: '#16a34a', backgroundColor: '#16a34a', tension: 0.3, yAxisID: 'y1', order: 0, pointRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          y: { position: 'left', ticks: { font: { size: 11 } } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  function buildBridgeChart(bridge, currentPeriod, previousPeriod) {
    const ctx = document.getElementById('bridge-chart');
    if (!ctx) return;
    if (bridgeChart) bridgeChart.destroy();

    const labels = [`Profit ${formatPeriodLabel(previousPeriod)}`];
    const ranges = [[0, bridge.previousProfit]];
    const colors = ['#334155'];

    let running = bridge.previousProfit;
    for (const step of bridge.steps) {
      const before = running;
      running += step.value;
      labels.push(step.label.replace('Dampak ', ''));
      ranges.push([Math.min(before, running), Math.max(before, running)]);
      colors.push(step.value >= 0 ? '#16a34a' : '#dc2626');
    }
    labels.push(`Profit ${formatPeriodLabel(currentPeriod)}`);
    ranges.push([0, bridge.currentProfit]);
    colors.push('#334155');

    bridgeChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: ranges, backgroundColor: colors, borderRadius: 3 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const [lo, hi] = item.raw;
                return formatRupiahFull(Math.round(hi - lo));
              },
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 40, minRotation: 20 } },
          y: { ticks: { font: { size: 11 }, callback: (v) => Math.round(v / 1_000_000) + 'jt' } },
        },
      },
    });
  }
})();
