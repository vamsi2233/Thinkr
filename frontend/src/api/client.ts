import type {
  AnalyzeResponse,
  BranchConversationResponse,
  ChatResponse,
  CompareResponse,
  ConversationStateResponse,
  ExpandResponse,
  HealthResponse,
  MaterializeBranchPreviewResponse,
  NewSessionResponse,
  SessionListResponse,
  SessionStateResponse,
  ActivateSessionResponse,
  DeleteSessionResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const fallbackMessage = 'Request failed. Please try again.';
    try {
      const error = (await response.json()) as { detail?: string };
      throw new Error(error.detail ?? fallbackMessage);
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  return (await response.json()) as T;
}

export function analyzeProblem(input: string): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health', {
    method: 'GET',
  });
}

export function getActiveSession(): Promise<SessionStateResponse> {
  return request<SessionStateResponse>('/session/active', {
    method: 'GET',
  });
}

export function createNewSession(): Promise<NewSessionResponse> {
  return request<NewSessionResponse>('/sessions/new', {
    method: 'POST',
  });
}

export function listSessions(): Promise<SessionListResponse> {
  return request<SessionListResponse>('/sessions', {
    method: 'GET',
  });
}

export function activateSession(sessionId: string): Promise<ActivateSessionResponse> {
  return request<ActivateSessionResponse>(`/sessions/${sessionId}/activate`, {
    method: 'POST',
  });
}

export function deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
  return request<DeleteSessionResponse>(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function expandDecisionNode(nodeId: string, context: string): Promise<ExpandResponse> {
  return request<ExpandResponse>('/expand', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId, context }),
  });
}

export function compareDecisionNodes(nodeIds: string[]): Promise<CompareResponse> {
  return request<CompareResponse>('/compare', {
    method: 'POST',
    body: JSON.stringify({ node_ids: nodeIds }),
  });
}

export function getConversation(nodeId: string): Promise<ConversationStateResponse> {
  return request<ConversationStateResponse>(`/conversation/${nodeId}`, {
    method: 'GET',
  });
}

export function sendChatMessage(nodeId: string, message: string): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId, message }),
  });
}

export function branchFromChat(nodeId: string, count = 4): Promise<BranchConversationResponse> {
  return request<BranchConversationResponse>('/branch-from-chat', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId, count }),
  });
}

export function materializeBranchPreview(previewId: string): Promise<MaterializeBranchPreviewResponse> {
  return request<MaterializeBranchPreviewResponse>(`/branch-preview/${encodeURIComponent(previewId)}/materialize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
