<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/narrativeEngine.ts. */
final class NarrativeEngine
{
    private static function fmtRp(float $n): string
    {
        $abs = abs($n);
        $sign = $n < 0 ? '-' : '';
        if ($abs >= 1_000_000_000) {
            return $sign . 'Rp' . number_format($abs / 1_000_000_000, 2) . 'M';
        }
        return $sign . 'Rp' . round($abs / 1_000_000) . 'jt';
    }

    private static function fmtPct(?float $n): string
    {
        if ($n === null) {
            return 'n/a';
        }
        return ($n >= 0 ? '+' : '') . number_format($n, 1) . '%';
    }

    /** @return array<int, array{tone:string, text:string}> */
    public static function generateNarrative(array $cmp, array $classification, array $drivers): array
    {
        $points = [];

        $points[] = [
            'tone' => $cmp['revenue']['abs'] >= 0 ? 'positive' : 'negative',
            'text' => sprintf(
                'Omzet periode ini %s %s (%s) dibanding periode sebelumnya.',
                $cmp['revenue']['abs'] >= 0 ? 'tumbuh' : 'turun',
                self::fmtPct($cmp['revenue']['pct']),
                self::fmtRp($cmp['revenue']['abs'])
            ),
        ];

        $points[] = [
            'tone' => $cmp['grossProfit']['abs'] >= 0 ? 'positive' : 'negative',
            'text' => sprintf(
                'Gross Profit (setelah komisi online) %s %s, dengan gross margin %s %s pt.',
                $cmp['grossProfit']['abs'] >= 0 ? 'ikut naik' : 'ikut turun',
                self::fmtPct($cmp['grossProfit']['pct']),
                $cmp['grossMarginPt'] >= 0 ? 'membaik' : 'melemah',
                number_format(abs($cmp['grossMarginPt']), 1)
            ),
        ];

        // Surfaces the online-commission effect explicitly: the pre-online-cost
        // margin and the source-reconciled Gross Profit margin can move in
        // different directions (or by very different magnitudes) whenever
        // online commission grows faster or slower than the rest of the P&L —
        // this point makes that visible instead of letting one "Gross Profit"
        // number hide it.
        $cmDeltaPt = $cmp['contributionMarginBeforeOnlineCostPt'];
        $gpDeltaPt = $cmp['grossMarginPt'];
        $points[] = [
            'tone' => $gpDeltaPt >= $cmDeltaPt - 0.001 ? 'neutral' : 'info',
            'text' => sprintf(
                'Margin sebelum komisi online (Contribution Margin) %s %s pt, namun %s komisi online (%s) %s manfaat tersebut, sehingga Gross Profit margin setelah komisi online %s %s pt.',
                $cmDeltaPt >= 0 ? 'membaik' : 'melemah',
                number_format(abs($cmDeltaPt), 1),
                $cmp['onlineCost']['abs'] >= 0 ? 'kenaikan' : 'penurunan',
                self::fmtPct($cmp['onlineCost']['pct']),
                $cmDeltaPt > $gpDeltaPt ? 'mengurangi' : 'tidak mengurangi',
                $gpDeltaPt >= 0 ? 'membaik' : 'menurun',
                number_format(abs($gpDeltaPt), 1)
            ),
        ];

        $topDriver = null;
        foreach ($drivers as $d) {
            if ($d['direction'] === 'reduces') {
                $topDriver = $d;
                break;
            }
        }
        if ($topDriver === null && count($drivers) > 0) {
            $topDriver = $drivers[0];
        }
        $sev = $classification['severity'];
        $points[] = [
            'tone' => $sev === 'negative' ? 'negative' : ($sev === 'positive' ? 'positive' : 'info'),
            'text' => sprintf(
                'Operating profit %s %s — status: %s%s.',
                $cmp['operatingProfit']['abs'] >= 0 ? 'naik' : 'turun',
                self::fmtPct($cmp['operatingProfit']['pct']),
                $classification['title'],
                $topDriver ? sprintf(', faktor utama: %s (%s)', $topDriver['name'], self::fmtRp($topDriver['impact'])) : ''
            ),
        ];

        $points[] = [
            'tone' => $cmp['operatingMarginPt'] >= 0 ? 'positive' : 'negative',
            'text' => sprintf(
                'Operating profit margin %s dari %s%% menjadi %s%% (%s%s pt).',
                $cmp['operatingMarginPt'] >= 0 ? 'membaik' : 'menurun',
                number_format($cmp['previous']['operatingMarginPct'], 1),
                number_format($cmp['current']['operatingMarginPct'], 1),
                $cmp['operatingMarginPt'] >= 0 ? '+' : '',
                number_format($cmp['operatingMarginPt'], 1)
            ),
        ];

        $negativeDrivers = array_values(array_filter($drivers, static fn ($d) => $d['direction'] === 'reduces'));
        $negativeDrivers = array_slice($negativeDrivers, 0, 2);
        if (count($negativeDrivers) > 0) {
            $points[] = [
                'tone' => 'info',
                'text' => 'Fokus evaluasi bulan ini: ' . implode(' dan ', array_column($negativeDrivers, 'name')) . '.',
            ];
        }

        return array_slice($points, 0, 6);
    }
}
