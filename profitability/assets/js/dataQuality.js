(function () {
  'use strict';

  const GROUPS = ['REVENUE', 'SALES_DEDUCTION', 'PROMO', 'COGS', 'ONLINE_COST', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE'];

  const historyEl = document.getElementById('upload-history');
  const unmappedEl = document.getElementById('unmapped-list');
  const saveMsgEl = document.getElementById('mapping-save-msg');

  let expandedUploadId = null;
  let editingAccount = null;

  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    try {
      const data = await fetchJSON('api/data_quality.php');
      renderHistory(data.uploads);
      renderUnmapped(data.unmappedAccounts);
    } catch (e) {
      historyEl.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
    }
  }

  function renderHistory(uploads) {
    if (!uploads.length) {
      historyEl.innerHTML = '<div class="empty-state">Belum ada upload.</div>';
      return;
    }
    historyEl.innerHTML = uploads.map((u) => {
      const periods = JSON.parse(u.detected_periods || '[]');
      const expanded = expandedUploadId === u.id;
      const qClass = u.data_quality_pct >= 95 ? 'good' : u.data_quality_pct >= 80 ? 'ok' : 'bad';
      const selectedSheet = (u.debug_log.sheetDetection || []).filter((s) => s.selected).map((s) => `${s.sheetName} — ${s.reason}`).join('; ') || '-';
      return `
      <div class="card upload-history-item">
        <div class="uh-top">
          <div>
            <div class="file-name" style="white-space:normal;">${escapeHtml(u.filename)}</div>
            <div class="file-meta">${escapeHtml(u.outlet_name)} · ${periods.length ? formatPeriodLabel(periods[0]) + ' – ' + formatPeriodLabel(periods[periods.length - 1]) : '-'} · ${new Date(u.uploaded_at.replace(' ', 'T')).toLocaleString('id-ID')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="badge-quality ${qClass}">Data Quality ${u.data_quality_pct}%</span>
            <button class="link-btn" data-toggle="${u.id}">${expanded ? 'Sembunyikan detail' : 'Lihat detail'}</button>
          </div>
        </div>
        ${expanded ? `
        <div class="uh-detail">
          ${stat('Sheet Total', u.sheets_total)}
          ${stat('Sheet Digunakan', u.sheets_used)}
          ${stat('Sheet Diabaikan', u.sheets_ignored)}
          ${stat('Header Row', (u.debug_log.headerRow ?? 0) + 1)}
          ${stat('Baris Diproses', u.rows_processed)}
          ${stat('Baris Mapped', u.rows_mapped)}
          ${stat('Baris Unmapped', u.rows_unmapped)}
          ${stat('Baris Kosong Dilewati', u.debug_log.rowsSkippedEmpty ?? 0)}
          <div style="grid-column:1/-1;">
            <div style="color:#9ca3af;margin-bottom:2px;">Sheet terpilih sebagai sumber P&amp;L:</div>
            <div>${escapeHtml(selectedSheet)}</div>
          </div>
        </div>` : ''}
      </div>`;
    }).join('');

    historyEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.toggle, 10);
        expandedUploadId = expandedUploadId === id ? null : id;
        fetchJSON('api/data_quality.php').then((data) => renderHistory(data.uploads));
      });
    });
  }

  function stat(label, value) {
    return `<div><div style="color:#9ca3af;">${escapeHtml(label)}</div><div style="font-weight:500;">${escapeHtml(String(value))}</div></div>`;
  }

  function renderUnmapped(accounts) {
    if (!accounts.length) {
      unmappedEl.innerHTML = '<div class="card" style="color:#059669;background:#ecfdf5;border-color:#a7f3d0;">Tidak ada akun unmapped. 🎉</div>';
      return;
    }
    unmappedEl.innerHTML = accounts.map((a) => {
      const key = a.account_name + '|' + a.source_sheet;
      const editing = editingAccount === key;
      return `
      <div class="card" style="padding:12px;">
        <div class="uh-top">
          <div>
            <div class="file-name" style="white-space:normal;">${escapeHtml(a.account_name)}</div>
            <div class="file-meta">Sheet: ${escapeHtml(a.source_sheet)} · ${a.occurrences}x · Total ${formatRupiahFull(a.total_amount)} · Terakhir ${formatPeriodLabel(a.latest_period)}</div>
          </div>
          <button class="link-btn" data-edit="${escapeHtml(key)}">${editing ? 'Batal' : '+ Tambah Mapping'}</button>
        </div>
        ${editing ? `
        <div class="mapping-form">
          <input type="text" data-field="normalizedAccount" placeholder="Normalized account (opsional)">
          <select data-field="pnlGroup">${GROUPS.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>
          <input type="text" data-field="subcategory" placeholder="Subcategory (opsional)">
          <button class="btn btn-primary" data-save="${escapeHtml(a.account_name)}" style="padding:6px 12px;font-size:12px;">Simpan Mapping</button>
        </div>` : ''}
      </div>`;
    }).join('');

    unmappedEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingAccount = editingAccount === btn.dataset.edit ? null : btn.dataset.edit;
        load();
      });
    });
    unmappedEl.querySelectorAll('[data-save]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.card');
        const accountName = btn.dataset.save;
        const normalizedAccount = row.querySelector('[data-field="normalizedAccount"]').value.trim();
        const pnlGroup = row.querySelector('[data-field="pnlGroup"]').value;
        const subcategory = row.querySelector('[data-field="subcategory"]').value.trim();
        try {
          const data = await fetchJSON('api/mapping.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountPattern: '%' + accountName.toLowerCase() + '%',
              normalizedAccount: normalizedAccount || accountName.toUpperCase().replace(/\s+/g, '_').slice(0, 60),
              pnlGroup,
              analysisGroup: pnlGroup,
              subcategory: subcategory || null,
              mappingPriority: 5,
            }),
          });
          saveMsgEl.innerHTML = `<div class="card" style="color:#047857;background:#ecfdf5;border-color:#a7f3d0;padding:10px 14px;margin-bottom:12px;font-size:12px;">Mapping disimpan. ${data.reclassified} transaksi unmapped berhasil diklasifikasi ulang.</div>`;
          editingAccount = null;
          load();
        } catch (e) {
          saveMsgEl.innerHTML = `<div class="card" style="color:#dc2626;background:#fef2f2;border-color:#fecaca;padding:10px 14px;margin-bottom:12px;font-size:12px;">${escapeHtml(e.message)}</div>`;
        }
      });
    });
  }

  load();
})();
