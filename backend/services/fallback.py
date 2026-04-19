from __future__ import annotations

import re
import uuid
from typing import List, Optional, Tuple

from models.schemas import (
    AnalyzeGeneration,
    BranchPreviewDraft,
    ChatGeneration,
    ConversationMessage,
    DecisionNode,
    ExpandGeneration,
    GeneratedNodeDraft,
    QuickSummary,
)


def _normalize_title(text: str) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    return text[:72] if text else "Decision"


def _problem_phrase(problem: str) -> str:
    cleaned = problem.strip().rstrip("?.")
    return cleaned[:120] if cleaned else "this decision"


def _make_branch(
    title: str,
    description: str,
    action: str,
    short_term: str,
    long_term: str,
    risks: List[str],
    scores: Tuple[int, int, int, int],
) -> GeneratedNodeDraft:
    risk_score, reward_score, effort_score, time_score = scores
    return GeneratedNodeDraft(
        title=title,
        description=description,
        immediate_action=action,
        short_term_outcome=short_term,
        long_term_outcome=long_term,
        risks=risks,
        risk_score=risk_score,
        reward_score=reward_score,
        effort_score=effort_score,
        time_score=time_score,
        uncertainty="These scores are directional. Validate with real constraints, budget, and market feedback.",
    )


def build_fallback_analysis(problem: str) -> AnalyzeGeneration:
    phrase = _problem_phrase(problem)
    summary = QuickSummary(
        headline="Start with the lowest-regret path, then escalate only after evidence improves.",
        recommended_path="Run a reversible pilot before making the largest commitment.",
        rationale=f"For {phrase}, the MVP recommendation is to prefer options that create information quickly while capping downside.",
        uncertainty_note="This is a planning aid, not a prediction. External conditions, timing, and execution quality can change the outcome.",
    )
    branches = [
        _make_branch(
            title="Pilot the idea first",
            description=f"Test {phrase} on a narrow scope before scaling.",
            action="Define a lightweight pilot with a clear success metric and budget guardrails.",
            short_term="You learn fast, spend less, and uncover hidden blockers early.",
            long_term="A successful pilot gives you real signals for scaling with more confidence.",
            risks=["Sample size may be too small", "Pilot conditions may not match full rollout"],
            scores=(3, 8, 4, 4),
        ),
        _make_branch(
            title="Scale aggressively",
            description=f"Commit quickly to {phrase} in pursuit of first-mover advantage.",
            action="Allocate budget, team capacity, and a launch timeline for the full initiative.",
            short_term="Momentum builds quickly and competitors may have less time to react.",
            long_term="If the bet is right, you capture outsized upside; if wrong, recovery is expensive.",
            risks=["High burn before validation", "Execution strain on the core business"],
            scores=(8, 9, 8, 8),
        ),
        _make_branch(
            title="Partner instead of building alone",
            description=f"Use partnerships to explore {phrase} with shared risk and faster access.",
            action="Identify one or two partners who already have local reach, distribution, or expertise.",
            short_term="You reduce upfront effort and gain external capabilities faster.",
            long_term="Good partners accelerate adoption, but weak alignment can cap control and margins.",
            risks=["Partner incentives may diverge", "Shared brand risk if execution slips"],
            scores=(5, 7, 5, 5),
        ),
        _make_branch(
            title="Delay and strengthen the foundation",
            description=f"Postpone the move and improve capabilities before deciding on {phrase}.",
            action="Audit capital, team bandwidth, operational gaps, and the minimum readiness criteria.",
            short_term="You avoid a rushed commitment and protect the current business.",
            long_term="You may enter later with a stronger base, but you risk losing timing advantages.",
            risks=["Opportunity cost from waiting", "Analysis may drift into indecision"],
            scores=(2, 5, 3, 7),
        ),
    ]
    return AnalyzeGeneration(summary=summary, branches=branches)


