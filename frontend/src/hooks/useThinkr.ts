import { useEffect, useMemo, useState } from 'react';

import { activateSession as requestActivateSession, analyzeProblem, branchFromChat, compareDecisionNodes, createNewSession as requestNewSession, deleteSession as requestDeleteSession, getActiveSession, getConversation, getHealth, listSessions, sendChatMessage } from '../api/client';
import type { ComparisonResult, ConversationMessage, DecisionNode, HealthResponse, QuickSummary, SessionSummary } from '../types';

type ViewMode = 'graph' | 'chat';

interface ConversationCacheEntry {
  ancestorContextSummary: string;
  messages: ConversationMessage[];
  suggestedPerspectives: string[];
}

interface ConversationPayload {
  ancestor_context_summary: string;
  messages: ConversationMessage[];
  suggested_perspectives: string[];
}

function mergeNodes(existing: DecisionNode[], incoming: DecisionNode[]): DecisionNode[] {
  const merged = new Map(existing.map((node) => [node.id, node]));

  incoming.forEach((node) => {
    merged.set(node.id, node);
  });

  return Array.from(merged.values());
}

function attachChildren(existing: DecisionNode[], parentId: string, children: DecisionNode[]): DecisionNode[] {
  const childIds = children.map((child) => child.id);
  return mergeNodes(
    existing.map((node) =>
      node.id === parentId
        ? {
            ...node,
            children: Array.from(new Set([...node.children, ...childIds])),
          }
        : node,
    ),
    children,
  );
}

