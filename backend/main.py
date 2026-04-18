from __future__ import annotations

import os
import uuid
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    BranchConversationRequest,
    BranchConversationResponse,
    ChatRequest,
    ChatResponse,
    CompareRequest,
    CompareResponse,
    ConversationStateResponse,
    DecisionNode,
    ExpandRequest,
    ExpandResponse,
    ActivateSessionResponse,
    DeleteSessionResponse,
    NewSessionResponse,
    SessionListResponse,
    SessionStateResponse,
)
from services.ai import DecisionAIService
from services.config import load_thinkr_env
from services.fallback import build_ancestor_context_summary, make_node_from_draft
from services.store import SQLiteDecisionStore

load_thinkr_env()

MAX_DEPTH = 5
MAX_NODES_PER_TREE = int(os.getenv("THINKR_MAX_NODES", "40"))

app = FastAPI(title="Thinkr API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("THINKR_CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = SQLiteDecisionStore()
ai_service = DecisionAIService()


def _build_root_node(problem: str) -> DecisionNode:
    return DecisionNode(
        id=str(uuid.uuid4()),
        parent_id=None,
        title="Decision Root",
        description=problem.strip(),
        depth=0,
        risk_score=0,
        reward_score=0,
        effort_score=0,
        time_score=0,
        children=[],
        immediate_action="Clarify the goal and evaluate strategic paths.",
        short_term_outcome="You organize the decision into comparable branches.",
        long_term_outcome="You create a reusable map of options instead of relying on a single guess.",
        risks=["Initial branches may still need refinement"],
        uncertainty="This root node is a framing tool, not the answer itself.",
    )


def _context_for_node(node_id: str) -> str:
    lineage = store.lineage(node_id)
    return " > ".join(node.title for node in lineage)


def _ancestor_context_summary(node_id: str) -> str:
    return build_ancestor_context_summary(store.lineage(node_id))


@app.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "provider": ai_service.active_provider,
        "live_llm": "true" if ai_service.active_provider != "fallback" else "false",
    }


@app.get("/session/active", response_model=SessionStateResponse)
def get_active_session() -> SessionStateResponse:
    snapshot = store.get_active_session_snapshot()
    return SessionStateResponse(
        session_id=snapshot["session_id"],
        title=snapshot["title"],
        nodes=snapshot["nodes"],
        active_root_node_id=snapshot["active_root_node_id"],
        message="Loaded active local session.",
    )


@app.get("/sessions", response_model=SessionListResponse)
def list_sessions() -> SessionListResponse:
    return SessionListResponse(sessions=store.list_sessions())


@app.post("/sessions/new", response_model=NewSessionResponse)
def create_new_session() -> NewSessionResponse:
    session_id = store.create_new_session()
    return NewSessionResponse(
        session_id=session_id,
        title=store.active_session_title(),
        message="Started a fresh local session.",
    )


@app.post("/sessions/{session_id}/activate", response_model=ActivateSessionResponse)
def activate_session(session_id: str) -> ActivateSessionResponse:
    if not store.activate_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    return ActivateSessionResponse(
        session_id=session_id,
        title=store.active_session_title(),
        message="Switched local session.",
    )


