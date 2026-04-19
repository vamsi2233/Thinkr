import type { Node } from '@xyflow/react';

export interface DecisionNode {
  id: string;
  parent_id: string | null;
  title: string;
  description: string;
  depth: number;
  risk_score: number;
  reward_score: number;
  effort_score: number;
  time_score: number;
  children: string[];
  immediate_action?: string | null;
  short_term_outcome?: string | null;
  long_term_outcome?: string | null;
  risks: string[];
  uncertainty?: string | null;
}

export interface QuickSummary {
  headline: string;
  recommended_path: string;
  rationale: string;
  uncertainty_note: string;
}

export interface AnalyzeResponse {
  summary: QuickSummary | null;
  nodes: DecisionNode[];
  needs_clarification: boolean;
  clarifying_questions: string[];
  message?: string | null;
}

export interface ExpandResponse {
  children: DecisionNode[];
  message?: string | null;
  limit_reached: boolean;
  out_of_memory: boolean;
}

export interface ComparisonItem {
  node_id: string;
  title: string;
  risk_score: number;
  reward_score: number;
  effort_score: number;
  time_score: number;
  short_term_outcome?: string | null;
  long_term_outcome?: string | null;
  risks: string[];
  weighted_score: number;
  verdict: 'explore' | 'balanced' | 'cautious';
}

export interface ComparisonResult {
  items: ComparisonItem[];
  recommended_node_id: string;
  recommendation_summary: string;
  caution: string;
}

export interface CompareResponse {
  comparison: ComparisonResult;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface BranchPreview {
  id: string;
  title: string;
  description: string;
  immediate_action?: string | null;
}

export interface ConversationStateResponse {
  node: DecisionNode;
  ancestor_context_summary: string;
  messages: ConversationMessage[];
  suggested_perspectives: string[];
  branch_previews: BranchPreview[];
}

export interface ChatResponse {
  node: DecisionNode;
  ancestor_context_summary: string;
  messages: ConversationMessage[];
  suggested_perspectives: string[];
  branch_previews: BranchPreview[];
}

export interface MaterializeBranchPreviewResponse {
  node: DecisionNode;
  reused_existing: boolean;
  branch_previews: BranchPreview[];
  message?: string | null;
  ancestor_context_summary: string;
}

export interface BranchConversationResponse {
  children: DecisionNode[];
  message?: string | null;
  ancestor_context_summary: string;
}

export interface HealthResponse {
  status: string;
  provider: string;
  live_llm: string;
}

export interface SessionStateResponse {
  session_id: string;
  title: string;
  nodes: DecisionNode[];
  active_root_node_id: string | null;
  message?: string | null;
}

export interface NewSessionResponse {
  session_id: string;
  title: string;
  message: string;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  is_active: boolean;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
}

export interface ActivateSessionResponse {
  session_id: string;
  title: string;
  message: string;
}

export interface DeleteSessionResponse {
  deleted_session_id: string;
  active_session_id: string;
  active_session_title: string;
  message: string;
}

export interface DecisionFlowNodeData extends Record<string, unknown> {
  node: DecisionNode;
  isSelected: boolean;
  isCompareSelected: boolean;
  isCollapsed: boolean;
  isLoading: boolean;
  canCompare: boolean;
  canToggle: boolean;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  onCompareToggle: (nodeId: string) => void;
}

export type DecisionFlowNode = Node<DecisionFlowNodeData, 'decisionNode'>;
