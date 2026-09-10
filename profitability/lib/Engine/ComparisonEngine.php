<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/comparisonEngine.ts. */
final class ComparisonEngine
{
    /** @return array{abs: float, pct: ?float} */
    private static function delta(float $current, float $previous): array
    {
        $abs = $current - $previous;
        $pct = $previous !== 0.0 ? ($abs / abs($previous)) * 100 : null;
        return ['abs' => $abs, 'pct' => $pct];
    }

    public static function compareMonths(array $current, array $previous): array
    {
        return [
            'current' => $current,
            'previous' => $previous,
            'revenue' => self::delta($current['revenue'], $previous['revenue']),
            'promo' => self::delta($current['promo'], $previous['promo']),
            'cogs' => self::delta($current['cogs'], $previous['cogs']),
            'onlineCost' => self::delta($current['onlineCost'], $previous['onlineCost']),
            'opex' => self::delta($current['opex'], $previous['opex']),
            'grossProfit' => self::delta($current['grossProfit'], $previous['grossProfit']),
            'operatingProfit' => self::delta($current['operatingProfit'], $previous['operatingProfit']),
            'grossMarginPt' => $current['grossMarginPct'] - $previous['grossMarginPct'],
            'operatingMarginPt' => $current['operatingMarginPct'] - $previous['operatingMarginPct'],
            'promoRatioPt' => $current['promoRatioPct'] - $previous['promoRatioPct'],
            'onlineCostRatioPt' => $current['onlineCostRatioPct'] - $previous['onlineCostRatioPct'],
            'cogsRatioPt' => $current['cogsRatioPct'] - $previous['cogsRatioPct'],
            'opexRatioPt' => $current['opexRatioPct'] - $previous['opexRatioPct'],
        ];
    }
}