@app.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str) -> DeleteSessionResponse:
    result = store.delete_session(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return DeleteSessionResponse(
        deleted_session_id=result["deleted_session_id"],
        active_session_id=result["active_session_id"],
        active_session_title=result["active_session_title"],
        message="Deleted local session.",
    )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    store.reset_problem(payload.input)
    root = _build_root_node(payload.input)
    store.add_nodes([root], problem=payload.input)

    return AnalyzeResponse(
        summary=None,
        nodes=[root],
        needs_clarification=False,
        clarifying_questions=[],
        message="Root conversation created.",
    )


@app.post("/expand", response_model=ExpandResponse)
def expand(payload: ExpandRequest) -> ExpandResponse:
    node = store.get_node(payload.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    if node.depth >= MAX_DEPTH:
        return ExpandResponse(children=[], message="Maximum depth reached for this branch.", limit_reached=True)

    existing_children = store.get_children(node.id)
    if existing_children:
        return ExpandResponse(children=existing_children, message="Loaded existing branch expansion.")

    problem = store.problem_for_node(node.id)
    if problem and store.total_nodes_for_problem(problem) >= MAX_NODES_PER_TREE:
        return ExpandResponse(
            children=[],
            message="Out of memory — expand this branch further?",
            out_of_memory=True,
        )

    context = payload.context or _context_for_node(node.id)
    generation = ai_service.expand_node(node, context)
    children = [make_node_from_draft(draft, node.id, node.depth + 1) for draft in generation.children]
    store.append_children(node.id, children)
    return ExpandResponse(children=children, message="Branch expanded successfully.")


@app.post("/compare", response_model=CompareResponse)
def compare(payload: CompareRequest) -> CompareResponse:
    nodes = store.get_nodes(payload.node_ids)
    if len(nodes) != len(payload.node_ids):
        raise HTTPException(status_code=404, detail="One or more nodes were not found")
    return ai_service.compare_nodes(nodes)


@app.get("/conversation/{node_id}", response_model=ConversationStateResponse)
def get_conversation(node_id: str) -> ConversationStateResponse:
    node = store.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    messages = store.get_messages(node_id)
    if len(messages) == 0:
        ancestor_summary = _ancestor_context_summary(node_id)
        generation = ai_service.seed_node_conversation(node, ancestor_summary)
        store.add_message(node_id, "assistant", generation.assistant_message)
        store.set_suggested_perspectives(node_id, generation.suggested_perspectives)
        messages = store.get_messages(node_id)
    else:
        ancestor_summary = _ancestor_context_summary(node_id)

    return ConversationStateResponse(
        node=node,
        ancestor_context_summary=ancestor_summary,
        messages=messages,
        suggested_perspectives=store.get_suggested_perspectives(node_id),
    )


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    node = store.get_node(payload.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    store.add_message(payload.node_id, "user", payload.message)
    ancestor_summary = _ancestor_context_summary(payload.node_id)
    messages = store.get_messages(payload.node_id)
    generation = ai_service.chat_on_node(node, ancestor_summary, messages)
    store.add_message(payload.node_id, "assistant", generation.assistant_message)
    store.set_suggested_perspectives(payload.node_id, generation.suggested_perspectives)

    return ChatResponse(
        node=node,
        ancestor_context_summary=ancestor_summary,
        messages=store.get_messages(payload.node_id),
        suggested_perspectives=generation.suggested_perspectives,
    )


@app.post("/branch-from-chat", response_model=BranchConversationResponse)
def branch_from_chat(payload: BranchConversationRequest) -> BranchConversationResponse:
    node = store.get_node(payload.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    if node.depth >= MAX_DEPTH:
        return BranchConversationResponse(
            children=[],
            message="Maximum depth reached for this branch.",
            ancestor_context_summary=_ancestor_context_summary(payload.node_id),
        )

    existing_children = store.get_children(node.id)
    if existing_children:
        return BranchConversationResponse(
            children=existing_children,
            message="This node already has child branches.",
            ancestor_context_summary=_ancestor_context_summary(payload.node_id),
        )

    problem = store.problem_for_node(node.id)
    ancestor_summary = _ancestor_context_summary(payload.node_id)
    if problem and store.total_nodes_for_problem(problem) >= MAX_NODES_PER_TREE:
        return BranchConversationResponse(
            children=[],
            message="Out of memory — expand this branch further?",
            ancestor_context_summary=ancestor_summary,
        )

    messages = store.get_messages(node.id)
    generation = ai_service.branch_from_conversation(node, ancestor_summary, messages, payload.count)
    children = [make_node_from_draft(draft, node.id, node.depth + 1) for draft in generation.children]
    store.append_children(node.id, children)

    return BranchConversationResponse(
        children=children,
        message=f"Created {len(children)} branches from the conversation.",
        ancestor_context_summary=ancestor_summary,
    )
