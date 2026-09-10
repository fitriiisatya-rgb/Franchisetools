<?php

namespace App\Engine;

use App\Db;

/** Ported 1:1 from src/lib/engine/pnlEngine.ts. */
final class PnlEngine
{
    private static function emptyAgg(): array
    {
        return ['REVENUE' => 0.0, 'PROMO' => 0.0, 'COGS' => 0.0, 'ONLINE_COST' => 0.0, 'OPEX' => 0.0, 'UNMAPPED' => 0.0];
    }

    /**
     * @return array{period:string, revenue:float, promo:float, netRevenue:float, cogs:float, onlineCost:float, opex:float, grossProfit:float, operatingProfit:float, grossMarginPct:float, operatingMarginPct:float, promoRatioPct:float, onlineCostRatioPct:float, cogsRatioPct:float, opexRatioPct:float, unmappedAmount:float}
     */
    private static function toMonthlyPnl(string $period, array $agg): array
    {
        $netRevenue = $agg['REVENUE'];
        $promo = $agg['PROMO'];
        $revenue = $netRevenue + $promo;
        $cogs = $agg['COGS'];
        $onlineCost = $agg['ONLINE_COST'];
        $opex = $agg['OPEX'];
        $grossProfit = $netRevenue - $cogs;
        $operatingProfit = $grossProfit - $onlineCost - $opex;
        $safeRevenue = $revenue !== 0.0 ? $revenue : 1.0;
        $safeNetRevenue = $netRevenue !== 0.0 ? $netRevenue : 1.0;

        return [
            'period' => $period,
            'revenue' => $revenue,
            'promo' => $promo,
            'netRevenue' => $netRevenue,
            'cogs' => $cogs,
            'onlineCost' => $onlineCost,
            'opex' => $opex,
            'grossProfit' => $grossProfit,
            'operatingProfit' => $operatingProfit,
            'grossMarginPct' => ($grossProfit / $safeRevenue) * 100,
            'operatingMarginPct' => ($operatingProfit / $safeRevenue) * 100,
            'promoRatioPct' => ($promo / $safeRevenue) * 100,
            'onlineCostRatioPct' => ($onlineCost / $safeRevenue) * 100,
            'cogsRatioPct' => ($cogs / $safeNetRevenue) * 100,
            'opexRatioPct' => ($opex / $safeRevenue) * 100,
            'unmappedAmount' => $agg['UNMAPPED'],
        ];
    }

    public static function getAvailablePeriods(int $outletId): array
    {
        $stmt = Db::get()->prepare('SELECT DISTINCT period FROM transactions WHERE outlet_id = ? ORDER BY period ASC');
        $stmt->execute([$outletId]);
        return array_column($stmt->fetchAll(), 'period');
    }

    public static function computeMonthlyPnl(int $outletId, string $period): ?array
    {
        $stmt = Db::get()->prepare('SELECT analysis_group, SUM(amount) as total FROM transactions WHERE outlet_id = ? AND period = ? GROUP BY analysis_group');
        $stmt->execute([$outletId, $period]);
        $rows = $stmt->fetchAll();
        if (count($rows) === 0) {
            return null;
        }
        $agg = self::emptyAgg();
        foreach ($rows as $r) {
            $agg[$r['analysis_group']] = (float) $r['total'];
        }
        return self::toMonthlyPnl($period, $agg);
    }

    public static function getMonthlyPnlSeries(int $outletId): array
    {
        $periods = self::getAvailablePeriods($outletId);
        $result = [];
        foreach ($periods as $p) {
            $pnl = self::computeMonthlyPnl($outletId, $p);
            if ($pnl !== null) {
                $result[] = $pnl;
            }
        }
        return $result;
    }

    /** @return array<int, array{subcategory:string, amount:float}> */
    public static function getSubcategoryBreakdown(int $outletId, string $period, string $analysisGroup): array
    {
        $stmt = Db::get()->prepare(
            "SELECT COALESCE(subcategory, 'OTHER') as subcategory, SUM(amount) as amount
             FROM transactions WHERE outlet_id = ? AND period = ? AND analysis_group = ?
             GROUP BY subcategory ORDER BY amount DESC"
        );
        $stmt->execute([$outletId, $period, $analysisGroup]);
        $rows = $stmt->fetchAll();
        return array_map(static fn ($r) => ['subcategory' => $r['subcategory'], 'amount' => (float) $r['amount']], $rows);
    }
}
