import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronRight, GitCompareArrows, LoaderCircle, Target } from 'lucide-react';

import type { DecisionFlowNode } from '../types';

/** Subtle cool tints; root = sky anchor, others cycle slate / indigo / teal mist. */
function decisionDepthClass(depth: number): string {
  if (depth === 0) {
    return 'decision-node-depth-root';
  }
  const c = ((depth - 1) % 3) + 1;
  return `decision-node-depth-${c}`;
}

export function DecisionNodeCard({ data }: NodeProps<DecisionFlowNode>) {
  const { node, isSelected, isCompareSelected, isCollapsed, isLoading, canCompare, canToggle, onSelect, onToggle, onCompareToggle } = data;
  const depthClass = decisionDepthClass(node.depth);

  return (
    <div
      className={[
        'glass-node-card node-card-glow relative w-[min(308px,86vw)] overflow-hidden rounded-2xl border p-4 text-left shadow-panel transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        depthClass,
        isSelected
          ? 'border-accent/50 shadow-glow ring-2 ring-accent/25'
          : 'border-slate-300/70 ring-1 ring-white/70 hover:scale-[1.015] hover:border-slate-400/75 hover:shadow-lg',
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
      <Handle type="target" position={Position.Top} className="!z-20 !h-2.5 !w-2.5 !border-2 !border-white/90 !bg-accent !shadow-sm" aria-hidden />

      <div className="relative z-[1]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">
              <span>{node.depth === 0 ? 'Root' : `Depth ${node.depth}`}</span>
              {node.depth === 0 ? (
                <span className="font-medium normal-case tracking-normal text-sky-800/85">Decision anchor</span>
              ) : null}
            </p>
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-textPrimary">{node.title}</h3>
          </div>
          {isCompareSelected ? (
            <span className="shrink-0 rounded-full border border-accent/45 bg-accentSoft px-2 py-1 text-[10px] font-semibold text-accent shadow-sm">
              Comparing
            </span>
          ) : null}
        </div>

        <p className="mb-4 line-clamp-5 text-sm leading-relaxed text-textSecondary">{node.description}</p>

        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-textMuted">
          Open to chat · {node.children.length} {node.children.length === 1 ? 'path' : 'paths'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white/70 px-3 py-2 text-xs font-medium text-textSecondary shadow-sm transition hover:border-accent/35 hover:bg-white hover:shadow-sm"
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
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isCompareSelected
                ? 'border-accent/45 bg-accentSoft text-accent'
                : 'border-slate-200/90 bg-white/70 text-textSecondary hover:border-accent/35 hover:bg-white hover:shadow-sm',
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
      </div>

      <Handle type="source" position={Position.Bottom} className="!z-20 !h-2.5 !w-2.5 !border-2 !border-white/90 !bg-accent !shadow-sm" aria-hidden />
    </div>
  );
}
