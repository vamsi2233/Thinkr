import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type NodeChange } from '@xyflow/react';
import { useEffect } from 'react';

import type { DecisionFlowNode } from '../types';
import { DecisionNodeCard } from './DecisionNodeCard';
import { Skeleton } from './Skeleton';

const nodeTypes = {
  decisionNode: DecisionNodeCard,
};

function FitViewOnChange({ nodeCount }: { nodeCount: number }) {
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void reactFlow.fitView({ duration: 400, padding: 0.16 });
    }, 30);

    return () => window.clearTimeout(timer);
  }, [nodeCount, reactFlow]);

  return null;
}

interface DecisionTreeProps {
  nodes: DecisionFlowNode[];
  edges: Edge[];
  isLoading?: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
}

export function DecisionTree({ nodes, edges, isLoading = false, onNodesChange }: DecisionTreeProps) {
  return (
    <section className="surface-panel tree-stage overflow-hidden" aria-labelledby="decision-map-heading">
      <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
        <div className="min-w-0">
          <h2 id="decision-map-heading" className="text-lg font-semibold tracking-tight text-textPrimary">
            Decision map
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-textMuted">
            Open a node to chat, collapse branches to reduce noise, select two or three paths to compare.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip">Tap node → chat</span>
          <span className="glass-chip hidden sm:inline-flex">Expand paths</span>
          <span className="glass-chip">Compare 2–3</span>
        </div>
      </div>

      <div className="relative h-[min(56vh,520px)] sm:h-[min(62vh,680px)] xl:h-[min(68vh,860px)] 2xl:h-[min(72vh,920px)]">
        {isLoading && nodes.length === 0 ? (
          <div className="absolute inset-0 z-10 grid content-center gap-4 bg-white/35 px-4 backdrop-blur-sm sm:px-5">
            <div className="surface-panel mx-auto max-w-4xl p-5">
              <div className="mb-4 text-center text-sm text-textSecondary">Mapping branches and building your decision tree…</div>
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-36 rounded-2xl sm:h-40" />
                <Skeleton className="h-36 rounded-2xl sm:h-40" />
                <Skeleton className="h-36 rounded-2xl sm:h-40" />
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && nodes.length === 0 ? (
          <div className="absolute inset-0 z-10 grid place-items-center px-4 sm:px-5">
            <div className="surface-panel max-w-md p-6 text-center">
              <div className="text-base font-semibold text-textPrimary sm:text-lg">Your map appears here</div>
              <p className="mt-2 text-sm leading-7 text-textMuted">
                Submit a decision above. Thinkr drafts a recommendation, then renders branches you can explore.
              </p>
            </div>
          </div>
        ) : null}

        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable={false}
            minZoom={0.2}
            maxZoom={1.7}
          >
            <FitViewOnChange nodeCount={nodes.length} />
            <MiniMap pannable zoomable className="!rounded-xl !border !border-border !shadow-sm" style={{ background: 'rgba(255,255,255,0.92)' }} nodeColor={() => '#3b82f6'} />
            <Controls position="bottom-right" />
            <Background gap={24} size={1} color="rgba(100, 116, 139, 0.18)" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </section>
  );
}
