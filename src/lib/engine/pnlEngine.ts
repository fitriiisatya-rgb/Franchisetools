import { db } from '@/lib/db';

export interface MonthlyPnl {
  period: string;
  revenue: number; // gross omzet = netRevenue + promo
  promo: number;
  netRevenue: number;
  cogs: number;
  onlineCost: number;
  opex: number;
  /**
   * Net Revenue - COGS. An intermediate margin, NOT the source workbook's own
   * "Laba Kotor" (Gross Profit) figure — the source nets online commission
   * into its HPP/COGS subtotal, so this pre-commission margin runs higher
   * than the source's reported Gross Profit. Kept as its own explicit field
   * so it's never mistaken for — or silently displayed as — "Gross Profit".
   */
  contributionMarginBeforeOnlineCost: number;
  /**
   * contributionMarginBeforeOnlineCost - onlineCost. This is the figure that
   * reconciles exactly to the source workbook's own "Laba Kotor Per Bulan"
   * (GROSS_PROFIT_SOURCE) — always use this field, never
   * contributionMarginBeforeOnlineCost, for anything labeled "Gross Profit".
   */
  grossProfit: number;
  operatingProfit: number; // grossProfit - opex (reconciles exactly to source "Profit Ebitda Per Bulan")
  contributionMarginBeforeOnlineCostPct: number; // contributionMarginBeforeOnlineCost / revenue
  grossMarginPct: number; // grossProfit / revenue — matches the source's own Gross Profit margin
  operatingMarginPct: number;
  promoRatioPct: number;
  onlineCostRatioPct: number;
  cogsRatioPct: number;
  opexRatioPct: number;
  unmappedAmount: number;
}

interface AggRow {
  period: string;
  analysis_group: string;
  total: number;
}

function emptyAgg() {
  return { REVENUE: 0, PROMO: 0, COGS: 0, ONLINE_COST: 0, OPEX: 0, UNMAPPED: 0 } as Record<string, number>;
}

function toMonthlyPnl(period: string, agg: Record<string, number>): MonthlyPnl {
  const netRevenue = agg.REVENUE;
  const promo = agg.PROMO;
  const revenue = netRevenue + promo;
  const cogs = agg.COGS;
  const onlineCost = agg.ONLINE_COST;
  const opex = agg.OPEX;
  // Source accounting flow (verified against the pilot workbook's own
  // subtotals with 0% variance): Net Revenue - COGS = contribution margin
  // before online cost; that minus Online Commission = the source's own
  // Gross Profit ("Laba Kotor Per Bulan"); that minus OPEX = Operating
  // Profit ("Profit Ebitda Per Bulan"). Online cost is subtracted exactly
  // once, here — never double-subtracted downstream.
  const contributionMarginBeforeOnlineCost = netRevenue - cogs;
  const grossProfit = contributionMarginBeforeOnlineCost - onlineCost;
  const operatingProfit = grossProfit - opex;
  const safeRevenue = revenue !== 0 ? revenue : 1;
  const safeNetRevenue = netRevenue !== 0 ? netRevenue : 1;
  return {
    period,
    revenue,
    promo,
    netRevenue,
    cogs,
    onlineCost,
    opex,
    contributionMarginBeforeOnlineCost,
    grossProfit,
    operatingProfit,
    contributionMarginBeforeOnlineCostPct: (contributionMarginBeforeOnlineCost / safeRevenue) * 100,
    grossMarginPct: (grossProfit / safeRevenue) * 100,
    operatingMarginPct: (operatingProfit / safeRevenue) * 100,
    promoRatioPct: (promo / safeRevenue) * 100,
    onlineCostRatioPct: (onlineCost / safeRevenue) * 100,
    cogsRatioPct: (cogs / safeNetRevenue) * 100,
    opexRatioPct: (opex / safeRevenue) * 100,
    unmappedAmount: agg.UNMAPPED,
  };
}

export function getAvailablePeriods(outletId: number): string[] {
  const rows = db
    .prepare('SELECT DISTINCT period FROM transactions WHERE outlet_id = ? ORDER BY period ASC')
    .all(outletId) as { period: string }[];
  return rows.map((r) => r.period);
}

export function computeMonthlyPnl(outletId: number, period: string): MonthlyPnl | null {
  const rows = db
    .prepare('SELECT period, analysis_group, SUM(amount) as total FROM transactions WHERE outlet_id = ? AND period = ? GROUP BY analysis_group')
    .all(outletId, period) as AggRow[];
  if (rows.length === 0) return null;
  const agg = emptyAgg();
  for (const r of rows) agg[r.analysis_group] = r.total;
  return toMonthlyPnl(period, agg);
}

export function getMonthlyPnlSeries(outletId: number): MonthlyPnl[] {
  const periods = getAvailablePeriods(outletId);
  return periods
    .map((p) => computeMonthlyPnl(outletId, p))
    .filter((x): x is MonthlyPnl => x !== null);
}

export function getSubcategoryBreakdown(
  outletId: number,
  period: string,
  analysisGroup: string
): { subcategory: string; amount: number }[] {
  const rows = db
    .prepare(
      `SELECT COALESCE(subcategory, 'OTHER') as subcategory, SUM(amount) as amount
       FROM transactions WHERE outlet_id = ? AND period = ? AND analysis_group = ?
       GROUP BY subcategory ORDER BY amount DESC`
    )
    .all(outletId, period, analysisGroup) as { subcategory: string; amount: number }[];
  return rows;
}
