import { ArrowRight, ShieldAlert, TimerReset, TrendingUp, X } from 'lucide-react';

import type { DecisionNode } from '../types';
import { ScorePill } from './ScorePill';
import { Skeleton } from './Skeleton';

interface DecisionDetailsPanelProps {
  node: DecisionNode | null;
  className?: string;
  isLoading?: boolean;
}

interface DecisionDetailsContentProps {
  node: DecisionNode;
  onClose?: () => void;
}

export function DecisionDetailsContent({ node, onClose }: DecisionDetailsContentProps) {
  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Selected branch</p>
          <h2 className="text-lg font-semibold tracking-tight text-textPrimary">{node.title}</h2>
          <p className="mt-2 text-sm leading-7 text-textSecondary">{node.description}</p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="flex max-w-[200px] flex-wrap justify-end gap-2 sm:max-w-none">
            <ScorePill label="Risk" value={node.risk_score} tone={node.risk_score >= 7 ? 'warning' : 'neutral'} />
            <ScorePill label="Reward" value={node.reward_score} tone="positive" />
            <ScorePill label="Effort" value={node.effort_score} />
            <ScorePill label="Time" value={node.time_score} />
          </div>
          {onClose ? (
            <button
              type="button"
              aria-label="Close branch details"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/70 text-textSecondary shadow-sm transition hover:bg-white hover:text-textPrimary"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-inset rounded-2xl p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            Immediate action
          </p>
          <p className="text-sm leading-7 text-textSecondary">{node.immediate_action ?? 'Expand the branch to explore concrete next steps.'}</p>
        </div>
        <div className="glass-inset rounded-2xl p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Short-term
          </p>
          <p className="text-sm leading-7 text-textSecondary">{node.short_term_outcome ?? 'Outcome will appear after expansion.'}</p>
        </div>
        <div className="glass-inset rounded-2xl p-4 sm:col-span-2 lg:col-span-1">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
            <TimerReset className="h-3.5 w-3.5" aria-hidden />
            Long-term
          </p>
          <p className="text-sm leading-7 text-textSecondary">{node.long_term_outcome ?? 'Long-term consequences will appear after expansion.'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/75 p-4 sm:p-5">
        <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          Risks and uncertainty
        </p>
        <ul className="space-y-2 text-sm leading-7 text-amber-950">
          {node.risks.length > 0 ? node.risks.map((risk) => <li key={risk}>• {risk}</li>) : <li>• No explicit risks captured yet.</li>}
        </ul>
        {node.uncertainty ? <p className="mt-3 text-sm leading-7 text-amber-900/90">{node.uncertainty}</p> : null}
      </div>
    </>
  );
}

export function DecisionDetailsPanel({ node, className = '', isLoading = false }: DecisionDetailsPanelProps) {
  if (isLoading) {
    return (
      <section className={`surface-panel p-5 sm:p-6 ${className}`} aria-busy="true" aria-label="Loading branch details">
        <div className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!node) {
    return (
      <section className={`surface-panel p-5 sm:p-6 ${className}`}>
        <h2 className="text-lg font-semibold tracking-tight text-textPrimary">Selected branch</h2>
        <p className="mt-3 text-sm leading-relaxed text-textMuted">Select a branch in the tree to inspect actions, outcomes, and risk.</p>
      </section>
    );
  }

  return (
    <section className={`surface-panel p-5 sm:p-6 ${className}`} aria-label="Branch details">
      <DecisionDetailsContent node={node} />
    </section>
  );
}

interface MobileBranchDrawerProps {
  open: boolean;
  node: DecisionNode | null;
  isLoading?: boolean;
  onClose: () => void;
}

export function MobileBranchDrawer({ open, node, isLoading = false, onClose }: MobileBranchDrawerProps) {
  return (
    <div className={`xl:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        className={['fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0'].join(' ')}
        onClick={onClose}
        aria-label="Close panel"
      />

      <div
        className={[
          'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/60 bg-white/85 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 scrollbar-subtle',
          open ? 'translate-y-0 animate-slide-up-fade' : 'translate-y-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-branch-drawer-title"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300/90" aria-hidden />
        <h2 id="mobile-branch-drawer-title" className="sr-only">
          Branch details
        </h2>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 rounded-2xl" />
            <div className="grid gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </div>
        ) : node ? (
          <DecisionDetailsContent node={node} onClose={onClose} />
        ) : (
          <div className="pb-4">
            <div className="mb-2 text-lg font-semibold text-textPrimary">Selected branch</div>
            <p className="text-sm leading-7 text-textMuted">Tap a branch card in the tree to inspect it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
