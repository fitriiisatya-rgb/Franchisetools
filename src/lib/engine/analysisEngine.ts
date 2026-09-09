import { computeMonthlyPnl, getMonthlyPnlSeries, type MonthlyPnl } from './pnlEngine';
import { compareMonths, type MoMComparison } from './comparisonEngine';
import { buildProfitBridge, rankDrivers, topSubcategoryContributors, type ProfitBridge, type DriverImpact, type SubDriverContribution } from './driverEngine';
import { classifyScenario, type Classification } from './classificationEngine';
import { detectAnomalies, type AnomalyFlag } from './anomalyEngine';
import { generateNarrative, type NarrativePoint } from './narrativeEngine';

export interface FullAnalysis {
  current: MonthlyPnl;
  previous: MonthlyPnl;
  comparison: MoMComparison;
  bridge: ProfitBridge;
  drivers: DriverImpact[];
  classification: Classification;
  anomalies: AnomalyFlag[];
  narrative: NarrativePoint[];
  opexTopContributors: SubDriverContribution[];
  cogsTopContributors: SubDriverContribution[];
  trend: MonthlyPnl[];
}

export function buildFullAnalysis(outletId: number, currentPeriod: string, comparePeriod: string): FullAnalysis | null {
  const current = computeMonthlyPnl(outletId, currentPeriod);
  const previous = computeMonthlyPnl(outletId, comparePeriod);
  if (!current || !previous) return null;

  const comparison = compareMonths(current, previous);
  const bridge = buildProfitBridge(comparison);
  const drivers = rankDrivers(comparison);
  const classification = classifyScenario(comparison, bridge);
  const anomalies = detectAnomalies(comparison);
  const narrative = generateNarrative(comparison, classification, drivers);
  const opexTopContributors = topSubcategoryContributors(outletId, currentPeriod, comparePeriod, 'OPEX');
  const cogsTopContributors = topSubcategoryContributors(outletId, currentPeriod, comparePeriod, 'COGS');
  const trend = getMonthlyPnlSeries(outletId);

  return {
    current,
    previous,
    comparison,
    bridge,
    drivers,
    classification,
    anomalies,
    narrative,
    opexTopContributors,
    cogsTopContributors,
    trend,
  };
}
