# Thinkr

Thinkr is a graph-first decision reasoning app. A user starts with a problem, Thinkr opens a root-node conversation, and only creates branches when the user explicitly asks to explore different approaches. The current app is designed for single-user local use and persists everything in a repo-local SQLite database.

This README is written as an onboarding document for both humans and LLM coding agents.

## One-Sentence Product

Thinkr is a visual AI thinking workspace where users reason through decisions in node-based conversations, then turn promising perspectives into explorable branches.

## Current Product Behavior

- `Analyze decision` does **not** generate a tree immediately.
- It creates a single root node and immediately opens the root conversation.
- The user prompt is auto-sent as the first chat message on that root node.
- Branches are created only when the user explicitly clicks to create them.
- The graph is still the main mental model, but chat is the entrypoint.
- Sessions are local-only and persist in `backend/data/thinkr.db`.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Flow
- Backend: FastAPI, Uvicorn
- AI: OpenAI or Anthropic, with deterministic fallback behavior when no live provider is configured
- Persistence: SQLite in the repo

## Repo Layout

```text
backend/
  main.py                  FastAPI app and route definitions
  check_provider.py        Quick live/provider health check script
  models/
    schemas.py             Shared API/data schemas
  services/
    ai.py                  LLM provider selection + prompting
    config.py              Env loading + API key normalization
    fallback.py            Deterministic fallback generation helpers
    store.py               SQLite-backed local session store
  data/
    thinkr.db              Local SQLite DB, created automatically

frontend/
  src/
    App.tsx                Page composition and header controls
    api/client.ts          HTTP client for backend routes
    hooks/useThinkr.ts     Main frontend state machine and workflows
    lib/layout.ts          React Flow node/edge layout helpers
    components/
      ProblemForm.tsx      Decision prompt entry UI
      DecisionTree.tsx     Graph surface wrapper
      DecisionNodeCard.tsx Individual graph node card
      ChatWorkspace.tsx    Node conversation workspace
      ComparisonPanel.tsx  Selected-branch comparison UI
      DecisionDetailsPanel.tsx Selected-node detail panel
      SummaryPanel.tsx     Summary/status panel
      ScorePill.tsx        Small score badge component
      Skeleton.tsx         Loading placeholder component
    types.ts               Frontend API and UI types
    index.css              Theme, layout, glass styling
```

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Create `backend/.env` only when you need LLM keys or overrides (see **Environment Rules** below).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` / `build` / `preview` use `../.tools/node/bin/node` with local Vite and TypeScript (repo-root `.tools` layout).

`frontend/.env` is optional: the app defaults `VITE_API_BASE_URL` to `http://localhost:8000`. Use repo-root `.env.example` only as a reference if you want to override.

Open `http://localhost:5173`.

## Environment Rules

- Put live LLM credentials in `backend/.env` or repo-root `.env`.
- Do **not** rely on `frontend/.env` for server-side AI calls.
- Placeholder keys such as `your_openai_api_key_here` are treated as empty.
- `LLM_PROVIDER=auto` prefers Anthropic when available, otherwise OpenAI.

Example backend env:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_real_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

