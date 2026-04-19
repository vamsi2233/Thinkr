import { ArrowLeft, ChevronDown, ChevronRight, GitBranchPlus, LoaderCircle, MessageSquareMore, Send, Sparkles, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ConversationMessage, DecisionNode } from '../types';
import { ChatMessageMarkdown } from './ChatMessageMarkdown';
import { Skeleton } from './Skeleton';

type LineageStepDepth = 'root' | number;

interface LineageStep {
  depth: LineageStepDepth;
  label: string;
  body: string;
}

/** Parses `build_ancestor_context_summary` output (depth lines use title TAB description; legacy lines used ": "). */
function parseLineageSummary(text: string): LineageStep[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const steps: LineageStep[] = [];
  for (const line of trimmed.split('\n')) {
    const rootPrefix = 'Root problem:';
    if (line.startsWith(rootPrefix)) {
      steps.push({
        depth: 'root',
        label: 'Root problem',
        body: line.slice(rootPrefix.length).trim(),
      });
      continue;
    }

    const depthMatch = line.match(/^Depth (\d+) - (.+)$/);
    if (depthMatch) {
      const depthNum = Number.parseInt(depthMatch[1], 10);
      const rest = depthMatch[2];
      const tabIdx = rest.indexOf('\t');
      if (tabIdx >= 0) {
        steps.push({
          depth: depthNum,
          label: rest.slice(0, tabIdx).trim(),
          body: rest.slice(tabIdx + 1).trim(),
        });
        continue;
      }
      const colonSep = ': ';
      const colonIdx = rest.lastIndexOf(colonSep);
      if (colonIdx >= 0) {
        steps.push({
          depth: depthNum,
          label: rest.slice(0, colonIdx).trim(),
          body: rest.slice(colonIdx + colonSep.length).trim(),
        });
      } else {
        steps.push({ depth: depthNum, label: 'Branch', body: rest.trim() });
      }
      continue;
    }

    steps.push({ depth: 'root', label: 'Context', body: line.trim() });
  }

  return steps;
}

function lineageCardClass(depth: LineageStepDepth): string {
  if (depth === 'root') {
    return 'border-l-[5px] border-l-sky-500 border border-sky-200/75 bg-gradient-to-br from-sky-50/90 via-white/70 to-white/50 shadow-sm';
  }
  const ring = [
    'border-l-[5px] border-l-violet-500 border border-violet-200/70 bg-gradient-to-br from-violet-50/85 via-white/65 to-white/45 shadow-sm',
    'border-l-[5px] border-l-teal-500 border border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-white/65 to-white/45 shadow-sm',
    'border-l-[5px] border-l-amber-500 border border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-white/65 to-white/45 shadow-sm',
    'border-l-[5px] border-l-rose-500 border border-rose-200/70 bg-gradient-to-br from-rose-50/75 via-white/65 to-white/45 shadow-sm',
  ];
  return ring[Math.max(0, depth - 1) % ring.length];
}

function lineageStatement(step: LineageStep): string {
  if (step.depth === 'root' && step.label === 'Root problem') {
    return step.body.trim() || step.label;
  }
  if (typeof step.depth === 'number') {
    return step.label.trim() || 'Branch';
  }
  return step.body.trim() || step.label.trim() || 'Context';
}

