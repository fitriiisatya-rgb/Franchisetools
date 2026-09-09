import type { DriverImpact } from '@/lib/engine/driverEngine';
import { formatRupiah } from '@/lib/format';

export default function DriverRankingList({ drivers }: { drivers: DriverImpact[] }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3">
        <div className="font-semibold text-sm">Faktor Penyebab Perubahan Profit</div>
        <div className="text-xs text-neutral-500">Ranking berdasarkan impact terbesar terhadap profit</div>
      </div>
      <div className="space-y-2.5">
        {drivers.map((d) => {
          const positive = d.impact >= 0;
          const magnitude = Math.min(Math.abs(d.impact), Math.max(...drivers.map((x) => Math.abs(x.impact)), 1));
          const maxAbs = Math.max(...drivers.map((x) => Math.abs(x.impact)), 1);
          const widthPct = Math.max((magnitude / maxAbs) * 100, 4);
          return (
            <div key={d.key} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-neutral-600 truncate">{d.name}</div>
              <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className={`w-32 shrink-0 text-right text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {positive ? '+' : '-'}{formatRupiah(Math.abs(d.impact))}
              </div>
              <div className={`w-40 shrink-0 hidden sm:block text-xs ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {positive ? 'Mendukung pertumbuhan' : 'Menekan profit'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
