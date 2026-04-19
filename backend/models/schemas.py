from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class DecisionNode(BaseModel):
    id: str
    parent_id: Optional[str] = None
    title: str
    description: str
    depth: int
    risk_score: int = Field(ge=0, le=10)
    reward_score: int = Field(ge=0, le=10)
    effort_score: int = Field(ge=0, le=10)
    time_score: int = Field(ge=0, le=10)
    children: List[str] = Field(default_factory=list)
    immediate_action: Optional[str] = None
    short_term_outcome: Optional[str] = None
    long_term_outcome: Optional[str] = None
    risks: List[str] = Field(default_factory=list)
    uncertainty: Optional[str] = None


class QuickSummary(BaseModel):
    headline: str
    recommended_path: str
    rationale: str
    uncertainty_note: str


class AnalyzeRequest(BaseModel):
    input: str = Field(min_length=1, max_length=4000)


class AnalyzeResponse(BaseModel):
    summary: Optional[QuickSummary] = None
    nodes: List[DecisionNode] = Field(default_factory=list)
    needs_clarification: bool = False
    clarifying_questions: List[str] = Field(default_factory=list)
    message: Optional[str] = None


class ExpandRequest(BaseModel):
    node_id: str
    context: Optional[str] = None


class ExpandResponse(BaseModel):
    children: List[DecisionNode] = Field(default_factory=list)
    message: Optional[str] = None
    limit_reached: bool = False
    out_of_memory: bool = False


class CompareRequest(BaseModel):
    node_ids: List[str] = Field(min_length=2, max_length=3)


class ComparisonItem(BaseModel):
    node_id: str
    title: str
    risk_score: int
    reward_score: int
    effort_score: int
    time_score: int
    short_term_outcome: Optional[str] = None
    long_term_outcome: Optional[str] = None
    risks: List[str] = Field(default_factory=list)
    weighted_score: float
    verdict: Literal["explore", "balanced", "cautious"]


class ComparisonResult(BaseModel):
    items: List[ComparisonItem]
    recommended_node_id: str
    recommendation_summary: str
    caution: str


class CompareResponse(BaseModel):
    comparison: ComparisonResult


class ClarificationDecision(BaseModel):
    needs_clarification: bool
    clarifying_questions: List[str] = Field(default_factory=list)


class GeneratedNodeDraft(BaseModel):
    title: str
    description: str
    immediate_action: str
    short_term_outcome: str
    long_term_outcome: str
    risks: List[str] = Field(default_factory=list)
    risk_score: int = Field(ge=0, le=10)
    reward_score: int = Field(ge=0, le=10)
    effort_score: int = Field(ge=0, le=10)
    time_score: int = Field(ge=0, le=10)
    uncertainty: str


class AnalyzeGeneration(BaseModel):
    summary: QuickSummary
    branches: List[GeneratedNodeDraft] = Field(default_factory=list, min_length=3, max_length=5)


class ExpandGeneration(BaseModel):
    children: List[GeneratedNodeDraft] = Field(default_factory=list, min_length=1, max_length=6)


class ConversationMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str


class BranchPreviewDraft(BaseModel):
    """Structured next-branch options from chat (persisted with server-generated ids)."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=900)
    immediate_action: str = Field(default="", max_length=400)


class BranchPreview(BaseModel):
    id: str
    title: str
    description: str
    immediate_action: Optional[str] = None


class ConversationStateResponse(BaseModel):
    node: DecisionNode
    ancestor_context_summary: str
    messages: List[ConversationMessage] = Field(default_factory=list)
    suggested_perspectives: List[str] = Field(default_factory=list)
    branch_previews: List[BranchPreview] = Field(default_factory=list)


class ChatRequest(BaseModel):
    node_id: str
    message: str = Field(min_length=1, max_length=8000)


class ChatGeneration(BaseModel):
    assistant_message: str
    suggested_perspectives: List[str] = Field(default_factory=list, max_length=4)
    branch_previews: List[BranchPreviewDraft] = Field(default_factory=list, max_length=4)


class ChatResponse(BaseModel):
    node: DecisionNode
    ancestor_context_summary: str
    messages: List[ConversationMessage] = Field(default_factory=list)
    suggested_perspectives: List[str] = Field(default_factory=list)
    branch_previews: List[BranchPreview] = Field(default_factory=list)


class BranchConversationRequest(BaseModel):
    node_id: str
    count: int = Field(default=4, ge=1, le=6)


class BranchConversationResponse(BaseModel):
    children: List[DecisionNode] = Field(default_factory=list)
    message: Optional[str] = None
    ancestor_context_summary: str


class MaterializeBranchPreviewResponse(BaseModel):
    node: DecisionNode
    reused_existing: bool = False
    branch_previews: List[BranchPreview] = Field(default_factory=list)
    message: Optional[str] = None
    ancestor_context_summary: str


class SessionStateResponse(BaseModel):
    session_id: str
    title: str
    nodes: List[DecisionNode] = Field(default_factory=list)
    active_root_node_id: Optional[str] = None
    message: Optional[str] = None


class NewSessionResponse(BaseModel):
    session_id: str
    title: str
    message: str


class SessionSummary(BaseModel):
    session_id: str
    title: str
    is_active: bool
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: List[SessionSummary] = Field(default_factory=list)


class ActivateSessionResponse(BaseModel):
    session_id: str
    title: str
    message: str


class DeleteSessionResponse(BaseModel):
    deleted_session_id: str
    active_session_id: str
    active_session_title: str
    message: str
