'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProfitBridge } from '@/lib/engine/driverEngine';
import { formatPeriodLabel } from '@/lib/format';
import { formatRupiahFull } from '@/lib/format';

interface WaterfallDatum {
  name: string;
  base: number;
  value: number;
  display: number;
  kind: 'total' | 'up' | 'down';
}

export default function ProfitBridgeChart({
  bridge,
  currentPeriod,
  previousPeriod,
}: {
  bridge: ProfitBridge;
  currentPeriod: string;
  previousPeriod: string;
}) {
  let running = bridge.previousProfit;
  const data: WaterfallDatum[] = [
    { name: `Profit ${formatPeriodLabel(previousPeriod)}`, base: 0, value: bridge.previousProfit, display: bridge.previousProfit, kind: 'total' },
  ];
  for (const step of bridge.steps) {
    const before = running;
    running += step.value;
    const base = Math.min(before, running);
    const value = Math.abs(step.value);
    data.push({
      name: step.label.replace('Dampak ', ''),
      base,
      value,
      display: step.value,
      kind: step.value >= 0 ? 'up' : 'down',
    });
  }
  data.push({ name: `Profit ${formatPeriodLabel(currentPeriod)}`, base: 0, value: bridge.currentProfit, display: bridge.currentProfit, kind: 'total' });

  const colorFor = (kind: WaterfallDatum['kind']) => (kind === 'total' ? '#334155' : kind === 'up' ? '#16a34a' : '#dc2626');

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3">
        <div className="font-semibold text-sm">Profit Bridge</div>
        <div className="text-xs text-neutral-500">
          Faktor yang mempengaruhi perubahan profit dari {formatPeriodLabel(previousPeriod)} ke {formatPeriodLabel(currentPeriod)}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${Math.round(v / 1_000_000)}jt`} />
            <Tooltip formatter={(v: number, key: string, entry) => (key === 'value' ? formatRupiahFull((entry.payload as WaterfallDatum).display) : '')} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="a" radius={[3, 3, 3, 3]} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(d.kind)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
