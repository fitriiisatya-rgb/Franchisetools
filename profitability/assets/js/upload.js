/* Bulk multi-file upload — select 10+ Excel files at once, "Process All"
 * processes them sequentially (one HTTP request per file, so each request
 * stays within a normal max_execution_time even on shared hosting) with a
 * live per-file status badge: Pending -> Processing -> Success/Warning/Failed. */

(function () {
  'use strict';

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const fileListEl = document.getElementById('file-list');
  const btnProcess = document.getElementById('btn-process');
  const btnClear = document.getElementById('btn-clear');
  const queueSummary = document.getElementById('queue-summary');

  /** @type {Array<{id:number, file:File, status:string, result:?object, error:?string}>} */
  let queue = [];
  let nextId = 1;
  let processing = false;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  function addFiles(fileListObj) {
    for (const f of fileListObj) {
      queue.push({ id: nextId++, file: f, status: 'pending', result: null, error: null });
    }
    render();
  }

  btnProcess.addEventListener('click', processAll);
  btnClear.addEventListener('click', () => {
    queue = [];
    render();
  });

  async function processAll() {
    if (processing) return;
    processing = true;
    btnProcess.disabled = true;
    btnProcess.textContent = 'Processing...';

    for (const item of queue) {
      if (item.status === 'success' || item.status === 'warning') continue; // already processed
      item.status = 'processing';
      render();
      try {
        const fd = new FormData();
        fd.append('file', item.file);
        const res = await fetch('api/upload.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          item.status = 'failed';
          item.error = data.error || 'Upload gagal.';
        } else {
          item.result = data;
          const hasIssue = data.status === 'duplicate_skipped' || data.rowsUnmapped > 0 || (data.reconciliation || []).some((r) => r.status === 'MISMATCH');
          item.status = hasIssue ? 'warning' : 'success';
        }
      } catch (e) {
        item.status = 'failed';
        item.error = e.message || 'Terjadi kesalahan jaringan.';
      }
      render();
    }

    processing = false;
    btnProcess.disabled = false;
    btnProcess.textContent = 'Process All';
  }

  function badgeInfo(status) {
    return {
      pending: ['badge-pending', 'Pending'],
      processing: ['badge-processing', 'Processing'],
      success: ['badge-success', 'Success'],
      warning: ['badge-warning', 'Warning'],
      failed: ['badge-failed', 'Failed'],
    }[status];
  }

  function render() {
    btnProcess.disabled = queue.length === 0 || processing;
    btnClear.style.display = queue.length > 0 && !processing ? 'inline-flex' : 'none';

    if (queue.length === 0) {
      fileListEl.innerHTML = '';
      queueSummary.textContent = '';
      return;
    }

    const counts = queue.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
    queueSummary.textContent = `${queue.length} file dipilih — ${counts.success || 0} success, ${counts.warning || 0} warning, ${counts.failed || 0} failed, ${(counts.pending || 0) + (counts.processing || 0)} belum diproses`;

    fileListEl.innerHTML = queue.map(renderRow).join('');
  }

  function renderRow(item) {
    const [badgeClass, badgeText] = badgeInfo(item.status);
    let meta = '';
    if (item.status === 'failed' && item.error) {
      meta = `<div class="file-error">${escapeHtml(item.error)}</div>`;
    } else if (item.result && item.result.status === 'duplicate_skipped') {
      meta = `<div class="file-meta">${escapeHtml(item.result.message)}</div>`;
    } else if (item.result) {
      const r = item.result;
      const mappingPct = r.rowsProcessed > 0 ? ((r.rowsMapped / r.rowsProcessed) * 100).toFixed(1) : '0';
      const periodsRange = r.detectedPeriods.length
        ? `${formatPeriodLabel(r.detectedPeriods[0])} s/d ${formatPeriodLabel(r.detectedPeriods[r.detectedPeriods.length - 1])}`
        : '-';
      const mismatches = (r.reconciliation || []).filter((x) => x.status === 'MISMATCH').length;
      meta = `<div class="file-meta-grid">
        <div><div class="k">OUTLET</div><div class="v">${escapeHtml(r.outletName)}</div></div>
        <div><div class="k">PERIODE</div><div class="v">${escapeHtml(periodsRange)} (${r.detectedPeriods.length})</div></div>
        <div><div class="k">ROWS PROCESSED</div><div class="v">${r.rowsProcessed}</div></div>
        <div><div class="k">MAPPING</div><div class="v">${mappingPct}%${r.rowsUnmapped > 0 ? ` (${r.rowsUnmapped} unmapped)` : ''}</div></div>
        <div><div class="k">DATA QUALITY</div><div class="v">${r.dataQualityPct}%${mismatches > 0 ? ` · ${mismatches} recon. mismatch` : ''}</div></div>
      </div>`;
    }

    return `<div class="file-row">
      <div class="file-row-top">
        <div class="file-name">${escapeHtml(item.file.name)}</div>
        <span class="file-badge ${badgeClass}">${badgeText}</span>
      </div>
      ${meta}
    </div>`;
  }
})();
