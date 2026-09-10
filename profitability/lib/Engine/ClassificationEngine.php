<?php

namespace App\Engine;

/** Ported 1:1 from src/lib/engine/classificationEngine.ts. */
final class ClassificationEngine
{
    private const EPS_PCT = 0.05; // treat <0.05% revenue move as flat, avoids float-noise flips

    private static function fmtRp(float $n): string
    {
        $abs = abs($n);
        $sign = $n < 0 ? '-' : '';
        if ($abs >= 1_000_000_000) {
            return $sign . 'Rp' . number_format($abs / 1_000_000_000, 1) . 'M';
        }
        return $sign . 'Rp' . round($abs / 1_000_000) . 'jt';
    }

    /** @return array{scenario:string, title:string, description:string, severity:string} */
    public static function classifyScenario(array $cmp, array $bridge): array
    {
        $revPct = $cmp['revenue']['pct'] ?? 0.0;
        $revenueUp = $revPct > self::EPS_PCT;
        $revenueDown = $revPct < -self::EPS_PCT;
        $profitUp = $cmp['operatingProfit']['abs'] > 0;
        $profitDown = $cmp['operatingProfit']['abs'] < 0;
        $marginUp = $cmp['operatingMarginPt'] > 0;
        $opProfitPct = $cmp['operatingProfit']['pct'] ?? 0.0;

        if ($revenueUp && $profitUp && $marginUp) {
            return [
                'scenario' => 'HEALTHY_GROWTH',
                'title' => 'Healthy Growth',
                'description' => sprintf(
                    'Omzet naik %s%% dan profit ikut naik %s%%, dengan margin membaik %s pt. Pertumbuhan penjualan berhasil dikonversi menjadi pertumbuhan laba yang berkualitas.',
                    number_format($revPct, 1), number_format($opProfitPct, 1), number_format($cmp['operatingMarginPt'], 1)
                ),
                'severity' => 'positive',
            ];
        }
        if ($revenueUp && $profitUp && !$marginUp) {
            return [
                'scenario' => 'GROWTH_WITH_MARGIN_PRESSURE',
                'title' => 'Growth with Margin Pressure',
                'description' => sprintf(
                    'Omzet naik %s%% dan profit ikut naik, tetapi margin turun %s pt. Pertumbuhan penjualan perlu diperhatikan kualitasnya karena biaya tumbuh lebih cepat dari omzet.',
                    number_format($revPct, 1), number_format(abs($cmp['operatingMarginPt']), 1)
                ),
                'severity' => 'warning',
            ];
        }
        if ($revenueUp && ($profitDown || !$profitUp)) {
            $nonRevenueSteps = array_values(array_filter($bridge['steps'], static fn ($s) => $s['key'] !== 'REVENUE'));
            usort($nonRevenueSteps, static fn ($a, $b) => $a['value'] <=> $b['value']);
            $worst = $nonRevenueSteps[0] ?? null;
            return [
                'scenario' => 'SALES_GROWTH_NOT_CONVERTED',
                'title' => 'Sales Growth Tidak Diikuti Profit Growth',
                'description' => sprintf(
                    'Omzet naik %s%%, tetapi profit turun %s%%. Kenaikan penjualan belum berhasil dikonversi menjadi pertumbuhan laba, terutama akibat %s sebesar %s.',
                    number_format($revPct, 1),
                    number_format(abs($opProfitPct), 1),
                    $worst ? mb_strtolower($worst['label']) : 'kenaikan biaya',
                    $worst ? self::fmtRp($worst['value']) : ''
                ),
                'severity' => 'negative',
            ];
        }
        if ($revenueDown && $profitUp) {
            $nonRevenueSteps = array_values(array_filter($bridge['steps'], static fn ($s) => $s['key'] !== 'REVENUE'));
            usort($nonRevenueSteps, static fn ($a, $b) => $b['value'] <=> $a['value']);
            $best = $nonRevenueSteps[0] ?? null;
            return [
                'scenario' => 'EFFICIENCY_IMPROVEMENT',
                'title' => 'Efficiency Improvement',
                'description' => sprintf(
                    'Omzet turun %s%%, namun profit justru naik %s%%, didorong efisiensi pada %s. Perlu dicek apakah efisiensi ini berkelanjutan.',
                    number_format(abs($revPct), 1), number_format($opProfitPct, 1), $best ? mb_strtolower($best['label']) : 'biaya operasional'
                ),
                'severity' => 'positive',
            ];
        }
        if ($revenueDown && ($profitDown || !$profitUp)) {
            $revenueStep = null;
            foreach ($bridge['steps'] as $s) {
                if ($s['key'] === 'REVENUE') {
                    $revenueStep = $s;
                    break;
                }
            }
            $revenueImpact = abs($revenueStep['value'] ?? 0.0);
            $costImpact = 0.0;
            foreach ($bridge['steps'] as $s) {
                if ($s['key'] !== 'REVENUE') {
                    $costImpact += min($s['value'], 0.0);
                }
            }
            $costImpact = abs($costImpact);
            $dominant = $revenueImpact >= $costImpact ? 'SALES_DECLINE' : 'COST_PRESSURE';
            return [
                'scenario' => $dominant === 'SALES_DECLINE' ? 'PERFORMANCE_DECLINE_SALES' : 'PERFORMANCE_DECLINE_COST',
                'title' => 'Performance Decline',
                'description' => sprintf(
                    'Omzet turun %s%% dan profit ikut turun %s%%. Penyebab dominan adalah %s.',
                    number_format(abs($revPct), 1),
                    number_format(abs($opProfitPct), 1),
                    $dominant === 'SALES_DECLINE' ? 'penurunan penjualan (sales decline)' : 'tekanan biaya (cost pressure)'
                ),
                'severity' => 'negative',
            ];
        }

        return [
            'scenario' => 'FLAT',
            'title' => 'Kinerja Stabil',
            'description' => 'Omzet dan profit relatif stabil dibanding periode sebelumnya.',
            'severity' => 'info',
        ];
    }
}
