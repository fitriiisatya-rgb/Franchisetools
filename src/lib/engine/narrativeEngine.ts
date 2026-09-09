import type { MoMComparison } from './comparisonEngine';
import type { Classification } from './classificationEngine';
import type { DriverImpact } from './driverEngine';

export interface NarrativePoint {
  tone: 'positive' | 'negative' | 'neutral' | 'info';
  text: string;
}

function fmtRp(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(2)}M`;
  return `${sign}Rp${Math.round(abs / 1_000_000)}jt`;
}

function fmtPct(n: number | null): string {
  if (n === null) return 'n/a';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function generateNarrative(
  cmp: MoMComparison,
  classification: Classification,
  drivers: DriverImpact[]
): NarrativePoint[] {
  const points: NarrativePoint[] = [];

  points.push({
    tone: cmp.revenue.abs >= 0 ? 'positive' : 'negative',
    text: `Omzet periode ini ${cmp.revenue.abs >= 0 ? 'tumbuh' : 'turun'} ${fmtPct(cmp.revenue.pct)} (${fmtRp(cmp.revenue.abs)}) dibanding periode sebelumnya.`,
  });

  points.push({
    tone: cmp.grossProfit.abs >= 0 ? 'positive' : 'negative',
    text: `Gross profit ${cmp.grossProfit.abs >= 0 ? 'ikut naik' : 'ikut turun'} ${fmtPct(cmp.grossProfit.pct)}, dengan gross margin ${cmp.grossMarginPt >= 0 ? 'membaik' : 'melemah'} ${Math.abs(cmp.grossMarginPt).toFixed(1)} pt.`,
  });

  const topDriver = drivers.find((d) => d.direction === 'reduces') ?? drivers[0];
  points.push({
    tone: classification.severity === 'negative' ? 'negative' : classification.severity === 'positive' ? 'positive' : 'info',
    text: `Operating profit ${cmp.operatingProfit.abs >= 0 ? 'naik' : 'turun'} ${fmtPct(cmp.operatingProfit.pct)} — status: ${classification.title}${topDriver ? `, faktor utama: ${topDriver.name} (${fmtRp(topDriver.impact)})` : ''}.`,
  });

  points.push({
    tone: cmp.operatingMarginPt >= 0 ? 'positive' : 'negative',
    text: `Operating profit margin ${cmp.operatingMarginPt >= 0 ? 'membaik' : 'menurun'} dari ${cmp.previous.operatingMarginPct.toFixed(1)}% menjadi ${cmp.current.operatingMarginPct.toFixed(1)}% (${cmp.operatingMarginPt >= 0 ? '+' : ''}${cmp.operatingMarginPt.toFixed(1)} pt).`,
  });

  const negativeDrivers = drivers.filter((d) => d.direction === 'reduces').slice(0, 2);
  if (negativeDrivers.length > 0) {
    points.push({
      tone: 'info',
      text: `Fokus evaluasi bulan ini: ${negativeDrivers.map((d) => d.name).join(' dan ')}.`,
    });
  }

  return points.slice(0, 5);
}
