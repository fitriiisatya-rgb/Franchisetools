export function detectOutletName(filename: string): string {
  let base = filename.replace(/\.(xlsx|xls|csv)$/i, '');
  base = base.replace(/^\s*\d+[.)]\s*/, ''); // leading "08. "
  base = base.replace(/\(\d+\)\s*$/, '').trim(); // trailing "(1)"
  // trailing period-range like "Jan-Agustus'26", "Januari - Agustus 2026"
  base = base
    .replace(/\s+[A-Za-z]+\s*[-–]\s*[A-Za-z]+\s*'?\d{2,4}\s*$/i, '')
    .trim();
  base = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base || 'Unknown Outlet';
}

export function slugifyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 200);
}
