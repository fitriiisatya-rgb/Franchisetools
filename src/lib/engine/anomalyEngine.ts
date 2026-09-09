import type { MoMComparison } from './comparisonEngine';

export interface AnomalyFlag {
  level: 'high' | 'medium';
  message: string;
}

export interface AnomalyThresholds {
  costGrowthPct: number; // e.g. 20
  marginDropPt: number; // e.g. 2
  promoRatioIncreasePt: number; // e.g. 2
  onlineCostRatioIncreasePt: number; // e.g. 2
}

export const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  costGrowthPct: 20,
  marginDropPt: 2,
  promoRatioIncreasePt: 2,
  onlineCostRatioIncreasePt: 2,
};

export function detectAnomalies(cmp: MoMComparison, thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  if ((cmp.revenue.pct ?? 0) > 0.05 && cmp.operatingProfit.abs < 0) {
    flags.push({ level: 'high', message: 'Omzet naik tetapi profit turun — pertumbuhan penjualan belum terkonversi menjadi laba.' });
  }

  const costChecks: { name: string; pct: number | null }[] = [
    { name: 'COGS', pct: cmp.cogs.pct },
    { name: 'Promo', pct: cmp.promo.pct },
    { name: 'Komisi Online', pct: cmp.onlineCost.pct },
    { name: 'OPEX', pct: cmp.opex.pct },
  ];
  for (const c of costChecks) {
    if (c.pct !== null && c.pct > thresholds.costGrowthPct) {
      flags.push({ level: 'medium', message: `${c.name} naik ${c.pct.toFixed(1)}% MoM (di atas ambang batas ${thresholds.costGrowthPct}%).` });
    }
  }

  if (cmp.operatingMarginPt < -thresholds.marginDropPt) {
    flags.push({ level: 'high', message: `Operating margin turun ${Math.abs(cmp.operatingMarginPt).toFixed(1)} pt (di atas ambang batas ${thresholds.marginDropPt} pt).` });
  }

  if (cmp.promoRatioPt > thresholds.promoRatioIncreasePt) {
    flags.push({ level: 'medium', message: `Rasio promo terhadap omzet naik ${cmp.promoRatioPt.toFixed(1)} pt — efektivitas promo perlu dievaluasi.` });
  }

  if (cmp.onlineCostRatioPt > thresholds.onlineCostRatioIncreasePt) {
    flags.push({ level: 'medium', message: `Rasio biaya online terhadap omzet naik ${cmp.onlineCostRatioPt.toFixed(1)} pt — biaya komisi online tumbuh lebih cepat dari omzet.` });
  }

  return flags;
}
