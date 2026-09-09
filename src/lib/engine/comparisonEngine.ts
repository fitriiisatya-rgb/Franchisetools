import type { MonthlyPnl } from './pnlEngine';

export interface Delta {
  abs: number;
  pct: number | null; // null when previous value is 0 (undefined % change)
}

function delta(current: number, previous: number): Delta {
  const abs = current - previous;
  const pct = previous !== 0 ? (abs / Math.abs(previous)) * 100 : null;
  return { abs, pct };
}

export interface MoMComparison {
  current: MonthlyPnl;
  previous: MonthlyPnl;
  revenue: Delta;
  promo: Delta;
  cogs: Delta;
  onlineCost: Delta;
  opex: Delta;
  grossProfit: Delta;
  operatingProfit: Delta;
  grossMarginPt: number;
  operatingMarginPt: number;
  promoRatioPt: number;
  onlineCostRatioPt: number;
  cogsRatioPt: number;
  opexRatioPt: number;
}

export function compareMonths(current: MonthlyPnl, previous: MonthlyPnl): MoMComparison {
  return {
    current,
    previous,
    revenue: delta(current.revenue, previous.revenue),
    promo: delta(current.promo, previous.promo),
    cogs: delta(current.cogs, previous.cogs),
    onlineCost: delta(current.onlineCost, previous.onlineCost),
    opex: delta(current.opex, previous.opex),
    grossProfit: delta(current.grossProfit, previous.grossProfit),
    operatingProfit: delta(current.operatingProfit, previous.operatingProfit),
    grossMarginPt: current.grossMarginPct - previous.grossMarginPct,
    operatingMarginPt: current.operatingMarginPct - previous.operatingMarginPct,
    promoRatioPt: current.promoRatioPct - previous.promoRatioPct,
    onlineCostRatioPt: current.onlineCostRatioPct - previous.onlineCostRatioPct,
    cogsRatioPt: current.cogsRatioPct - previous.cogsRatioPct,
    opexRatioPt: current.opexRatioPct - previous.opexRatioPct,
  };
}
