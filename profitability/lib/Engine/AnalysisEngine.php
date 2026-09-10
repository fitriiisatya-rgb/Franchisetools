<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/analysisEngine.ts. */
final class AnalysisEngine
{
    public static function buildFullAnalysis(int $outletId, string $currentPeriod, string $comparePeriod): ?array
    {
        $current = PnlEngine::computeMonthlyPnl($outletId, $currentPeriod);
        $previous = PnlEngine::computeMonthlyPnl($outletId, $comparePeriod);
        if ($current === null || $previous === null) {
            return null;
        }

        $comparison = ComparisonEngine::compareMonths($current, $previous);
        $bridge = DriverEngine::buildProfitBridge($comparison);
        $drivers = DriverEngine::rankDrivers($comparison);
        $classification = ClassificationEngine::classifyScenario($comparison, $bridge);
        $anomalies = AnomalyEngine::detectAnomalies($comparison);
        $narrative = NarrativeEngine::generateNarrative($comparison, $classification, $drivers);
        $opexTopContributors = DriverEngine::topSubcategoryContributors($outletId, $currentPeriod, $comparePeriod, 'OPEX');
        $cogsTopContributors = DriverEngine::topSubcategoryContributors($outletId, $currentPeriod, $comparePeriod, 'COGS');
        $trend = PnlEngine::getMonthlyPnlSeries($outletId);

        return [
            'current' => $current,
            'previous' => $previous,
            'comparison' => $comparison,
            'bridge' => $bridge,
            'drivers' => $drivers,
            'classification' => $classification,
            'anomalies' => $anomalies,
            'narrative' => $narrative,
            'opexTopContributors' => $opexTopContributors,
            'cogsTopContributors' => $cogsTopContributors,
            'trend' => $trend,
        ];
    }
}
