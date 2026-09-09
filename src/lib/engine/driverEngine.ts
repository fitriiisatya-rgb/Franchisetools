import type { MoMComparison } from './comparisonEngine';
import { getSubcategoryBreakdown } from './pnlEngine';

export interface BridgeStep {
  key: string;
  label: string;
  value: number; // signed contribution to profit change
  runningTotal: number;
}

export interface ProfitBridge {
  previousProfit: number;
  currentProfit: number;
  steps: BridgeStep[];
}

/**
 * Operating profit = Revenue - Promo - COGS - OnlineCost - OPEX (an exact
 * linear identity given how the P&L engine derives each figure), so the
 * waterfall from previous to current profit is an exact decomposition with
 * no residual/plug term — each step's value is precisely that driver's
 * period-over-period change (cost increases render as negative steps).
 */
export function buildProfitBridge(cmp: MoMComparison): ProfitBridge {
  const steps: { key: string; label: string; value: number }[] = [
    { key: 'REVENUE', label: 'Dampak Perubahan Omzet', value: cmp.revenue.abs },
    { key: 'COGS', label: 'Dampak HPP', value: -cmp.cogs.abs },
    { key: 'PROMO', label: 'Dampak Promo', value: -cmp.promo.abs },
    { key: 'ONLINE_COST', label: 'Dampak Komisi Online', value: -cmp.onlineCost.abs },
    { key: 'OPEX', label: 'Dampak OPEX', value: -cmp.opex.abs },
  ];
  let running = cmp.previous.operatingProfit;
  const result: BridgeStep[] = [];
  for (const s of steps) {
    running += s.value;
    result.push({ ...s, runningTotal: running });
  }
  return { previousProfit: cmp.previous.operatingProfit, currentProfit: cmp.current.operatingProfit, steps: result };
}

export interface DriverImpact {
  name: string;
  key: string;
  impact: number; // + supports profit, - reduces profit
  direction: 'supports' | 'reduces';
}

export function rankDrivers(cmp: MoMComparison): DriverImpact[] {
  const items: DriverImpact[] = [
    { name: 'Revenue', key: 'REVENUE', impact: cmp.revenue.abs, direction: cmp.revenue.abs >= 0 ? 'supports' : 'reduces' },
    { name: 'Promo', key: 'PROMO', impact: -cmp.promo.abs, direction: -cmp.promo.abs >= 0 ? 'supports' : 'reduces' },
    { name: 'Komisi Online', key: 'ONLINE_COST', impact: -cmp.onlineCost.abs, direction: -cmp.onlineCost.abs >= 0 ? 'supports' : 'reduces' },
    { name: 'HPP (COGS)', key: 'COGS', impact: -cmp.cogs.abs, direction: -cmp.cogs.abs >= 0 ? 'supports' : 'reduces' },
    { name: 'OPEX', key: 'OPEX', impact: -cmp.opex.abs, direction: -cmp.opex.abs >= 0 ? 'supports' : 'reduces' },
  ];
  return items.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  MANPOWER: 'Gaji & Tunjangan Karyawan',
  RENT: 'Sewa',
  MARKETING: 'Marketing & Iklan',
  UTILITIES: 'Listrik, Air & Internet',
  ADMINISTRATION: 'Administrasi',
  MAINTENANCE: 'Pemeliharaan',
  SUPPLIES: 'Perlengkapan (ATK/POS)',
  FRANCHISE_FEE: 'Royalti & Management Fee',
  TRANSPORT_DELIVERY: 'Transportasi & Delivery',
  OTHER_OPEX: 'Lain-lain',
  HPP_OFFLINE: 'HPP Offline',
  HPP_ONLINE: 'HPP Online',
  HPP_KONSINYASI: 'HPP Konsinyasi',
  HPP_RETURN_EXPIRED: 'Return/Expired',
  HPP_BAHAN_BAKU: 'Bahan Baku Langsung',
  HPP_PROMO: 'HPP Promo',
  OTHER_COGS: 'Lain-lain',
  COMMISSION: 'Komisi Platform',
  AFFILIATE: 'Affiliate',
  OTHER: 'Lain-lain',
};

export interface SubDriverContribution {
  subcategory: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
}

export function topSubcategoryContributors(
  outletId: number,
  currentPeriod: string,
  previousPeriod: string,
  analysisGroup: string,
  limit = 5
): SubDriverContribution[] {
  const cur = getSubcategoryBreakdown(outletId, currentPeriod, analysisGroup);
  const prev = getSubcategoryBreakdown(outletId, previousPeriod, analysisGroup);
  const keys = new Set([...cur.map((c) => c.subcategory), ...prev.map((p) => p.subcategory)]);
  const curMap = new Map(cur.map((c) => [c.subcategory, c.amount]));
  const prevMap = new Map(prev.map((p) => [p.subcategory, p.amount]));
  const rows: SubDriverContribution[] = [...keys].map((k) => {
    const c = curMap.get(k) ?? 0;
    const p = prevMap.get(k) ?? 0;
    return { subcategory: k, label: SUBCATEGORY_LABELS[k] ?? k, current: c, previous: p, delta: c - p };
  });
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  if (rows.length <= limit) return rows;
  const top = rows.slice(0, limit);
  const rest = rows.slice(limit);
  const otherDelta = rest.reduce((s, r) => s + r.delta, 0);
  const otherCur = rest.reduce((s, r) => s + r.current, 0);
  const otherPrev = rest.reduce((s, r) => s + r.previous, 0);
  top.push({ subcategory: 'OTHERS', label: 'Lainnya', current: otherCur, previous: otherPrev, delta: otherDelta });
  return top;
}