export function useThinkr() {
  const [problem, setProblem] = useState('Should I expand my business to a new city?');
  const [nodes, setNodes] = useState<DecisionNode[]>([]);
  const [summary, setSummary] = useState<QuickSummary | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [activeChatNodeId, setActiveChatNodeId] = useState<string | null>(null);
  const [conversationCache, setConversationCache] = useState<Record<string, ConversationCacheEntry>>({});
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isBranchingFromChat, setIsBranchingFromChat] = useState(false);
  const [isStartingNewSession, setIsStartingNewSession] = useState(false);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const selectedCompareNodes = selectedCompareIds.map((id) => nodeMap.get(id)).filter((node): node is DecisionNode => Boolean(node));
  const activeChatNode = activeChatNodeId ? nodeMap.get(activeChatNodeId) ?? null : null;
  const activeConversation = activeChatNodeId ? conversationCache[activeChatNodeId] ?? null : null;
  const rootNode = useMemo(() => nodes.find((node) => node.depth === 0) ?? null, [nodes]);

  const cacheConversation = (nodeId: string, payload: ConversationPayload) => {
    setConversationCache((current) => ({
      ...current,
      [nodeId]: {
        ancestorContextSummary: payload.ancestor_context_summary,
        messages: payload.messages,
        suggestedPerspectives: payload.suggested_perspectives,
      },
    }));
  };

  const refreshSessions = async () => {
    const response = await listSessions();
    setSessions(response.sessions);
  };

  const resetLocalState = () => {
    setSummary(null);
    setClarifyingQuestions([]);
    setNodes([]);
    setSelectedNodeId(null);
    setCollapsedNodeIds(new Set());
    setSelectedCompareIds([]);
    setComparison(null);
    setViewMode('graph');
    setActiveChatNodeId(null);
    setConversationCache({});
  };

  const loadActiveSessionState = async (message?: string) => {
    const response = await getActiveSession();
    resetLocalState();

    if (response.nodes.length === 0) {
      setProblem('');
      setStatusMessage(message ?? response.message ?? 'Ready for a new decision.');
      return;
    }

    setNodes(response.nodes);
    setSelectedNodeId(response.active_root_node_id ?? response.nodes[0]?.id ?? null);

    const root = response.nodes.find((node) => node.id === response.active_root_node_id) ?? response.nodes.find((node) => node.depth === 0) ?? null;
    if (root) {
      setProblem(root.description);
    }

    setStatusMessage(message ?? 'Loaded your local session.');

    if (response.active_root_node_id && response.nodes.length <= 1) {
      setActiveChatNodeId(response.active_root_node_id);
      setViewMode('chat');
      setIsConversationLoading(true);
      try {
        const conversation = await getConversation(response.active_root_node_id);
        cacheConversation(response.active_root_node_id, conversation);
      } catch {
        setViewMode('graph');
      } finally {
        setIsConversationLoading(false);
      }
    }
  };

  const analyze = async () => {
    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusMessage(null);
    resetLocalState();

    try {
      const response = await analyzeProblem(trimmedProblem);
      await refreshSessions();
      setSummary(response.summary);
      setNodes(response.nodes);
      setClarifyingQuestions(response.clarifying_questions);
      const rootId = response.nodes[0]?.id ?? null;
      setSelectedNodeId(rootId);
      setStatusMessage(response.message ?? null);

      if (!response.needs_clarification && rootId) {
        setActiveChatNodeId(rootId);
        setViewMode('chat');
        setIsSendingChat(true);

        try {
          const chatResponse = await sendChatMessage(rootId, trimmedProblem);
          cacheConversation(rootId, chatResponse);
          setStatusMessage('Root conversation ready.');
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to start the root conversation right now.');
        } finally {
          setIsSendingChat(false);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to analyze the decision right now.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openConversation = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveChatNodeId(nodeId);
    setViewMode('chat');
    setErrorMessage(null);

    if (conversationCache[nodeId]) {
      return;
    }

    setIsConversationLoading(true);
    try {
      const response = await getConversation(nodeId);
      cacheConversation(nodeId, response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the conversation for this node.');
    } finally {
      setIsConversationLoading(false);
    }
  };

  const toggleNodeVisibility = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.children.length === 0) {
      return;
    }

    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const sendMessage = async (message: string) => {
    if (!activeChatNodeId || !message.trim()) {
      return;
    }

    setIsSendingChat(true);
    setErrorMessage(null);

    try {
      const response = await sendChatMessage(activeChatNodeId, message.trim());
      cacheConversation(activeChatNodeId, response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send this message right now.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const createBranchesFromConversation = async () => {
    if (!activeChatNodeId) {
      return;
    }

    setIsBranchingFromChat(true);
    setErrorMessage(null);

    try {
      const response = await branchFromChat(activeChatNodeId, 4);
      if (response.children.length > 0) {
        setNodes((current) => attachChildren(current, activeChatNodeId, response.children));
        setCollapsedNodeIds((current) => {
          const next = new Set(current);
          next.delete(activeChatNodeId);
          return next;
        });
      }
      setStatusMessage(response.message ?? 'Branches created from the conversation.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create branches from this conversation.');
    } finally {
      setIsBranchingFromChat(false);
    }
  };

  const startTopBranches = async () => {
    const targetNodeId = selectedNodeId ?? rootNode?.id;
    if (!targetNodeId) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsBranchingFromChat(true);

    try {
      const response = await branchFromChat(targetNodeId, 4);
      if (response.children.length > 0) {
        setNodes((current) => attachChildren(current, targetNodeId, response.children));
        setCollapsedNodeIds((current) => {
          const next = new Set(current);
          next.delete(targetNodeId);
          return next;
        });
        setStatusMessage(response.message ?? 'Top branches created.');
      } else {
        setStatusMessage(response.message ?? 'No branches were created.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start branches right now.');
    } finally {
      setIsBranchingFromChat(false);
    }
  };

  const toggleCompare = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.depth === 0) {
      return;
    }

    setSelectedCompareIds((current) => {
      if (current.includes(nodeId)) {
        return current.filter((id) => id !== nodeId);
      }

      if (current.length >= 3) {
        setStatusMessage('You can compare up to three branches at a time.');
        return current;
      }

      return [...current, nodeId];
    });
  };

  const startNewSession = async () => {
    setIsStartingNewSession(true);
    setErrorMessage(null);

    try {
      const response = await requestNewSession();
      await refreshSessions();
      await loadActiveSessionState(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start a new session right now.');
    } finally {
      setIsStartingNewSession(false);
    }
  };

  const switchSession = async (sessionId: string) => {
    const currentSessionId = sessions.find((session) => session.is_active)?.session_id;
    if (!sessionId || sessionId === currentSessionId) {
      return;
    }

    setIsSwitchingSession(true);
    setErrorMessage(null);

    try {
      const response = await requestActivateSession(sessionId);
      await refreshSessions();
      await loadActiveSessionState(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to switch sessions right now.');
    } finally {
      setIsSwitchingSession(false);
    }
  };

  const deleteSelectedSession = async (sessionId: string) => {
    if (!sessionId) {
      return;
    }

    setIsDeletingSession(true);
    setErrorMessage(null);

    try {
      const response = await requestDeleteSession(sessionId);
      await refreshSessions();
      await loadActiveSessionState(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete this session right now.');
    } finally {
      setIsDeletingSession(false);
    }
  };

  useEffect(() => {
    let active = true;

    getHealth()
      .then((response) => {
        if (active) {
          setHealth(response);
        }
      })
      .catch(() => {
        if (active) {
          setHealth(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([getActiveSession(), listSessions()])
      .then(async ([response, sessionResponse]) => {
        if (!active) {
          return;
        }

        setSessions(sessionResponse.sessions);

        if (response.nodes.length === 0) {
          setStatusMessage(response.message ?? 'Ready for a new decision.');
          return;
        }

        setNodes(response.nodes);
        setSelectedNodeId(response.active_root_node_id ?? response.nodes[0]?.id ?? null);

        const root = response.nodes.find((node) => node.id === response.active_root_node_id) ?? response.nodes.find((node) => node.depth === 0) ?? null;
        if (root) {
          setProblem(root.description);
        }

        setStatusMessage('Loaded your last local session.');

        if (response.active_root_node_id && response.nodes.length <= 1) {
          setActiveChatNodeId(response.active_root_node_id);
          setViewMode('chat');
          setIsConversationLoading(true);
          try {
            const conversation = await getConversation(response.active_root_node_id);
            if (active) {
              cacheConversation(response.active_root_node_id, conversation);
            }
          } catch {
            if (active) {
              setViewMode('graph');
            }
          } finally {
            if (active) {
              setIsConversationLoading(false);
            }
          }
        }
      })
      .catch(() => {
        if (active) {
          setStatusMessage(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCompareIds.length < 2) {
      setComparison(null);
      return;
    }

    let active = true;
    setIsComparing(true);
    setErrorMessage(null);

    compareDecisionNodes(selectedCompareIds)
      .then((response) => {
        if (!active) {
          return;
        }
        setComparison(response.comparison);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : 'Unable to compare the selected branches.');
      })
      .finally(() => {
        if (active) {
          setIsComparing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedCompareIds]);

  return {
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
  };
}
