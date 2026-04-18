import { ArrowLeft, GitBranchPlus, LoaderCircle, MessageSquareMore, Sparkles } from 'lucide-react';
import { useState } from 'react';

import type { ConversationMessage, DecisionNode } from '../types';
import { Skeleton } from './Skeleton';

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

  const submit = async () => {
    if (!draft.trim() || isSending) {
      return;
    }
    const nextMessage = draft;
    setDraft('');
    await onSendMessage(nextMessage);
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
        <div className="glass-inset flex min-h-[min(70vh,640px)] flex-col p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-900">
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

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-[82%] rounded-2xl" />
              <Skeleton className="ml-auto h-20 w-[70%] rounded-2xl" />
              <Skeleton className="h-24 w-[78%] rounded-2xl" />
            </div>
          ) : messages.length > 0 ? (
            <div className="scrollbar-subtle flex max-h-[min(52vh,520px)] flex-col gap-3 overflow-y-auto pr-1 sm:gap-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    'max-w-[min(92%,36rem)] rounded-2xl border px-4 py-3 text-sm leading-7 shadow-sm sm:px-4 sm:py-3.5',
                    message.role === 'assistant'
                      ? 'border-white/80 bg-white/85 text-textPrimary'
                      : 'ml-auto border-accent/25 bg-accentSoft text-textPrimary',
                  ].join(' ')}
                >
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                    {message.role === 'assistant' ? 'Thinkr' : 'You'}
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[min(48vh,400px)] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-sky-200/60 bg-white/40 px-4 text-center">
              <div className="rounded-full border border-violet-200/80 bg-violet-50/90 p-3 text-violet-700" aria-hidden>
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-textPrimary sm:text-lg">Start the thread for this branch</h3>
              <p className="mt-2 max-w-md text-sm leading-7 text-textMuted">
                Ask Thinkr to stress-test assumptions or outline next moves before you branch.
              </p>
            </div>
          )}

          <div className="mt-auto border-t border-white/50 pt-4">
            <label htmlFor="chat-draft" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Challenge assumptions, ask for angles, or outline the next move…"
              rows={4}
              className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-3 text-[15px] leading-7 text-textPrimary outline-none transition placeholder:text-textMuted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-xs leading-6 text-textMuted">Messages stay on this node; lineage is summarized on the right.</p>
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim() || isSending}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-inset p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-textMuted">Lineage summary</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-textSecondary">
              {ancestorContextSummary || 'Select a node to load context from the root problem.'}
            </p>
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
