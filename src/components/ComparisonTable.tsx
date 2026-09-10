import type { MoMComparison } from '@/lib/engine/comparisonEngine';
import { formatPeriodLabel, formatPct, formatPt, formatRupiahFull } from '@/lib/format';

interface RowDef {
  label: string;
  prev: number;
  cur: number;
  changeAbs: number;
  changePct: number | null;
  isPct?: boolean;
  changePt?: number;
  secondary?: boolean;
}

export default function ComparisonTable({ cmp }: { cmp: MoMComparison }) {
  const rows: RowDef[] = [
    { label: 'Omzet', prev: cmp.previous.revenue, cur: cmp.current.revenue, changeAbs: cmp.revenue.abs, changePct: cmp.revenue.pct },
    { label: 'Gross Profit', prev: cmp.previous.grossProfit, cur: cmp.current.grossProfit, changeAbs: cmp.grossProfit.abs, changePct: cmp.grossProfit.pct },
    { label: 'GP Margin', prev: cmp.previous.grossMarginPct, cur: cmp.current.grossMarginPct, changeAbs: cmp.grossMarginPt, changePct: null, isPct: true },
    {
      label: 'Margin Sebelum Komisi Online',
      prev: cmp.previous.contributionMarginBeforeOnlineCostPct,
      cur: cmp.current.contributionMarginBeforeOnlineCostPct,
      changeAbs: cmp.contributionMarginBeforeOnlineCostPt,
      changePct: null,
      isPct: true,
      secondary: true,
    },
    { label: 'Promo', prev: cmp.previous.promo, cur: cmp.current.promo, changeAbs: cmp.promo.abs, changePct: cmp.promo.pct },
    { label: 'Online Cost', prev: cmp.previous.onlineCost, cur: cmp.current.onlineCost, changeAbs: cmp.onlineCost.abs, changePct: cmp.onlineCost.pct },
    { label: 'OPEX', prev: cmp.previous.opex, cur: cmp.current.opex, changeAbs: cmp.opex.abs, changePct: cmp.opex.pct },
    { label: 'Operating Profit', prev: cmp.previous.operatingProfit, cur: cmp.current.operatingProfit, changeAbs: cmp.operatingProfit.abs, changePct: cmp.operatingProfit.pct },
    { label: 'Profit Margin', prev: cmp.previous.operatingMarginPct, cur: cmp.current.operatingMarginPct, changeAbs: cmp.operatingMarginPt, changePct: null, isPct: true },
  ];

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3">
        <div className="font-semibold text-sm">Perbandingan {formatPeriodLabel(cmp.previous.period)} vs {formatPeriodLabel(cmp.current.period)}</div>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-100">
              <th className="py-2 px-1 font-medium">Indikator</th>
              <th className="py-2 px-1 font-medium text-right">{formatPeriodLabel(cmp.previous.period)}</th>
              <th className="py-2 px-1 font-medium text-right">{formatPeriodLabel(cmp.current.period)}</th>
              <th className="py-2 px-1 font-medium text-right">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const positive = r.changeAbs >= 0;
              return (
                <tr key={r.label} className="border-b border-neutral-50 last:border-0">
                  <td className={`py-2.5 px-1 ${r.secondary ? 'text-neutral-400 text-xs italic pl-3' : 'text-neutral-700'}`}>{r.label}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums">{r.isPct ? `${r.prev.toFixed(1)}%` : formatRupiahFull(r.prev)}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums font-medium">{r.isPct ? `${r.cur.toFixed(1)}%` : formatRupiahFull(r.cur)}</td>
                  <td className={`py-2.5 px-1 text-right tabular-nums font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.isPct ? formatPt(r.changeAbs) : `${formatPct(r.changePct)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