function LineageStepCards({ steps }: { steps: LineageStep[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  if (steps.length === 0) {
    return <p className="text-sm leading-7 text-textMuted">No lineage loaded yet.</p>;
  }

  return (
    <ol className="flex list-none flex-col gap-3 p-0">
      {steps.map((step, index) => {
        const depthLabel = step.depth === 'root' ? 'Root' : `Depth ${step.depth}`;
        const indent = step.depth === 'root' ? 0 : Math.min((step.depth as number) - 1, 5) * 10;
        const statement = lineageStatement(step);
        const description = step.body.trim();
        const isRootProblem = step.depth === 'root' && step.label === 'Root problem';
        const isOpen = expanded.has(index);
        const canExpandDepth = typeof step.depth === 'number' && description.length > 0;
        const showExpand = canExpandDepth;

        return (
          <li key={`${depthLabel}-${index}-${step.label.slice(0, 24)}`} style={{ marginLeft: indent }} className="relative">
            <div className={`rounded-2xl px-3 py-3 sm:px-4 sm:py-3.5 ${lineageCardClass(step.depth)}`}>
              <div className="flex gap-1">
                {showExpand ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Collapse description' : 'Expand description'}
                    onClick={() => toggle(index)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-textSecondary transition hover:bg-white/60"
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                  </button>
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/80 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-textMuted shadow-sm">
                      {depthLabel}
                    </span>
                  </div>

                  {isRootProblem ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-textPrimary">{statement}</p>
                  ) : showExpand ? (
                    <>
                      <button
                        type="button"
                        className="mt-1 w-full rounded-lg py-1.5 text-left transition hover:bg-white/45"
                        onClick={() => toggle(index)}
                        aria-expanded={isOpen}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-textPrimary">{statement}</p>
                      </button>
                      {isOpen ? (
                        <div className="mt-2 border-t border-white/50 pt-2">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-textSecondary">{description}</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-textPrimary">{statement}</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface ChatWorkspaceProps {
  node: DecisionNode | null;
  ancestorContextSummary: string;
  messages: ConversationMessage[];
  suggestedPerspectives: string[];
  isLoading: boolean;
  isSending: boolean;
  isBranching: boolean;
  onBackToGraph: () => void;
  onSendMessage: (message: string) => Promise<void> | void;
  onCreateBranches: () => Promise<void> | void;
}

export function ChatWorkspace({
  node,
  ancestorContextSummary,
  messages,
  suggestedPerspectives,
  isLoading,
  isSending,
  isBranching,
  onBackToGraph,
  onSendMessage,
  onCreateBranches,
}: ChatWorkspaceProps) {
  const [draft, setDraft] = useState('');
  const [lineageOpen, setLineageOpen] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const lineageSteps = useMemo(() => parseLineageSummary(ancestorContextSummary), [ancestorContextSummary]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const submit = async () => {
    if (!draft.trim() || isSending) {
      return;
    }
    const nextMessage = draft;
    setDraft('');
    await onSendMessage(nextMessage);
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section className="surface-panel overflow-hidden" aria-label="Conversation workspace">
      <div className="flex flex-col gap-4 border-b border-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Conversation</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-textPrimary">{node ? node.title : 'Open a node to start chatting'}</h2>
          <p className="mt-1 text-sm leading-relaxed text-textMuted">
            Explore this branch strategically, then split only when a perspective deserves its own path.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToGraph}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-medium text-textPrimary shadow-sm transition hover:bg-white sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Graph view
        </button>
      </div>

      <div className="grid gap-5 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] xl:gap-6">
        <div className="glass-inset relative flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
          <div className="flex shrink-0 flex-col gap-3 border-b border-white/50 bg-white/35 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-900 shadow-sm">
              <MessageSquareMore className="h-3.5 w-3.5" aria-hidden />
              Partner
            </div>
            <button
              type="button"
              onClick={onCreateBranches}
              disabled={!node || isBranching}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
            >
              {isBranching ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <GitBranchPlus className="h-4 w-4" aria-hidden />}
              Top 4 branches
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-50/90 via-white/50 to-slate-50/80">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.22) 1px, transparent 0)`,
                backgroundSize: '20px 20px',
              }}
              aria-hidden
            />

            {isLoading ? (
              <div className="relative z-[1] flex flex-1 flex-col justify-center gap-4 p-5">
                <Skeleton className="h-24 w-[88%] rounded-2xl rounded-tl-md shadow-sm" />
                <Skeleton className="ml-auto h-20 w-[72%] rounded-2xl rounded-tr-md shadow-sm" />
                <Skeleton className="h-28 w-[80%] rounded-2xl rounded-tl-md shadow-sm" />
              </div>
            ) : messages.length > 0 ? (
              <div className="scrollbar-subtle relative z-[1] flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-5 sm:px-5 sm:py-6">
                {messages.map((message) =>
                  message.role === 'assistant' ? (
                    <div key={message.id} className="flex gap-3 sm:gap-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md ring-2 ring-white/80 sm:h-10 sm:w-10"
                        aria-hidden
                      >
                        <Sparkles className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                      </div>
                      <article className="min-w-0 max-w-[min(100%,42rem)] flex-1 rounded-2xl rounded-tl-md border border-white/90 bg-white/95 px-4 py-3.5 text-[15px] leading-[1.65] text-textPrimary shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] sm:px-5 sm:py-4">
                        <p className="sr-only">Thinkr</p>
                        <ChatMessageMarkdown content={message.content} variant="assistant" />
                      </article>
                    </div>
                  ) : (
                    <div key={message.id} className="flex flex-row-reverse gap-3 sm:gap-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white text-slate-600 shadow-md ring-2 ring-slate-200/80 sm:h-10 sm:w-10"
                        aria-hidden
                      >
                        <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                      </div>
                      <article className="min-w-0 max-w-[min(100%,34rem)] flex-1 rounded-2xl rounded-tr-md border border-sky-600/25 bg-gradient-to-br from-accent to-[#2563eb] px-4 py-3.5 text-[15px] leading-[1.65] text-white shadow-md shadow-slate-900/15 sm:px-5 sm:py-4">
                        <p className="sr-only">You</p>
                        <ChatMessageMarkdown content={message.content} variant="user" />
                      </article>
                    </div>
                  ),
                )}
                <div ref={listEndRef} className="h-px shrink-0" aria-hidden />
              </div>
            ) : (
              <div className="relative z-[1] flex min-h-[min(44vh,360px)] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-violet-500/20 text-sky-700 shadow-inner ring-1 ring-white/80" aria-hidden>
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-textPrimary">Start the thread for this branch</h3>
                <p className="mt-2 max-w-sm text-sm leading-7 text-textMuted">
                  Ask Thinkr to stress-test assumptions or outline next moves before you branch.
                </p>
              </div>
            )}

            <div className="relative z-[1] shrink-0 border-t border-white/60 bg-white/80 p-3 backdrop-blur-md sm:p-4">
              <label htmlFor="chat-draft" className="sr-only">
                Message
              </label>
              <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03] transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <textarea
                  id="chat-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Message Thinkr…"
                  rows={3}
                  className="max-h-[200px] min-h-[88px] w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-3.5 pb-14 pr-4 text-[15px] leading-relaxed text-textPrimary outline-none placeholder:text-textMuted/60 sm:min-h-[96px] sm:px-4 sm:py-4 sm:pb-14"
                />
                <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 sm:bottom-3.5 sm:right-3.5">
                  <span className="pointer-events-auto hidden text-[11px] text-textMuted sm:inline">Enter to send · Shift+Enter for newline</span>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!draft.trim() || isSending}
                    title="Send message"
                    aria-label="Send message"
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-md transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11"
                  >
                    {isSending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden strokeWidth={2} />}
                  </button>
                </div>
              </div>
              <p className="mt-2 px-0.5 text-center text-[11px] leading-5 text-textMuted sm:text-left">
                Thread is saved on this node. Lineage on the right for full path context.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-inset overflow-hidden rounded-2xl p-0">
            <button
              type="button"
              onClick={() => setLineageOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/40"
              aria-expanded={lineageOpen}
              aria-controls="chat-lineage-panel"
              id="chat-lineage-toggle"
            >
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Lineage summary</span>
                <span className="mt-0.5 block text-xs text-textMuted">{lineageOpen ? 'Hide full path' : 'Show full path from root'}</span>
              </span>
              <ChevronDown
                className={['h-5 w-5 shrink-0 text-textSecondary transition-transform', lineageOpen ? 'rotate-180' : ''].join(' ')}
                aria-hidden
              />
            </button>
            {lineageOpen ? (
              <div id="chat-lineage-panel" className="border-t border-white/50 px-4 pb-5 pt-4 sm:px-5" role="region" aria-labelledby="chat-lineage-toggle">
                {lineageSteps.length > 0 ? (
                  <LineageStepCards steps={lineageSteps} />
                ) : (
                  <p className="text-sm leading-7 text-textSecondary">Select a node to load context from the root problem.</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="glass-inset p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Suggested angles</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedPerspectives.length > 0 ? (
                suggestedPerspectives.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setDraft(suggestion)}
                    className="rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-2 text-left text-xs leading-5 text-violet-900 transition hover:border-violet-300 hover:bg-violet-100/90"
                  >
                    {suggestion}
                  </button>
                ))
              ) : (
                <p className="text-sm leading-7 text-textMuted">Angles appear here after the first replies.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
