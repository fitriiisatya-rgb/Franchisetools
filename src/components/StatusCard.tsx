import type { Classification } from '@/lib/engine/classificationEngine';

const SEVERITY_STYLE: Record<Classification['severity'], { bg: string; border: string; icon: string; text: string }> = {
  positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅', text: 'text-emerald-800' },
  warning: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚠️', text: 'text-orange-800' },
  negative: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚠️', text: 'text-orange-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ️', text: 'text-blue-800' },
};

export default function StatusCard({ classification }: { classification: Classification }) {
  const style = SEVERITY_STYLE[classification.severity];
  return (
    <div className={`card ${style.bg} ${style.border} p-4 flex gap-3 items-start`}>
      <div className="text-xl leading-none pt-0.5">{style.icon}</div>
      <div className="min-w-0">
        <div className={`font-semibold text-sm ${style.text}`}>{classification.title}</div>
        <div className={`text-sm mt-0.5 ${style.text} opacity-90`}>{classification.description}</div>
      </div>
    </div>
  );
}
