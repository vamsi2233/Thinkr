import type { Edge, NodeChange, XYPosition } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { ChatWorkspace } from './components/ChatWorkspace';
import { ComparisonPanel } from './components/ComparisonPanel';
import { DecisionDetailsPanel } from './components/DecisionDetailsPanel';
import { DecisionTree } from './components/DecisionTree';
import { ProblemForm } from './components/ProblemForm';
import { SummaryPanel } from './components/SummaryPanel';
import { buildEdges, hiddenDescendants, layoutDecisionTree } from './lib/layout';
import { useThinkr } from './hooks/useThinkr';
import type { DecisionFlowNode } from './types';

function App() {
  const {
    problem,
    setProblem,
    nodes,
    summary,
    clarifyingQuestions,
    selectedNodeId,
    setSelectedNodeId,
    collapsedNodeIds,
    selectedCompareIds,
    selectedCompareNodes,
    comparison,
    isComparing,
    isAnalyzing,
    statusMessage,
    errorMessage,
    selectedNode,
    analyze,
    toggleNodeVisibility,
    toggleCompare,
    viewMode,
    setViewMode,
    activeChatNode,
    activeConversation,
    isConversationLoading,
    isSendingChat,
    isBranchingFromChat,
    isStartingNewSession,
    isSwitchingSession,
    isDeletingSession,
    health,
    sessions,
    rootNode,
    openConversation,
    sendMessage,
    createBranchesFromConversation,
    startTopBranches,
    startNewSession,
    switchSession,
    deleteSelectedSession,
  } = useThinkr();
  const [nodePositions, setNodePositions] = useState<Record<string, XYPosition>>({});

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      void openConversation(nodeId);
    },
    [openConversation],
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodePositions((current) => {
      const next = { ...current };

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          next[change.id] = change.position;
        }

        if (change.type === 'remove') {
          delete next[change.id];
        }
      });

      return next;
    });
  }, []);

  useEffect(() => {
    setNodePositions((current) => {
      const validIds = new Set(nodes.map((node) => node.id));
      const nextEntries = Object.entries(current).filter(([nodeId]) => validIds.has(nodeId));
      return nextEntries.length === Object.keys(current).length ? current : Object.fromEntries(nextEntries);
    });
  }, [nodes]);

  const hiddenNodeIds = useMemo(() => hiddenDescendants(nodes, collapsedNodeIds), [nodes, collapsedNodeIds]);

  const flowNodes = useMemo<DecisionFlowNode[]>(() => {
    const positions = layoutDecisionTree(nodes);

    return nodes.map((node) => ({
      id: node.id,
      type: 'decisionNode',
      position: nodePositions[node.id] ?? positions.get(node.id) ?? { x: 0, y: 0 },
      draggable: true,
      selectable: false,
      hidden: hiddenNodeIds.has(node.id),
      data: {
        node,
        isSelected: selectedNodeId === node.id,
        isCompareSelected: selectedCompareIds.includes(node.id),
        isCollapsed: collapsedNodeIds.has(node.id),
        isLoading: false,
        canCompare: node.depth > 0,
        canToggle: node.children.length > 0,
        onSelect: handleSelectNode,
        onToggle: toggleNodeVisibility,
        onCompareToggle: toggleCompare,
      },
    }));
  }, [
    collapsedNodeIds,
    handleSelectNode,
    hiddenNodeIds,
    nodePositions,
    nodes,
    selectedCompareIds,
    selectedNodeId,
    toggleCompare,
    toggleNodeVisibility,
  ]);

  const flowEdges = useMemo<Edge[]>(() => buildEdges(nodes, hiddenNodeIds), [hiddenNodeIds, nodes]);
  const shouldShowBranchCta = Boolean(rootNode && nodes.length === 1 && problem.trim() === rootNode.description.trim());
  const primaryActionLabel = shouldShowBranchCta ? 'Start top 4 branches' : 'Analyze decision';
  const handlePrimaryAction = shouldShowBranchCta ? startTopBranches : analyze;
  const activeSessionId = useMemo(() => sessions.find((session) => session.is_active)?.session_id ?? '', [sessions]);
  const canDeleteSession = sessions.length > 0 && Boolean(activeSessionId);

  return (
    <>
      <a href="#thinkr-main" className="skip-link">
        Skip to workspace
      </a>
      <main
        id="thinkr-main"
        className="aurora-shell mx-auto flex min-h-screen max-w-[1680px] flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:gap-7 lg:px-8"
      >
        <header
          className="surface-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"
          role="banner"
        >
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textMuted">Decision workspace</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-textPrimary sm:text-3xl">Thinkr</h1>
            <p className="mt-2 text-sm leading-relaxed text-textSecondary sm:text-[15px] sm:leading-7">
              Map strategic paths, chat on any branch, and compare tradeoffs before you commit.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:max-w-md sm:items-end">
            <div className="glass-toolbar w-full justify-between sm:w-auto sm:justify-end">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2 sm:flex-none">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted">Session</span>
                <select
                  value={activeSessionId}
                  onChange={(event) => void switchSession(event.target.value)}
                  disabled={sessions.length === 0 || isSwitchingSession}
                  aria-label="Active session"
                  className="min-h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-transparent bg-white/50 px-2 py-1.5 text-xs font-medium text-textPrimary outline-none transition hover:bg-white/80 sm:max-w-[200px]"
                >
                  {sessions.map((session) => (
                    <option key={session.session_id} value={session.session_id}>
                      {session.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex shrink-0 items-center gap-1.5 pr-1">
                <button
                  type="button"
                  onClick={() => void startNewSession()}
                  disabled={isStartingNewSession}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/80 bg-white/70 text-textPrimary shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  title="New session"
                  aria-label="Start new session"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeSessionId) {
                      return;
                    }
                    const confirmed = window.confirm(
                      'Delete this local session? This removes its tree and chat history from the repo-local database.',
                    );
                    if (confirmed) {
                      void deleteSelectedSession(activeSessionId);
                    }
                  }}
                  disabled={!canDeleteSession || isDeletingSession}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rose-200/90 bg-rose-50/90 text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Delete selected session"
                  aria-label="Delete selected session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex w-full flex-wrap justify-end gap-2">
              <span
                className={[
                  'glass-chip max-w-full sm:max-w-none',
                  health?.live_llm === 'true' ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800' : 'border-amber-200/80 bg-amber-50/70 text-amber-900',
                ].join(' ')}
              >
                {health?.live_llm === 'true' ? `Live · ${health.provider}` : 'Fallback · add API key'}
              </span>
              <span className="glass-chip hidden sm:inline-flex">Tree-first</span>
              <span className="glass-chip hidden md:inline-flex">Structured</span>
            </div>
          </div>
        </header>

        <ProblemForm value={problem} onChange={setProblem} onSubmit={handlePrimaryAction} isLoading={isAnalyzing || isBranchingFromChat} submitLabel={primaryActionLabel} />

        {(statusMessage || errorMessage) && (
          <div
            role="status"
            className={[
              'surface-panel border px-4 py-3.5 text-sm leading-relaxed sm:px-5',
              errorMessage ? 'border-rose-300/50 bg-rose-50/50 text-rose-950' : 'border-sky-300/50 bg-sky-50/50 text-sky-950',
            ].join(' ')}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        <section
          className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]"
          aria-label="Decision workspace"
        >
          <aside className="flex flex-col gap-5 lg:gap-6 xl:sticky xl:top-6 xl:self-start">
            <DecisionDetailsPanel node={selectedNode} isLoading={isAnalyzing || isConversationLoading} className="hidden xl:block" />
            <ComparisonPanel selectedNodes={selectedCompareNodes} comparison={comparison} isLoading={isComparing} />
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            {viewMode === 'graph' ? (
              <>
                <DecisionTree nodes={flowNodes} edges={flowEdges} isLoading={isAnalyzing} onNodesChange={handleNodesChange} />
                <SummaryPanel summary={summary} clarifyingQuestions={clarifyingQuestions} message={statusMessage} isLoading={isAnalyzing} />
              </>
            ) : (
              <ChatWorkspace
                node={activeChatNode}
                ancestorContextSummary={activeConversation?.ancestorContextSummary ?? ''}
                messages={activeConversation?.messages ?? []}
                suggestedPerspectives={activeConversation?.suggestedPerspectives ?? []}
                isLoading={isConversationLoading}
                isSending={isSendingChat}
                isBranching={isBranchingFromChat}
                onBackToGraph={() => setViewMode('graph')}
                onSendMessage={sendMessage}
                onCreateBranches={createBranchesFromConversation}
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
