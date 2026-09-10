/* Shared formatting helpers — mirrors src/lib/format.ts from the Next.js version. */

function formatRupiah(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(2)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(0)}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs.toFixed(0)}`;
}

function formatRupiahFull(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function formatPct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function formatPt(n, digits = 1) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)} pt`;
}

const MONTH_LABELS = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

function formatPeriodLabel(period) {
  const [year, month] = period.split('-');
  return `${MONTH_LABELS[month] || month} ${year}`;
}

function formatPeriodShort(period) {
  const [year, month] = period.split('-');
  return `${(MONTH_LABELS[month] || month).slice(0, 3)} ${year.slice(2)}`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}
