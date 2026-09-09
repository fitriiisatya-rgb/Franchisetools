'use client';

import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { MonthlyPnl } from '@/lib/engine/pnlEngine';
import { formatPeriodShort, formatRupiahFull } from '@/lib/format';

export default function SalesProfitTrendChart({ trend }: { trend: MonthlyPnl[] }) {
  const data = trend.map((t) => ({
    period: formatPeriodShort(t.period),
    Omzet: Math.round(t.revenue / 1_000_000),
    Profit: Math.round(t.operatingProfit / 1_000_000),
  }));

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3">
        <div className="font-semibold text-sm">Sales vs Profit Trend</div>
        <div className="text-xs text-neutral-500">Perkembangan omzet dan profit bulanan (Rp jt)</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value: number) => formatRupiahFull(Number(value) * 1_000_000)}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="Omzet" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={28} />
            <Line yAxisId="right" type="monotone" dataKey="Profit" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
