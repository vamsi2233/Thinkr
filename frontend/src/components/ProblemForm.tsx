import { ChevronRight, LoaderCircle, Sparkles } from 'lucide-react';

interface ProblemFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel?: string;
}

export function ProblemForm({ value, onChange, onSubmit, isLoading, submitLabel = 'Analyze decision' }: ProblemFormProps) {
  const examples = [
    'Should I expand my business to a new city?',
    'Should our startup raise now or wait six months?',
    'Should I hire two generalists or one senior specialist?',
  ];

  return (
    <section className="surface-panel hero-glow p-5 sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-end lg:gap-10">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-800">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            For founders and operators
          </p>
          <h2 className="max-w-2xl text-display-sm text-textPrimary sm:text-display">
            From fuzzy tradeoffs to a clear branch map.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-textSecondary sm:text-[15px] sm:leading-8">
            Start with one decision, reason with AI on each node, and branch only when a path deserves its own thread.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border border-white/70 bg-white/55 px-3.5 py-2 text-left text-xs leading-snug text-textSecondary shadow-sm backdrop-blur-sm transition hover:border-sky-200/80 hover:bg-white hover:text-sky-900"
                onClick={() => onChange(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-inset p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-textMuted">How it flows</p>
          <ol className="mt-4 list-none space-y-3.5 p-0">
            {['Frame the root decision', 'Chat on any branch', 'Compare before you commit'].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accentSoft text-xs font-bold text-accent" aria-hidden>
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-textSecondary">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8 grid gap-5 border-t border-white/40 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(200px,220px)] lg:items-end lg:gap-6">
        <label className="block min-w-0">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-textMuted">Decision prompt</span>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Should I expand my business to a new city?"
            rows={5}
            className="min-h-[140px] w-full resize-y rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3.5 text-[15px] leading-7 text-textPrimary shadow-sm outline-none transition placeholder:text-textMuted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <div className="flex flex-col justify-end gap-4">
          <div className="glass-inset hidden rounded-2xl p-4 text-sm leading-6 text-textSecondary sm:block">
            Best for expansion, hiring, roadmap bets, and any fork where the downside matters.
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accentHover hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
          >
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            {submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
