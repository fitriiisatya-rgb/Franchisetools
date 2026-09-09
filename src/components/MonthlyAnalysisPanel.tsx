import type { NarrativePoint } from '@/lib/engine/narrativeEngine';

const TONE_ICON: Record<NarrativePoint['tone'], string> = {
  positive: '✅',
  negative: '🔴',
  neutral: '⚪',
  info: '🔵',
};

export default function MonthlyAnalysisPanel({ narrative }: { narrative: NarrativePoint[] }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3">
        <div className="font-semibold text-sm">Analisa Bulanan</div>
      </div>
      <ul className="space-y-2.5">
        {narrative.map((n, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
            <span className="shrink-0 leading-none pt-0.5">{TONE_ICON[n.tone]}</span>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
