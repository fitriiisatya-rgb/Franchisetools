import type { MoMComparison } from './comparisonEngine';
import type { ProfitBridge } from './driverEngine';

export type ScenarioKey =
  | 'HEALTHY_GROWTH'
  | 'GROWTH_WITH_MARGIN_PRESSURE'
  | 'SALES_GROWTH_NOT_CONVERTED'
  | 'EFFICIENCY_IMPROVEMENT'
  | 'PERFORMANCE_DECLINE_SALES'
  | 'PERFORMANCE_DECLINE_COST'
  | 'FLAT';

export interface Classification {
  scenario: ScenarioKey;
  title: string;
  description: string;
  severity: 'positive' | 'warning' | 'negative' | 'info';
}

const EPS_PCT = 0.05; // treat <0.05% revenue move as flat, avoids float-noise flips

function fmtRp(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}M`;
  return `${sign}Rp${Math.round(abs / 1_000_000)}jt`;
}

export function classifyScenario(cmp: MoMComparison, bridge: ProfitBridge): Classification {
  const revPct = cmp.revenue.pct ?? 0;
  const revenueUp = revPct > EPS_PCT;
  const revenueDown = revPct < -EPS_PCT;
  const profitUp = cmp.operatingProfit.abs > 0;
  const profitDown = cmp.operatingProfit.abs < 0;
  const marginUp = cmp.operatingMarginPt > 0;

  if (revenueUp && profitUp && marginUp) {
    return {
      scenario: 'HEALTHY_GROWTH',
      title: 'Healthy Growth',
      description: `Omzet naik ${revPct.toFixed(1)}% dan profit ikut naik ${(cmp.operatingProfit.pct ?? 0).toFixed(1)}%, dengan margin membaik ${cmp.operatingMarginPt.toFixed(1)} pt. Pertumbuhan penjualan berhasil dikonversi menjadi pertumbuhan laba yang berkualitas.`,
      severity: 'positive',
    };
  }
  if (revenueUp && profitUp && !marginUp) {
    return {
      scenario: 'GROWTH_WITH_MARGIN_PRESSURE',
      title: 'Growth with Margin Pressure',
      description: `Omzet naik ${revPct.toFixed(1)}% dan profit ikut naik, tetapi margin turun ${Math.abs(cmp.operatingMarginPt).toFixed(1)} pt. Pertumbuhan penjualan perlu diperhatikan kualitasnya karena biaya tumbuh lebih cepat dari omzet.`,
      severity: 'warning',
    };
  }
  if (revenueUp && (profitDown || !profitUp)) {
    const worst = bridge.steps.filter((s) => s.key !== 'REVENUE').sort((a, b) => a.value - b.value)[0];
    return {
      scenario: 'SALES_GROWTH_NOT_CONVERTED',
      title: 'Sales Growth Tidak Diikuti Profit Growth',
      description: `Omzet naik ${revPct.toFixed(1)}%, tetapi profit turun ${Math.abs(cmp.operatingProfit.pct ?? 0).toFixed(1)}%. Kenaikan penjualan belum berhasil dikonversi menjadi pertumbuhan laba, terutama akibat ${worst ? worst.label.toLowerCase() : 'kenaikan biaya'} sebesar ${worst ? fmtRp(worst.value) : ''}.`,
      severity: 'negative',
    };
  }
  if (revenueDown && profitUp) {
    const best = bridge.steps.filter((s) => s.key !== 'REVENUE').sort((a, b) => b.value - a.value)[0];
    return {
      scenario: 'EFFICIENCY_IMPROVEMENT',
      title: 'Efficiency Improvement',
      description: `Omzet turun ${Math.abs(revPct).toFixed(1)}%, namun profit justru naik ${(cmp.operatingProfit.pct ?? 0).toFixed(1)}%, didorong efisiensi pada ${best ? best.label.toLowerCase() : 'biaya operasional'}. Perlu dicek apakah efisiensi ini berkelanjutan.`,
      severity: 'positive',
    };
  }
  if (revenueDown && (profitDown || !profitUp)) {
    const revenueImpact = Math.abs(bridge.steps.find((s) => s.key === 'REVENUE')?.value ?? 0);
    const costImpact = Math.abs(bridge.steps.filter((s) => s.key !== 'REVENUE').reduce((sum, s) => sum + Math.min(s.value, 0), 0));
    const dominant = revenueImpact >= costImpact ? 'SALES_DECLINE' : 'COST_PRESSURE';
    return {
      scenario: dominant === 'SALES_DECLINE' ? 'PERFORMANCE_DECLINE_SALES' : 'PERFORMANCE_DECLINE_COST',
      title: 'Performance Decline',
      description: `Omzet turun ${Math.abs(revPct).toFixed(1)}% dan profit ikut turun ${Math.abs(cmp.operatingProfit.pct ?? 0).toFixed(1)}%. Penyebab dominan adalah ${dominant === 'SALES_DECLINE' ? 'penurunan penjualan (sales decline)' : 'tekanan biaya (cost pressure)'}.`,
      severity: 'negative',
    };
  }
  return {
    scenario: 'FLAT',
    title: 'Kinerja Stabil',
    description: 'Omzet dan profit relatif stabil dibanding periode sebelumnya.',
    severity: 'info',
  };
}