THINKR_CORS_ORIGINS=http://localhost:5173
THINKR_MAX_NODES=40
VITE_API_BASE_URL=http://localhost:8000
```

## Architecture Overview

### Backend responsibilities

- Owns all session, node, message, and branch persistence.
- Owns all LLM prompting and provider selection.
- Returns graph nodes and conversation state to the frontend.
- Keeps the frontend relatively thin by exposing task-specific routes.

### Frontend responsibilities

- Manages current view mode: `graph` or `chat`.
- Hydrates the active local session on app load.
- Opens node conversations and caches them client-side.
- Renders the graph and handles node interactions.
- Provides session switching, creation, and deletion controls.

### Persistence model

- SQLite database path: `backend/data/thinkr.db`
- Sessions are local only.
- Exactly one session is active at a time.
- When the backend starts, the store ensures an active session exists.
- If the active session is deleted, another session becomes active automatically, or a new blank one is created.

## Core User Flows

### 1. Start a decision

Frontend:
- User types into `ProblemForm`.
- `useThinkr.analyze()` calls `POST /analyze`.
- After the root node comes back, the frontend auto-sends the same prompt to `POST /chat`.
- UI switches directly into `ChatWorkspace` for the root node.

Backend:
- `/analyze` clears the current active session tree and creates a fresh root node.
- `/chat` stores the user message, generates an assistant reply, and stores suggested perspectives.

Key files:
- `frontend/src/hooks/useThinkr.ts`
- `backend/main.py`

### 2. Open a node conversation

Frontend:
- Clicking a node opens chat mode for that node.
- `useThinkr.openConversation()` calls `GET /conversation/{node_id}` unless cached.

Backend:
- Returns the node, ancestor context summary, message history, and suggested perspectives.

### 3. Create branches from chat

Frontend:
- User clicks `Create top 4 branches` in `ChatWorkspace`.
- `useThinkr.createBranchesFromConversation()` calls `POST /branch-from-chat`.
- New children are merged into the in-memory frontend node list.

Backend:
- Uses node lineage + conversation history as context.
- Rejects branching if max depth or max node count is reached.
- Stores child nodes in SQLite.

### 4. Switch sessions

Frontend:
- Header dropdown is populated from `GET /sessions`.
- Selecting an item calls `POST /sessions/{session_id}/activate`.
- Hook reloads the active session and updates graph/chat state.

Backend:
- Marks all sessions inactive, then activates the selected one.

### 5. Delete a session

Frontend:
- Trash button beside the session dropdown deletes the currently selected session after confirmation.
- Calls `DELETE /sessions/{session_id}`.

Backend:
- Deletes that session from SQLite.
- Promotes another recent session to active, or creates a new blank session.

## Backend File Guide

### `backend/main.py`

This is the application entrypoint.

What lives here:
- FastAPI app setup
- CORS config
- singleton store + AI service instances
- route definitions
- helper functions like `_build_root_node()` and ancestor-context builders

Important routes:
- `GET /health`
- `GET /session/active`
- `GET /sessions`
- `POST /sessions/new`
- `POST /sessions/{session_id}/activate`
- `DELETE /sessions/{session_id}`
- `POST /analyze`
- `POST /expand`
- `POST /compare`
- `GET /conversation/{node_id}`
- `POST /chat`
- `POST /branch-from-chat`

Important behavior notes:
- `/analyze` currently returns only a root node, not a prebuilt branch set.
- `/expand` still exists, but the preferred UX path is conversation-driven branching via `/branch-from-chat`.

### `backend/services/store.py`

This is the local persistence layer.

What it stores:
- sessions
- nodes
- node risks
- messages
- suggested perspectives

Why it matters:
- All session switching behavior is here.
- This is the main seam for swapping SQLite to Postgres later.
- Route code depends on its method interface, so preserve compatibility if refactoring.

High-value methods:
- `create_new_session()`
- `list_sessions()`
- `activate_session()`
- `delete_session()`
- `get_active_session_snapshot()`
- `reset_problem()`
- `add_nodes()`
- `append_children()`
- `get_node()` / `get_all_nodes()` / `get_children()`
- `get_messages()` / `add_message()`
- `get_suggested_perspectives()` / `set_suggested_perspectives()`
- `lineage()`

### `backend/services/ai.py`

This is the LLM integration layer.

Responsibilities:
- resolve active provider
- normalize provider availability
- prompt OpenAI or Anthropic
- parse structured responses
- fall back gracefully when provider calls fail

Important methods:
- `analyze_problem()`
- `expand_node()`
- `chat_on_node()`
- `branch_from_conversation()`
- `compare_nodes()`

Important behavior notes:
- Chat prompt is intentionally conversational, not report-like.
- Branch generation prompt is intentionally graph-summary focused.
- If provider calls fail, this service returns deterministic fallback outputs.

### `backend/services/fallback.py`

Used when no live provider is available or structured calls fail.

Contains:
- fallback summary/branch generation
- fallback chat response
- branch candidate generation
- lineage summarization helpers
- node draft to node conversion helpers

### `backend/models/schemas.py`

Single source of truth for backend request/response schemas.

Includes:
- node types
- conversation payloads
- session payloads
- comparison payloads
- AI generation payloads

When changing API contracts, update this file first.

## Frontend File Guide

### `frontend/src/hooks/useThinkr.ts`

This is the frontend state orchestrator and the most important frontend file.

It owns:
- current prompt text
- all loaded nodes
- selected node and comparison state
- graph/chat mode
- active conversation cache
- active session hydration
- session switching/new/delete flows
- analyze/chat/branch/compare actions

If an LLM needs to change product behavior, this is usually the first frontend file to inspect.

High-value actions:
- `analyze()`
- `openConversation()`
- `sendMessage()`
- `createBranchesFromConversation()`
- `startTopBranches()`
- `startNewSession()`
- `switchSession()`
- `deleteSelectedSession()`
- `loadActiveSessionState()`

### `frontend/src/App.tsx`

Top-level composition layer.

It wires together:
- header controls
- session dropdown and delete/new buttons
- problem form
- graph area
- chat workspace
- side panels

This is the best place to adjust high-level page layout.

### `frontend/src/api/client.ts`

Thin fetch wrapper for backend requests.

If you add a backend route, add the matching frontend call here.

### `frontend/src/lib/layout.ts`

Graph layout helpers for React Flow.

Contains:
- initial node positioning
- edge generation
- collapsed-descendant hiding logic

If graph spacing or layout logic looks wrong, inspect this file first.

### `frontend/src/components/ChatWorkspace.tsx`

Main node conversation UI.

Contains:
- message list
- ancestor context display
- suggested perspectives
- branch creation CTA
- switch-back-to-graph CTA

### `frontend/src/components/DecisionTree.tsx`

Wrapper around React Flow graph rendering.

### `frontend/src/components/DecisionNodeCard.tsx`

Visual node card in the graph.

Important UX behavior:
- clicking a node opens its conversation
- compare and collapse controls live here

### `frontend/src/components/ProblemForm.tsx`

Prompt-entry UI.

Current copy intentionally reflects the new product behavior: start with chat first, branch later.

## API Summary

### Session routes

- `GET /session/active`
  - returns the active persisted session snapshot
- `GET /sessions`
  - returns all local sessions, newest first
- `POST /sessions/new`
  - creates a new blank active session
- `POST /sessions/{session_id}/activate`
  - activates a saved session
- `DELETE /sessions/{session_id}`
  - deletes a session and reassigns the active one

### Decision routes

- `POST /analyze`
  - resets the active session tree and creates a new root node
- `POST /expand`
  - legacy/manual node expansion route
- `POST /compare`
  - compares 2–3 nodes

### Conversation routes

- `GET /conversation/{node_id}`
  - loads a node’s messages and ancestor summary
- `POST /chat`
  - appends a user message and assistant reply to a node
- `POST /branch-from-chat`
  - creates branches from a node conversation

## Data Model Notes

### Node

Important fields:
- `id`
- `parent_id`
- `title`
- `description`
- `depth`
- `risk_score`
- `reward_score`
- `effort_score`
- `time_score`
- `children`
- `immediate_action`
- `short_term_outcome`
- `long_term_outcome`
- `risks`
- `uncertainty`

### Session naming

- A new empty session gets a timestamp title.
- After `analyze`, the active session title is updated to the prompt text, trimmed to about 120 chars.
- Session dropdown labels therefore usually match the decision problem.

## Important Constraints and Guardrails

- Max branch depth: `5`
- Max node count per active decision tree: `THINKR_MAX_NODES`, default `40`
- Branching should remain explicit; avoid reintroducing automatic tree generation on analyze unless intentionally changing product direction.
- Root chat is the current default entry flow; do not assume the graph is shown first after analyze.
- The current app is local-first and single-user; there is no auth or multi-tenant logic.

## Known Product Intent

These are current intentional UX decisions and should be preserved unless explicitly changed:

- Graph mode is core, but chat opens first from a fresh decision.
- Nodes are short graph summaries; richer reasoning lives in chat.
- Every node conversation should include ancestor context up to the root.
- AI should feel like a strategic thinking partner, not a generic chatbot.
- Branches should be created only when the user asks for them.

## Common Change Tasks

### Add a new backend route

1. Add schema in `backend/models/schemas.py`
2. Add route in `backend/main.py`
3. Extend persistence in `backend/services/store.py` if needed
4. Add frontend client in `frontend/src/api/client.ts`
5. Wire behavior in `frontend/src/hooks/useThinkr.ts`

### Change prompting behavior

1. Update prompts in `backend/services/ai.py`
2. Keep fallback behavior compatible in `backend/services/fallback.py`
3. Validate with live provider and fallback provider states

### Change session behavior

1. Update `backend/services/store.py`
2. Update routes in `backend/main.py`
3. Update session types in `frontend/src/types.ts`
4. Update orchestration in `frontend/src/hooks/useThinkr.ts`
5. Update header UI in `frontend/src/App.tsx`

### Change graph layout or node visuals

1. Layout logic: `frontend/src/lib/layout.ts`
2. Graph wrapper: `frontend/src/components/DecisionTree.tsx`
3. Node visuals: `frontend/src/components/DecisionNodeCard.tsx`
4. Page composition: `frontend/src/App.tsx`
5. Theme and glass styling: `frontend/src/index.css`

## Debugging Tips

### Provider debugging

From `backend/`:

```bash
source .venv/bin/activate
python check_provider.py
python check_provider.py --live
```

### Session/API debugging

Useful local checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/session/active
curl http://localhost:8000/sessions
```

### If session switch/delete returns 404

Usually one of these:
- backend was not restarted after route changes
- frontend is holding a stale session id
- selected session was already deleted from SQLite

Quick fix:
1. restart backend
2. hard refresh frontend
3. retry with the refreshed session list

## Validation Commands

### Backend compile

```bash
cd backend
source .venv/bin/activate
python -m compileall main.py services models
```

### Frontend build

```bash
cd frontend
../.tools/node/bin/node ./node_modules/typescript/bin/tsc -b
../.tools/node/bin/node ./node_modules/vite/bin/vite.js build
```

## Files Safe to Ignore When Onboarding

- `backend/.venv/`
- `backend/__pycache__/`
- `backend/data/thinkr.db` as code, though it matters as runtime state
- frontend build artifacts under `frontend/dist/`

## In Short

If you are an LLM starting work on this repo:

1. Read `backend/main.py`
2. Read `backend/services/store.py`
3. Read `backend/services/ai.py`
4. Read `frontend/src/hooks/useThinkr.ts`
5. Read `frontend/src/App.tsx`

Those five files explain most of the current product behavior.
