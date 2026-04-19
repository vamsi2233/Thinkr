import { X } from 'lucide-react';

import type { BranchPreview, DecisionNode } from '../types';
import { BranchSuggestionList } from './BranchSuggestionList';
import { Skeleton } from './Skeleton';

interface DecisionDetailsPanelProps {
  node: DecisionNode | null;
  className?: string;
  isLoading?: boolean;
  branchPreviews?: BranchPreview[];
  materializingPreviewId?: string | null;
  onMaterializePreview?: (previewId: string, parentNodeId: string) => void | Promise<void>;
}

interface DecisionDetailsContentProps {
  node: DecisionNode;
  onClose?: () => void;
  branchPreviews?: BranchPreview[];
  materializingPreviewId?: string | null;
  onMaterializePreview?: (previewId: string, parentNodeId: string) => void | Promise<void>;
}

export function DecisionDetailsContent({
  node,
  onClose,
  branchPreviews = [],
  materializingPreviewId = null,
  onMaterializePreview,
}: DecisionDetailsContentProps) {
  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Selected branch</p>
          <h2 className="text-lg font-semibold tracking-tight text-textPrimary">{node.title}</h2>
          <p className="mt-2 text-sm leading-7 text-textSecondary">{node.description}</p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <span className="rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-900">
            Depth {node.depth}
          </span>
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

      <div className="glass-inset mb-5 rounded-2xl p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Top branch suggestions</p>
        <p className="mt-1 text-xs leading-5 text-textMuted">From this node&apos;s conversation — adds one child to the map.</p>
        <div className="mt-3">
          {onMaterializePreview ? (
            <BranchSuggestionList
              previews={branchPreviews}
              parentNodeId={node.id}
              materializingId={materializingPreviewId}
              onMaterialize={onMaterializePreview}
              emptyHint="Open chat on this branch or load the thread to generate suggestions."
            />
          ) : (
            <p className="text-sm leading-7 text-textMuted">Suggestions appear when conversation data is loaded.</p>
          )}
        </div>
      </div>
    </>
  );
}

export function DecisionDetailsPanel({
  node,
  className = '',
  isLoading = false,
  branchPreviews = [],
  materializingPreviewId = null,
  onMaterializePreview,
}: DecisionDetailsPanelProps) {
  if (isLoading) {
    return (
      <section className={`surface-panel p-5 sm:p-6 ${className}`} aria-busy="true" aria-label="Loading branch details">
        <div className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!node) {
    return (
      <section className={`surface-panel p-5 sm:p-6 ${className}`}>
        <h2 className="text-lg font-semibold tracking-tight text-textPrimary">Selected branch</h2>
        <p className="mt-3 text-sm leading-relaxed text-textMuted">Select a branch in the tree to inspect it and add paths from chat.</p>
      </section>
    );
  }

  return (
    <section className={`surface-panel p-5 sm:p-6 ${className}`} aria-label="Branch details">
      <DecisionDetailsContent
        node={node}
        branchPreviews={branchPreviews}
        materializingPreviewId={materializingPreviewId}
        onMaterializePreview={onMaterializePreview}
      />
    </section>
  );
}

interface MobileBranchDrawerProps {
  open: boolean;
  node: DecisionNode | null;
  isLoading?: boolean;
  onClose: () => void;
  branchPreviews?: BranchPreview[];
  materializingPreviewId?: string | null;
  onMaterializePreview?: (previewId: string, parentNodeId: string) => void | Promise<void>;
}

export function MobileBranchDrawer({
  open,
  node,
  isLoading = false,
  onClose,
  branchPreviews = [],
  materializingPreviewId = null,
  onMaterializePreview,
}: MobileBranchDrawerProps) {
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
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : node ? (
          <DecisionDetailsContent
            node={node}
            onClose={onClose}
            branchPreviews={branchPreviews}
            materializingPreviewId={materializingPreviewId}
            onMaterializePreview={onMaterializePreview}
          />
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
