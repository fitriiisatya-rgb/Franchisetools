import { formatPct, formatPt } from '@/lib/format';

interface KpiCardProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  changePct?: number | null;
  changePt?: number | null;
  invert?: boolean; // when true, a decrease is shown as positive (not used currently, kept for future cost KPIs)
}

export default function KpiCard({ icon, iconBg, label, value, changePct, changePt, invert }: KpiCardProps) {
  let changeText: string | null = null;
  let positive = true;
  if (changePct !== undefined && changePct !== null) {
    changeText = `${formatPct(changePct)} vs periode lalu`;
    positive = invert ? changePct <= 0 : changePct >= 0;
  } else if (changePt !== undefined && changePt !== null) {
    changeText = `${formatPt(changePt)} vs periode lalu`;
    positive = invert ? changePt <= 0 : changePt >= 0;
  }

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${iconBg}`}>{icon}</div>
        <div className="text-sm text-neutral-500">{label}</div>
      </div>
      <div className="text-2xl font-semibold tracking-tight truncate">{value}</div>
      {changeText && (
        <div className={`text-xs font-medium flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          <span>{positive ? '▲' : '▼'}</span>
          <span>{changeText}</span>
        </div>
      )}
    </div>
  );
}
