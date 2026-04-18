import { GitCompareArrows, LoaderCircle, Trophy } from 'lucide-react';

import type { ComparisonResult, DecisionNode } from '../types';
import { ScorePill } from './ScorePill';
import { Skeleton } from './Skeleton';

interface ComparisonPanelProps {
  selectedNodes: DecisionNode[];
  comparison: ComparisonResult | null;
  isLoading: boolean;
}

export function ComparisonPanel({ selectedNodes, comparison, isLoading }: ComparisonPanelProps) {
  const bestForLabels = [
    { title: 'Best for speed', matcher: (item: NonNullable<ComparisonPanelProps['comparison']>['items'][number]) => item.time_score <= 4 },
    { title: 'Best for upside', matcher: (item: NonNullable<ComparisonPanelProps['comparison']>['items'][number]) => item.reward_score >= 8 },
    { title: 'Best for caution', matcher: (item: NonNullable<ComparisonPanelProps['comparison']>['items'][number]) => item.risk_score <= 4 },
  ];

  return (
    <section className="surface-panel p-5 sm:p-6" aria-labelledby="compare-heading">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50/90 text-violet-700 shadow-sm" aria-hidden>
          <GitCompareArrows className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="compare-heading" className="text-lg font-semibold tracking-tight text-textPrimary">
            Branch comparison
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-textMuted">Pick 2–3 non-root branches to compare tradeoffs.</p>
        </div>
      </div>

      {selectedNodes.length < 2 ? (
        <p className="text-sm leading-relaxed text-textMuted">Select at least two branches in the map to compare.</p>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="glass-inset inline-flex items-center gap-2 px-4 py-3 text-sm text-textSecondary">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Comparing…
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
          </div>
        </div>
      ) : comparison ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 text-emerald-950 sm:p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              Recommendation
            </p>
            <p className="text-sm leading-7">{comparison.recommendation_summary}</p>
            {comparison.caution ? <p className="mt-2 text-sm leading-7 text-emerald-900/85">{comparison.caution}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {bestForLabels.map(({ title, matcher }) => {
              const match = comparison.items.find(matcher) ?? comparison.items[0];
              return (
                <span key={title} className="glass-chip text-[11px]">
                  {title}: <span className="font-semibold text-textPrimary">{match.title}</span>
                </span>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {comparison.items.map((item) => (
              <article
                key={item.node_id}
                className={[
                  'rounded-2xl border p-4 sm:p-5',
                  item.node_id === comparison.recommended_node_id
                    ? 'border-accent/40 bg-accentSoft shadow-glow'
                    : 'border-white/60 bg-white/55 shadow-sm backdrop-blur-sm',
                ].join(' ')}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-textPrimary">{item.title}</h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">{item.verdict}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-white/80 px-2 py-1 text-[11px] font-medium text-textSecondary">
                    {item.weighted_score}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <ScorePill label="Risk" value={item.risk_score} tone={item.risk_score >= 7 ? 'warning' : 'neutral'} />
                  <ScorePill label="Reward" value={item.reward_score} tone="positive" />
                  <ScorePill label="Effort" value={item.effort_score} />
                  <ScorePill label="Time" value={item.time_score} />
                </div>
                <p className="mb-2 text-sm leading-7 text-textSecondary">{item.short_term_outcome}</p>
                <p className="text-sm leading-7 text-textMuted">{item.long_term_outcome}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-textMuted">Comparison is not available yet.</p>
      )}
    </section>
  );
}
