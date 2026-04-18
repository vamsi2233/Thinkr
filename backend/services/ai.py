from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional, TypeVar
from urllib import error, request

from openai import OpenAI
from pydantic import BaseModel

from models.schemas import (
    AnalyzeGeneration,
    ChatGeneration,
    ClarificationDecision,
    CompareResponse,
    ComparisonItem,
    ComparisonResult,
    ConversationMessage,
    DecisionNode,
    ExpandGeneration,
)
from services.config import load_thinkr_env, normalize_api_key
from services.fallback import (
    build_fallback_analysis,
    build_fallback_branch_candidates,
    build_fallback_chat_response,
    build_fallback_expansion,
    build_fallback_seed_message,
)

load_thinkr_env()

ModelT = TypeVar("ModelT", bound=BaseModel)


class DecisionAIService:
    def __init__(self) -> None:
        self.provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.openai_api_key = normalize_api_key(os.getenv("OPENAI_API_KEY"))
        self.anthropic_model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        self.anthropic_api_key = normalize_api_key(os.getenv("ANTHROPIC_API_KEY"))
        self.active_provider = self._resolve_provider()
        self.client = OpenAI(api_key=self.openai_api_key) if self.active_provider == "openai" and self.openai_api_key else None

    def _resolve_provider(self) -> str:
        if self.provider == "anthropic":
            return "anthropic" if self.anthropic_api_key else "fallback"
        if self.provider == "openai":
            return "openai" if self.openai_api_key else "fallback"
        if self.anthropic_api_key:
            return "anthropic"
        if self.openai_api_key:
            return "openai"
        return "fallback"

    def needs_clarification(self, problem: str) -> ClarificationDecision:
        stripped = problem.strip()
        if len(stripped.split()) < 4 or len(stripped) < 18:
            return ClarificationDecision(
                needs_clarification=True,
                clarifying_questions=[
                    "What decision are you actually trying to make?",
                    "What constraint matters most: cost, time, risk, or upside?",
                    "What time horizon are you optimizing for?",
                ],
            )

        if self.active_provider == "fallback":
            return ClarificationDecision(needs_clarification=False, clarifying_questions=[])

        prompt = (
            "Decide whether the user input is too vague to break into distinct strategic paths. "
            "Only ask clarifying questions if the goal, context, or constraints are too underspecified."
        )
        return self._parse_response(
            schema=ClarificationDecision,
            system_prompt=prompt,
            user_prompt=problem,
            fallback=ClarificationDecision(needs_clarification=False, clarifying_questions=[]),
        )

    def analyze_problem(self, problem: str) -> AnalyzeGeneration:
        fallback = build_fallback_analysis(problem)
        if self.active_provider == "fallback":
            return fallback

        system_prompt = (
            "You are Thinkr, an expert decision strategist. Break the decision into 3 to 5 distinct strategic paths. "
            "Each path must be fundamentally different, practical, and honest about uncertainty. "
            "Avoid duplicate branches. Return concrete, executive-ready reasoning."
        )
        user_prompt = (
            f"Problem: {problem}\n\n"
            "Break this decision into 3–5 distinct strategic paths. Each path should represent a fundamentally different approach. "
            "For each branch include title, description, immediate action, short-term outcome, long-term consequence, risks, "
            "and scores for risk, reward, effort, and time from 0 to 10. Also provide a quick answer summary first."
        )
        return self._parse_response(AnalyzeGeneration, system_prompt, user_prompt, fallback)

    def expand_node(self, node: DecisionNode, context: str) -> ExpandGeneration:
        fallback = build_fallback_expansion(node, context)
        if self.active_provider == "fallback":
            return fallback

        system_prompt = (
            "You are Thinkr, a strategic decision tree planner. Generate the next possible steps for a selected branch. "
            "Keep paths distinct, actionable, and non-duplicative. Always include uncertainty."
        )
        user_prompt = (
            f"Parent title: {node.title}\n"
            f"Parent description: {node.description}\n"
            f"Context: {context}\n\n"
            "For this decision path, generate next possible steps. For each include immediate action, short-term outcome, "
            "long-term consequence, risks, and scores for risk, reward, effort, and time. Return JSON only."
        )
        return self._parse_response(ExpandGeneration, system_prompt, user_prompt, fallback)

    def compare_nodes(self, nodes: list[DecisionNode]) -> CompareResponse:
        items: list[ComparisonItem] = []
        for node in nodes:
            weighted_score = round((node.reward_score * 1.5) - node.risk_score - (node.effort_score * 0.75) - (node.time_score * 0.5), 2)
            verdict = "balanced"
            if node.risk_score >= 7 or node.effort_score >= 8:
                verdict = "cautious"
            elif node.reward_score >= 8 and node.risk_score <= 5:
                verdict = "explore"

            items.append(
                ComparisonItem(
                    node_id=node.id,
                    title=node.title,
                    risk_score=node.risk_score,
                    reward_score=node.reward_score,
                    effort_score=node.effort_score,
                    time_score=node.time_score,
                    short_term_outcome=node.short_term_outcome,
                    long_term_outcome=node.long_term_outcome,
                    risks=node.risks,
                    weighted_score=weighted_score,
                    verdict=verdict,
                )
            )

        items.sort(key=lambda item: item.weighted_score, reverse=True)
        winner = items[0]
        result = ComparisonResult(
            items=items,
            recommended_node_id=winner.node_id,
            recommendation_summary=(
                f"{winner.title} currently leads because it balances upside against implementation drag better than the other selected branches."
            ),
            caution="Treat this comparison as directional. Real-world dependencies, capital limits, and sequencing can change the ranking.",
        )
        return CompareResponse(comparison=result)

    def chat_on_node(self, node: DecisionNode, ancestor_context_summary: str, messages: list[ConversationMessage]) -> ChatGeneration:
        fallback = build_fallback_chat_response(node, ancestor_context_summary, messages)
        if self.active_provider == "fallback":
            return fallback

        system_prompt = (
            "You are Thinkr, a strategic thinking partner for ambitious founders, operators, and professionals. "
            "Reply like a smart, practical human advisor in a normal conversation, not like a template or report generator. "
            "Answer the user's latest question directly first, then deepen the reasoning with concrete options, tradeoffs, and next steps. "
            "Ask a clarifying question only when it meaningfully improves the advice. "
            "Avoid fake certainty, generic filler, and repeated phrasing. "
            "Suggest up to 4 alternate perspectives, but do not create branches automatically."
        )

        conversation_lines = [f"{message.role.upper()}: {message.content}" for message in messages[-12:]]
        user_prompt = (
            f"Ancestor context from root to current node:\n{ancestor_context_summary}\n\n"
            f"Current node title: {node.title}\n"
            f"Current node description: {node.description}\n\n"
            "Conversation so far:\n"
            + "\n".join(conversation_lines)
            + "\n\nReply to the latest user message in a natural conversational tone. "
            "Be specific to the user's situation. If they ask what business to start, give concrete business ideas, why they fit this AI era, what to test first, and how to choose among them."
        )
        return self._parse_response(ChatGeneration, system_prompt, user_prompt, fallback)

    def seed_node_conversation(self, node: DecisionNode, ancestor_context_summary: str) -> ChatGeneration:
        fallback = build_fallback_seed_message(node, ancestor_context_summary)
        if self.active_provider == "fallback":
            return fallback

        system_prompt = (
            "You are Thinkr, a strategic thinking partner. A user has just opened a fresh branch node for the first time. "
            "Write the first assistant message for that branch. "
            "Explain what this branch means in practical terms, what assumption it is making, and what to examine next. "
            "Sound natural, thoughtful, and specific. Do not say that this message was auto-generated. "
            "Suggest up to 4 useful follow-up angles, but do not create branches automatically."
        )
        user_prompt = (
            f"Ancestor context from root to current node:\n{ancestor_context_summary}\n\n"
            f"Current node title: {node.title}\n"
            f"Current node description: {node.description}\n"
            f"Immediate action: {node.immediate_action or 'N/A'}\n"
            f"Short-term outcome: {node.short_term_outcome or 'N/A'}\n"
            f"Long-term outcome: {node.long_term_outcome or 'N/A'}\n"
            f"Risks: {', '.join(node.risks) if node.risks else 'N/A'}\n\n"
            "Write the opening assistant message for this branch conversation."
        )
        return self._parse_response(ChatGeneration, system_prompt, user_prompt, fallback)

    def branch_from_conversation(
        self,
        node: DecisionNode,
        ancestor_context_summary: str,
        messages: list[ConversationMessage],
        count: int,
    ) -> ExpandGeneration:
        fallback = build_fallback_branch_candidates(node, messages, count)
        if self.active_provider == "fallback":
            return fallback

        conversation_lines = [f"{message.role.upper()}: {message.content}" for message in messages[-12:]]
        system_prompt = (
            "You are Thinkr, a strategic planner. Based on the conversation and ancestor context, create distinct branch candidates. "
            "Each branch should be a short clean summary suitable for a graph node, while richer reasoning remains in chat. "
            "Only create top branches that the user has implicitly or explicitly asked to explore."
        )
        user_prompt = (
            f"Ancestor context from root to current node:\n{ancestor_context_summary}\n\n"
            f"Current node title: {node.title}\n"
            f"Current node description: {node.description}\n\n"
            "Conversation so far:\n"
            + "\n".join(conversation_lines)
            + f"\n\nGenerate the top {count} distinct branches to explore next. Return JSON only."
        )
        generation = self._parse_response(ExpandGeneration, system_prompt, user_prompt, fallback)
        return ExpandGeneration(children=generation.children[:count])

    def _parse_response(self, schema: type[ModelT], system_prompt: str, user_prompt: str, fallback: ModelT) -> ModelT:
        if self.active_provider == "anthropic":
            return self._parse_anthropic_response(schema, system_prompt, user_prompt, fallback)
        if self.active_provider != "openai" or self.client is None:
            return fallback

        try:
            response = self.client.responses.parse(
                model=self.openai_model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                text_format=schema,
            )
            parsed = response.output_parsed
            return parsed if parsed is not None else fallback
        except Exception:
            return fallback

    def _parse_anthropic_response(self, schema: type[ModelT], system_prompt: str, user_prompt: str, fallback: ModelT) -> ModelT:
        if not self.anthropic_api_key:
            return fallback

        tool_name = "return_structured_output"
        payload = {
            "model": self.anthropic_model,
            "max_tokens": 1800,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "tools": [
                {
                    "name": tool_name,
                    "description": "Return the final answer using the exact structured schema provided.",
                    "input_schema": schema.model_json_schema(),
                }
            ],
            "tool_choice": {"type": "tool", "name": tool_name},
        }

        try:
            response = self._anthropic_request(payload)
            content_blocks = response.get("content", [])
            tool_block = next(
                (
                    block
                    for block in content_blocks
                    if block.get("type") == "tool_use" and block.get("name") == tool_name and isinstance(block.get("input"), dict)
                ),
                None,
            )
            if tool_block is None:
                return fallback
            return schema.model_validate(tool_block["input"])
        except Exception:
            return fallback

    def _anthropic_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.anthropic_api_key:
            raise ValueError("Anthropic API key is not configured")

        http_request = request.Request(
            url="https://api.anthropic.com/v1/messages",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": self.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(http_request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(body or str(exc)) from exc
