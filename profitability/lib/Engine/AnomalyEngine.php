<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/anomalyEngine.ts. */
final class AnomalyEngine
{
    public const DEFAULT_THRESHOLDS = [
        'costGrowthPct' => 20,
        'marginDropPt' => 2,
        'promoRatioIncreasePt' => 2,
        'onlineCostRatioIncreasePt' => 2,
    ];

    /** @return array<int, array{level:string, message:string}> */
    public static function detectAnomalies(array $cmp, array $thresholds = self::DEFAULT_THRESHOLDS): array
    {
        $flags = [];

        if (($cmp['revenue']['pct'] ?? 0.0) > 0.05 && $cmp['operatingProfit']['abs'] < 0) {
            $flags[] = ['level' => 'high', 'message' => 'Omzet naik tetapi profit turun — pertumbuhan penjualan belum terkonversi menjadi laba.'];
        }

        $costChecks = [
            ['name' => 'COGS', 'pct' => $cmp['cogs']['pct']],
            ['name' => 'Promo', 'pct' => $cmp['promo']['pct']],
            ['name' => 'Komisi Online', 'pct' => $cmp['onlineCost']['pct']],
            ['name' => 'OPEX', 'pct' => $cmp['opex']['pct']],
        ];
        foreach ($costChecks as $c) {
            if ($c['pct'] !== null && $c['pct'] > $thresholds['costGrowthPct']) {
                $flags[] = ['level' => 'medium', 'message' => sprintf('%s naik %s%% MoM (di atas ambang batas %s%%).', $c['name'], number_format($c['pct'], 1), $thresholds['costGrowthPct'])];
            }
        }

        if ($cmp['operatingMarginPt'] < -$thresholds['marginDropPt']) {
            $flags[] = ['level' => 'high', 'message' => sprintf('Operating margin turun %s pt (di atas ambang batas %s pt).', number_format(abs($cmp['operatingMarginPt']), 1), $thresholds['marginDropPt'])];
        }

        if ($cmp['promoRatioPt'] > $thresholds['promoRatioIncreasePt']) {
            $flags[] = ['level' => 'medium', 'message' => sprintf('Rasio promo terhadap omzet naik %s pt — efektivitas promo perlu dievaluasi.', number_format($cmp['promoRatioPt'], 1))];
        }

        if ($cmp['onlineCostRatioPt'] > $thresholds['onlineCostRatioIncreasePt']) {
            $flags[] = ['level' => 'medium', 'message' => sprintf('Rasio biaya online terhadap omzet naik %s pt — biaya komisi online tumbuh lebih cepat dari omzet.', number_format($cmp['onlineCostRatioPt'], 1))];
        }

        return $flags;
    }
}
