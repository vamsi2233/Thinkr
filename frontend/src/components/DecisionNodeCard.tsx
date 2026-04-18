import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronRight, GitCompareArrows, LoaderCircle, Target } from 'lucide-react';

import type { DecisionFlowNode } from '../types';
import { ScorePill } from './ScorePill';

export function DecisionNodeCard({ data }: NodeProps<DecisionFlowNode>) {
  const { node, isSelected, isCompareSelected, isCollapsed, isLoading, canCompare, canToggle, onSelect, onToggle, onCompareToggle } = data;

  return (
    <div
      className={[
        'glass-node-card node-card-glow w-[min(300px,85vw)] rounded-2xl border p-4 text-left shadow-panel transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        isSelected ? 'border-accent/45 shadow-glow ring-1 ring-accent/30' : 'border-white/60 hover:-translate-y-0.5 hover:border-accent/35',
      ].join(' ')}
      onClick={() => onSelect(node.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${node.title}, depth ${node.depth}. ${isSelected ? 'Selected' : 'Select to open chat'}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-0 !bg-accent" aria-hidden />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">Depth {node.depth}</p>
          <h3 className="text-sm font-semibold leading-snug text-textPrimary">{node.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-sky-200/70 bg-white/70 px-2 py-1 text-[10px] font-medium text-sky-800 shadow-sm backdrop-blur-sm">
          {isCompareSelected ? 'Comparing' : `Reward ${node.reward_score}`}
        </span>
      </div>

      <p className="mb-3 line-clamp-3 text-xs leading-6 text-textSecondary">{node.description}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        <ScorePill label="Risk" value={node.risk_score} tone={node.risk_score >= 7 ? 'warning' : 'neutral'} />
        <ScorePill label="Reward" value={node.reward_score} tone="positive" />
        <ScorePill label="Effort" value={node.effort_score} />
      </div>

      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-textMuted">
        Open to chat · Time {node.time_score}/10 · {node.children.length} paths
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-xs font-medium text-textSecondary transition hover:border-accent/30 hover:bg-white/85"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node.id);
          }}
          disabled={!canToggle || isLoading}
        >
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : isCollapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          {node.children.length > 0 ? (isCollapsed ? 'Show' : 'Hide') : 'Leaf'}
        </button>

        <button
          type="button"
          className={[
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            isCompareSelected ? 'border-accent/40 bg-accentSoft text-accent' : 'border-white/70 bg-white/55 text-textSecondary hover:border-accent/30 hover:bg-white/85',
          ].join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onCompareToggle(node.id);
          }}
          disabled={!canCompare}
          title={canCompare ? 'Select for comparison' : 'Root cannot be compared'}
          aria-pressed={isCompareSelected}
        >
          {isCompareSelected ? <Target className="h-4 w-4" aria-hidden /> : <GitCompareArrows className="h-4 w-4" aria-hidden />}
          Compare
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-0 !bg-accent" aria-hidden />
    </div>
  );
}
