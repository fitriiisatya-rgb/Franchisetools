'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FullAnalysis } from '@/lib/engine/analysisEngine';
import { formatPeriodLabel, formatRupiahFull } from '@/lib/format';
import KpiCard from '@/components/KpiCard';
import StatusCard from '@/components/StatusCard';
import SalesProfitTrendChart from '@/components/SalesProfitTrendChart';
import ProfitBridgeChart from '@/components/ProfitBridgeChart';
import DriverRankingList from '@/components/DriverRankingList';
import ComparisonTable from '@/components/ComparisonTable';
import MonthlyAnalysisPanel from '@/components/MonthlyAnalysisPanel';

interface Outlet {
  id: number;
  code: string;
  name: string;
  tx_count: number;
}

export default function ProfitabilityPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState<number | null>(null);
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [comparePeriod, setComparePeriod] = useState<string>('');
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/outlets')
      .then((r) => r.json())
      .then((d) => {
        setOutlets(d.outlets ?? []);
        const withData = (d.outlets ?? []).find((o: Outlet) => o.tx_count > 0);
        if (withData) setOutletId(withData.id);
        else if (d.outlets?.length) setOutletId(d.outlets[0].id);
        else setLoading(false);
      })
      .catch(() => setError('Gagal memuat daftar outlet.'));
  }, []);

  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/periods?outletId=${outletId}`)
      .then((r) => r.json())
      .then((d) => {
        const p: string[] = d.periods ?? [];
        setPeriods(p);
        if (p.length >= 2) {
          setPeriod(p[p.length - 1]);
          setComparePeriod(p[p.length - 2]);
        } else if (p.length === 1) {
          setPeriod(p[0]);
          setComparePeriod(p[0]);
        }
      });
  }, [outletId]);

  useEffect(() => {
    if (!outletId || !period || !comparePeriod) return;
    setLoading(true);
    setError(null);
    fetch(`/api/analysis?outletId=${outletId}&period=${period}&comparePeriod=${comparePeriod}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Gagal memuat analisa.');
        }
        return r.json();
      })
      .then((d) => setAnalysis(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [outletId, period, comparePeriod]);

  const otherPeriods = useMemo(() => periods.filter((p) => p !== period), [periods, period]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profitability Analysis</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Analisa kinerja keuangan untuk memahami pertumbuhan omzet, profit, dan faktor penyebabnya.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <FilterSelect
            label="Outlet"
            value={outletId ?? ''}
            onChange={(v) => setOutletId(Number(v))}
            options={outlets.map((o) => ({ value: o.id, label: o.name }))}
          />
          <FilterSelect
            label="Periode"
            value={period}
            onChange={setPeriod}
            options={periods.map((p) => ({ value: p, label: formatPeriodLabel(p) }))}
          />
          <FilterSelect
            label="Bandingkan dengan"
            value={comparePeriod}
            onChange={setComparePeriod}
            options={otherPeriods.map((p) => ({ value: p, label: formatPeriodLabel(p) }))}
          />
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm p-4 mb-6">{error}</div>
      )}

      {loading && !analysis && <div className="text-sm text-neutral-500">Memuat data...</div>}

      {!loading && !error && outlets.length === 0 && (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          Belum ada data. Silakan upload laporan keuangan terlebih dahulu di halaman{' '}
          <a href="/upload" className="text-emerald-600 underline">Upload Laporan</a>.
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard icon="📊" iconBg="bg-blue-100" label="Omzet" value={formatRupiahFull(analysis.current.revenue)} changePct={analysis.comparison.revenue.pct} />
            <KpiCard icon="💰" iconBg="bg-emerald-100" label="Gross Profit" value={formatRupiahFull(analysis.current.grossProfit)} changePct={analysis.comparison.grossProfit.pct} />
            <KpiCard icon="📈" iconBg="bg-red-100" label="Operating Profit" value={formatRupiahFull(analysis.current.operatingProfit)} changePct={analysis.comparison.operatingProfit.pct} />
            <KpiCard icon="%" iconBg="bg-red-100" label="Profit Margin" value={`${analysis.current.operatingMarginPct.toFixed(1)}%`} changePt={analysis.comparison.operatingMarginPt} />
          </div>

          <StatusCard classification={analysis.classification} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SalesProfitTrendChart trend={analysis.trend} />
            <ProfitBridgeChart bridge={analysis.bridge} currentPeriod={period} previousPeriod={comparePeriod} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <DriverRankingList drivers={analysis.drivers} />
            <ComparisonTable cmp={analysis.comparison} />
          </div>

          <MonthlyAnalysisPanel narrative={analysis.narrative} />

          {analysis.anomalies.length > 0 && (
            <div className="card p-4 sm:p-5">
              <div className="font-semibold text-sm mb-2">Anomaly Flags</div>
              <ul className="space-y-1.5 text-sm">
                {analysis.anomalies.map((a, i) => (
                  <li key={i} className={`flex items-start gap-2 ${a.level === 'high' ? 'text-red-600' : 'text-orange-600'}`}>
                    <span>{a.level === 'high' ? '🔴' : '🟠'}</span>
                    <span>{a.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <label className="text-xs text-neutral-500 flex flex-col gap-1">
      {label}
      <select
        className="border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white text-neutral-800 min-w-[160px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.length === 0 && <option value="">-</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
