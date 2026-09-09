export function formatRupiah(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(2)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(0)}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs.toFixed(0)}`;
}

export function formatRupiahFull(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function formatPct(n: number | null, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function formatPt(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)} pt`;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  return `${MONTH_LABELS[month] ?? month} ${year}`;
}

export function formatPeriodShort(period: string): string {
  const [year, month] = period.split('-');
  return `${(MONTH_LABELS[month] ?? month).slice(0, 3)} ${year.slice(2)}`;
}
