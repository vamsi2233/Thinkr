import { ChevronRight, GitBranchPlus, LoaderCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { BranchPreview } from '../types';

interface BranchSuggestionListProps {
  previews: BranchPreview[];
  parentNodeId: string;
  materializingId: string | null;
  onMaterialize: (previewId: string, parentNodeId: string) => void | Promise<void>;
  emptyHint: string;
}

export function BranchSuggestionList({
  previews,
  parentNodeId,
  materializingId,
  onMaterialize,
  emptyHint,
}: BranchSuggestionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (previews.length === 0) {
    return <p className="text-sm leading-7 text-textMuted">{emptyHint}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {previews.map((preview) => {
        const busy = materializingId === preview.id;
        const expanded = expandedIds.has(preview.id);
        const hasDescription = Boolean(preview.description?.trim());

        return (
          <li key={preview.id}>
            <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-3 shadow-sm transition hover:border-violet-300 hover:bg-violet-100/90 sm:p-4">
              <div className="flex gap-1">
                {hasDescription ? (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse branch details' : 'Expand branch details'}
                    disabled={Boolean(materializingId)}
                    onClick={() => toggleExpanded(preview.id)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-violet-900 transition hover:bg-violet-200/40 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    {hasDescription ? (
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-xl py-2 pr-1 text-left transition hover:bg-violet-200/35 disabled:cursor-not-allowed disabled:opacity-55"
                        onClick={() => toggleExpanded(preview.id)}
                        disabled={Boolean(materializingId)}
                        aria-expanded={expanded}
                      >
                        <p className="text-sm font-semibold leading-snug text-violet-900">{preview.title}</p>
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1 py-2 pr-1 text-left">
                        <p className="text-sm font-semibold leading-snug text-violet-900">{preview.title}</p>
                        <p className="mt-1 text-xs leading-5 text-violet-800/75">No extra detail for this suggestion.</p>
                      </div>
                    )}
                    <button
                      type="button"
                      title="Add branch"
                      aria-label="Add branch"
                      disabled={Boolean(materializingId)}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onMaterialize(preview.id, parentNodeId);
                      }}
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-xl bg-accent text-white shadow-md transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busy ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-white" aria-hidden />
                      ) : (
                        <GitBranchPlus className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>

                  {expanded && hasDescription ? (
                    <p className="mt-1 border-t border-violet-200/70 pt-3 text-xs leading-6 text-violet-900">
                      {preview.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
