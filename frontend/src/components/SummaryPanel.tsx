import { AlertTriangle, Compass, Lightbulb } from 'lucide-react';

import type { QuickSummary } from '../types';
import { Skeleton } from './Skeleton';

interface SummaryPanelProps {
  summary: QuickSummary | null;
  clarifyingQuestions: string[];
  message?: string | null;
  isLoading?: boolean;
}

export function SummaryPanel({ summary, clarifyingQuestions, message, isLoading = false }: SummaryPanelProps) {
  return (
    <section className="surface-panel summary-spotlight p-5 sm:p-6 lg:p-7" aria-labelledby="exec-summary-heading">
      <div className="mb-5 flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-200/80 bg-sky-50/90 text-accent shadow-sm" aria-hidden>
          <Compass className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="exec-summary-heading" className="text-lg font-semibold tracking-tight text-textPrimary">
            Executive summary
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-textMuted">Recommendation first, uncertainty explicit.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : summary ? (
        <div className="space-y-4 text-sm leading-relaxed">
          <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/95 via-white to-white/90 p-5 sm:p-6">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800">Headline</p>
            <p className="text-base font-medium leading-7 text-textPrimary sm:text-[1.0625rem] sm:leading-8">{summary.headline}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-white/95 p-5 sm:p-6">
              <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                Recommended path
              </p>
              <p className="text-sm leading-7 text-textSecondary">{summary.recommended_path}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-white/95 p-5 sm:p-6">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">Why it leads</p>
              <p className="text-sm leading-7 text-textSecondary">{summary.rationale}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/95 to-white/90 p-5 text-amber-950 sm:p-6">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Uncertainty
            </p>
            <p className="text-sm leading-7">{summary.uncertainty_note}</p>
          </div>
        </div>
      ) : clarifyingQuestions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-textSecondary">{message ?? 'Thinkr needs a bit more context before building the tree.'}</p>
          <ul className="space-y-2.5" role="list">
            {clarifyingQuestions.map((question) => (
              <li
                key={question}
                className="rounded-xl border border-violet-200/60 bg-violet-50/50 px-4 py-3.5 text-sm leading-7 text-textPrimary shadow-sm"
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-textMuted">Submit a decision to generate a top-level recommendation and branch map.</p>
      )}
    </section>
  );
}