def build_fallback_expansion(parent: DecisionNode, context: str) -> ExpandGeneration:
    topic = parent.title.lower()
    base = _normalize_title(parent.title)
    items = [
        _make_branch(
            title=f"Validate assumptions for {base}",
            description=f"Pressure-test the core assumptions behind {parent.title} using data and stakeholder input.",
            action="List the top three assumptions and design a fast validation experiment for each.",
            short_term="You expose hidden fragility before spending heavily.",
            long_term="Validated assumptions improve confidence and make follow-on decisions sharper.",
            risks=["Feedback may be incomplete", "Small tests can understate operational complexity"],
            scores=(max(parent.risk_score - 1, 1), min(parent.reward_score, 9), max(parent.effort_score - 1, 2), max(parent.time_score - 1, 2)),
        ),
        _make_branch(
            title=f"Execute a focused rollout for {base}",
            description=f"Move {parent.title} into a controlled real-world rollout with defined guardrails.",
            action="Assign owners, timeline, and success metrics for a contained launch phase.",
            short_term="You generate real usage data and surface operational gaps.",
            long_term="A solid rollout creates momentum and a repeatable playbook for scale.",
            risks=["Operational surprises may slow progress", "Resource conflicts can hurt delivery"],
            scores=(min(parent.risk_score + 1, 9), min(parent.reward_score + 1, 10), min(parent.effort_score + 1, 10), min(parent.time_score + 1, 10)),
        ),
        _make_branch(
            title=f"Set a decision gate for {base}",
            description=f"Define the next checkpoint where you either double down, pivot, or stop {parent.title}.",
            action="Agree on threshold metrics, budget limits, and kill criteria before the next stage.",
            short_term="The team gets clarity on what success and failure mean.",
            long_term="Decision gates reduce sunk-cost bias and keep strategy adaptable.",
            risks=["Thresholds may be poorly chosen", "Overly rigid gates can miss nuance"],
            scores=(max(parent.risk_score - 2, 1), max(parent.reward_score - 1, 4), max(parent.effort_score - 2, 2), max(parent.time_score - 1, 2)),
        ),
    ]

    if "partner" in topic or "alliance" in topic:
        items[1] = _make_branch(
            title=f"Pilot one partner motion for {base}",
            description=f"Run a narrow partner-led test to check execution quality and channel fit for {parent.title}.",
            action="Choose one partner, define joint KPIs, and run a time-boxed pilot.",
            short_term="You learn whether the partner can deliver without committing broadly.",
            long_term="Strong results justify deeper integration; weak results limit downside.",
            risks=["Shared accountability may blur ownership", "Partner execution may not scale"],
            scores=(5, 7, 5, 5),
        )

    return ExpandGeneration(children=items)


def draft_from_branch_preview_draft(preview: BranchPreviewDraft) -> GeneratedNodeDraft:
    """Turn a persisted chat preview into a full node draft (scores are placeholders for compare / legacy)."""
    action = (preview.immediate_action or "").strip() or "Define the next concrete step for this path."
    return GeneratedNodeDraft(
        title=_normalize_title(preview.title),
        description=preview.description.strip(),
        immediate_action=action,
        short_term_outcome="You gain clarity on whether this direction fits your constraints and timing.",
        long_term_outcome="This path either becomes your main bet or sharpens what to rule out next.",
        risks=["Context may shift faster than the plan assumes", "Key assumptions still need validation"],
        risk_score=5,
        reward_score=6,
        effort_score=5,
        time_score=5,
        uncertainty="Validate with real constraints, stakeholders, and a cheap experiment where possible.",
    )


def make_node_from_draft(draft: GeneratedNodeDraft, parent_id: Optional[str], depth: int) -> DecisionNode:
    return DecisionNode(
        id=str(uuid.uuid4()),
        parent_id=parent_id,
        title=draft.title,
        description=draft.description,
        depth=depth,
        risk_score=draft.risk_score,
        reward_score=draft.reward_score,
        effort_score=draft.effort_score,
        time_score=draft.time_score,
        children=[],
        immediate_action=draft.immediate_action,
        short_term_outcome=draft.short_term_outcome,
        long_term_outcome=draft.long_term_outcome,
        risks=draft.risks,
        uncertainty=draft.uncertainty,
    )


def build_ancestor_context_summary(lineage: List[DecisionNode]) -> str:
    parts: List[str] = []
    for node in lineage:
        if node.depth == 0:
            parts.append(f"Root problem: {node.description}")
        else:
            # Tab separates title from description so titles may contain ": " without breaking parsers.
            parts.append(f"Depth {node.depth} - {node.title}\t{node.description}")
    return "\n".join(parts)


