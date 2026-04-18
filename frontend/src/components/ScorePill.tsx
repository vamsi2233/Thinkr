interface ScorePillProps {
  label: string;
  value: number;
  tone?: 'neutral' | 'positive' | 'warning';
}

const toneClasses: Record<NonNullable<ScorePillProps['tone']>, string> = {
  neutral: 'border-slate-200/90 bg-white/75 text-slate-700',
  positive: 'border-emerald-200/80 bg-emerald-50/85 text-emerald-800',
  warning: 'border-amber-200/80 bg-amber-50/85 text-amber-900',
};

export function ScorePill({ label, value, tone = 'neutral' }: ScorePillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums tracking-wide shadow-sm ${toneClasses[tone]}`}
    >
      {label} {value}/10
    </span>
  );
}
