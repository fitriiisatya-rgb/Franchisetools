<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/driverEngine.ts. */
final class DriverEngine
{
    /**
     * Operating profit = Revenue - Promo - COGS - OnlineCost - OPEX (an exact
     * linear identity given how the P&L engine derives each figure), so the
     * waterfall from previous to current profit is an exact decomposition
     * with no residual/plug term.
     *
     * @return array{previousProfit: float, currentProfit: float, steps: array}
     */
    public static function buildProfitBridge(array $cmp): array
    {
        $steps = [
            ['key' => 'REVENUE', 'label' => 'Dampak Perubahan Omzet', 'value' => $cmp['revenue']['abs']],
            ['key' => 'COGS', 'label' => 'Dampak HPP', 'value' => -$cmp['cogs']['abs']],
            ['key' => 'PROMO', 'label' => 'Dampak Promo', 'value' => -$cmp['promo']['abs']],
            ['key' => 'ONLINE_COST', 'label' => 'Dampak Komisi Online', 'value' => -$cmp['onlineCost']['abs']],
            ['key' => 'OPEX', 'label' => 'Dampak OPEX', 'value' => -$cmp['opex']['abs']],
        ];
        $running = $cmp['previous']['operatingProfit'];
        $result = [];
        foreach ($steps as $s) {
            $running += $s['value'];
            $s['runningTotal'] = $running;
            $result[] = $s;
        }
        return ['previousProfit' => $cmp['previous']['operatingProfit'], 'currentProfit' => $cmp['current']['operatingProfit'], 'steps' => $result];
    }

    /** @return array<int, array{name:string, key:string, impact:float, direction:string}> */
    public static function rankDrivers(array $cmp): array
    {
        $items = [
            ['name' => 'Revenue', 'key' => 'REVENUE', 'impact' => $cmp['revenue']['abs'], 'direction' => $cmp['revenue']['abs'] >= 0 ? 'supports' : 'reduces'],
            ['name' => 'Promo', 'key' => 'PROMO', 'impact' => -$cmp['promo']['abs'], 'direction' => -$cmp['promo']['abs'] >= 0 ? 'supports' : 'reduces'],
            ['name' => 'Komisi Online', 'key' => 'ONLINE_COST', 'impact' => -$cmp['onlineCost']['abs'], 'direction' => -$cmp['onlineCost']['abs'] >= 0 ? 'supports' : 'reduces'],
            ['name' => 'HPP (COGS)', 'key' => 'COGS', 'impact' => -$cmp['cogs']['abs'], 'direction' => -$cmp['cogs']['abs'] >= 0 ? 'supports' : 'reduces'],
            ['name' => 'OPEX', 'key' => 'OPEX', 'impact' => -$cmp['opex']['abs'], 'direction' => -$cmp['opex']['abs'] >= 0 ? 'supports' : 'reduces'],
        ];
        usort($items, static fn ($a, $b) => abs($b['impact']) <=> abs($a['impact']));
        return $items;
    }

    private const SUBCATEGORY_LABELS = [
        'MANPOWER' => 'Gaji & Tunjangan Karyawan',
        'RENT' => 'Sewa',
        'MARKETING' => 'Marketing & Iklan',
        'UTILITIES' => 'Listrik, Air & Internet',
        'ADMINISTRATION' => 'Administrasi',
        'MAINTENANCE' => 'Pemeliharaan',
        'SUPPLIES' => 'Perlengkapan (ATK/POS)',
        'FRANCHISE_FEE' => 'Royalti & Management Fee',
        'TRANSPORT_DELIVERY' => 'Transportasi & Delivery',
        'OTHER_OPEX' => 'Lain-lain',
        'HPP_OFFLINE' => 'HPP Offline',
        'HPP_ONLINE' => 'HPP Online',
        'HPP_KONSINYASI' => 'HPP Konsinyasi',
        'HPP_RETURN_EXPIRED' => 'Return/Expired',
        'HPP_BAHAN_BAKU' => 'Bahan Baku Langsung',
        'HPP_PROMO' => 'HPP Promo',
        'OTHER_COGS' => 'Lain-lain',
        'COMMISSION' => 'Komisi Platform',
        'AFFILIATE' => 'Affiliate',
        'OTHER' => 'Lain-lain',
    ];

    /** @return array<int, array{subcategory:string, label:string, current:float, previous:float, delta:float}> */
    public static function topSubcategoryContributors(int $outletId, string $currentPeriod, string $previousPeriod, string $analysisGroup, int $limit = 5): array
    {
        $cur = PnlEngine::getSubcategoryBreakdown($outletId, $currentPeriod, $analysisGroup);
        $prev = PnlEngine::getSubcategoryBreakdown($outletId, $previousPeriod, $analysisGroup);
        $curMap = [];
        foreach ($cur as $c) {
            $curMap[$c['subcategory']] = $c['amount'];
        }
        $prevMap = [];
        foreach ($prev as $p) {
            $prevMap[$p['subcategory']] = $p['amount'];
        }
        $keys = array_unique(array_merge(array_keys($curMap), array_keys($prevMap)));

        $rows = [];
        foreach ($keys as $k) {
            $c = $curMap[$k] ?? 0.0;
            $p = $prevMap[$k] ?? 0.0;
            $rows[] = ['subcategory' => $k, 'label' => self::SUBCATEGORY_LABELS[$k] ?? $k, 'current' => $c, 'previous' => $p, 'delta' => $c - $p];
        }
        usort($rows, static fn ($a, $b) => abs($b['delta']) <=> abs($a['delta']));

        if (count($rows) <= $limit) {
            return $rows;
        }
        $top = array_slice($rows, 0, $limit);
        $rest = array_slice($rows, $limit);
        $otherDelta = array_sum(array_column($rest, 'delta'));
        $otherCur = array_sum(array_column($rest, 'current'));
        $otherPrev = array_sum(array_column($rest, 'previous'));
        $top[] = ['subcategory' => 'OTHERS', 'label' => 'Lainnya', 'current' => $otherCur, 'previous' => $otherPrev, 'delta' => $otherDelta];
        return $top;
    }
}