def build_fallback_chat_response(node: DecisionNode, ancestor_context_summary: str, messages: List[ConversationMessage]) -> ChatGeneration:
    latest_user_message = next((message.content for message in reversed(messages) if message.role == "user"), "Explore more options.")
    assistant_message = (
        f"Given the path '{node.title}', I'd treat this as a strategic checkpoint rather than a final answer. "
        f"Based on your latest question — '{latest_user_message}' — I would explore the tradeoff between speed, control, and reversibility. "
        "A practical next step is to test the cheapest reversible move first, then compare what new evidence it unlocks before committing further."
    )
    suggestions = [
        "What is the lowest-regret version of this path?",
        "What assumptions would break this approach?",
        "How would this look if we optimized for speed instead of certainty?",
        "What alternative perspective should we explore before branching?",
    ]
    expand = build_fallback_branch_candidates(node, messages, 4)
    branch_previews = [
        BranchPreviewDraft(title=c.title, description=c.description, immediate_action=c.immediate_action)
        for c in expand.children
    ]
    return ChatGeneration(
        assistant_message=assistant_message,
        suggested_perspectives=suggestions,
        branch_previews=branch_previews,
    )


def build_fallback_seed_message(node: DecisionNode, ancestor_context_summary: str) -> ChatGeneration:
    assistant_message = (
        f"This branch is about '{node.title}'. In plain terms, it means {node.description.lower()} "
        f"Given the path from the root, I would treat this as a specific strategic option worth stress-testing rather than accepting at face value. "
        "The first things I would examine are the key assumption behind this branch, what evidence would make it stronger, and what cheap experiment would validate it quickly."
    )
    suggestions = [
        "What is the core assumption inside this branch?",
        "What would make this branch meaningfully stronger than the others?",
        "What is the cheapest way to test this branch?",
        "What downside should we de-risk before committing?",
    ]
    expand = build_fallback_branch_candidates(node, [], 4)
    branch_previews = [
        BranchPreviewDraft(title=c.title, description=c.description, immediate_action=c.immediate_action)
        for c in expand.children
    ]
    return ChatGeneration(
        assistant_message=assistant_message,
        suggested_perspectives=suggestions,
        branch_previews=branch_previews,
    )


def build_fallback_branch_candidates(node: DecisionNode, messages: List[ConversationMessage], count: int) -> ExpandGeneration:
    latest_user_message = next((message.content for message in reversed(messages) if message.role == "user"), node.title)
    candidates = [
        _make_branch(
            title=f"Fast-track {node.title}",
            description=f"Push the current direction faster with tighter execution and shorter feedback loops around '{latest_user_message}'.",
            action="Define a 2-week sprint with one clear success metric and a rollback condition.",
            short_term="You learn quickly and expose execution blockers sooner.",
            long_term="If signals are strong, this becomes the fastest route to momentum.",
            risks=["Higher coordination pressure", "Less time to validate assumptions"],
            scores=(5, 8, 6, 3),
        ),
        _make_branch(
            title=f"De-risk {node.title}",
            description=f"Stay on the same path but reduce downside before committing further.",
            action="List the highest-risk assumptions and validate each with a lightweight experiment.",
            short_term="You trade some speed for better confidence.",
            long_term="This creates a stronger decision base if the path still looks attractive later.",
            risks=["Can feel slower to the team", "Extra validation may not eliminate uncertainty completely"],
            scores=(3, 7, 5, 5),
        ),
        _make_branch(
            title=f"Partner around {node.title}",
            description=f"Explore whether an external partner can accelerate or de-risk this branch.",
            action="Identify one partner with leverage you lack and test a narrow collaboration.",
            short_term="You gain access to capabilities without building everything internally.",
            long_term="A strong partner can open faster scale, but control may be reduced.",
            risks=["Dependency on partner quality", "Incentives may drift over time"],
            scores=(4, 7, 4, 4),
        ),
        _make_branch(
            title=f"Reframe {node.title}",
            description=f"Challenge the current framing and pursue the same goal through a different perspective.",
            action="Restate the problem from the user's perspective and generate one alternative path that changes the constraints.",
            short_term="You may uncover a cleaner path that was hidden by the original framing.",
            long_term="This can create better strategic leverage if the current framing is too narrow.",
            risks=["Can increase ambiguity", "May feel like restarting the conversation"],
            scores=(4, 8, 5, 4),
        ),
    ]
    return ExpandGeneration(children=candidates[:count])
