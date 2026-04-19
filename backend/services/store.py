from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Set

from models.schemas import BranchPreview, BranchPreviewDraft, ConversationMessage, DecisionNode, SessionSummary


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SQLiteDecisionStore:
    def __init__(self, db_path: Optional[str] = None) -> None:
        default_path = Path(__file__).resolve().parents[1] / "data" / "thinkr.db"
        self.db_path = Path(db_path) if db_path else default_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._ensure_active_session()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    problem TEXT,
                    is_active INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    parent_id TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    depth INTEGER NOT NULL,
                    risk_score INTEGER NOT NULL,
                    reward_score INTEGER NOT NULL,
                    effort_score INTEGER NOT NULL,
                    time_score INTEGER NOT NULL,
                    immediate_action TEXT,
                    short_term_outcome TEXT,
                    long_term_outcome TEXT,
                    uncertainty TEXT,
                    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY(parent_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_nodes_session_parent ON nodes(session_id, parent_id);

                CREATE TABLE IF NOT EXISTS node_risks (
                    node_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    risk TEXT NOT NULL,
                    PRIMARY KEY (node_id, position),
                    FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_messages_session_node_created ON messages(session_id, node_id, created_at);

                CREATE TABLE IF NOT EXISTS suggested_perspectives (
                    node_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    suggestion TEXT NOT NULL,
                    PRIMARY KEY (node_id, position),
                    FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS branch_previews (
                    id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    immediate_action TEXT,
                    FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_branch_previews_node ON branch_previews(node_id, position);
                """
            )

    def _ensure_active_session(self) -> str:
        session_id = self.active_session_id()
        if session_id:
            return session_id
        return self.create_new_session()

    def active_session_id(self) -> str:
        with self._connect() as connection:
            row = connection.execute("SELECT id FROM sessions WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1").fetchone()
        return row["id"] if row else ""

    def active_session_title(self) -> str:
        with self._connect() as connection:
            row = connection.execute("SELECT title FROM sessions WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1").fetchone()
        return row["title"] if row else "Current session"

    def create_new_session(self, title: Optional[str] = None) -> str:
        session_id = str(uuid.uuid4())
        timestamp = _utc_now()
        session_title = title or f"Session {timestamp[:19].replace('T', ' ')}"
        with self._connect() as connection:
            connection.execute("UPDATE sessions SET is_active = 0")
            connection.execute(
                "INSERT INTO sessions (id, title, problem, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
                (session_id, session_title, None, timestamp, timestamp),
            )
        return session_id

    def list_sessions(self) -> List[SessionSummary]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT id, title, is_active, updated_at FROM sessions ORDER BY updated_at DESC, created_at DESC"
            ).fetchall()
        return [
            SessionSummary(
                session_id=row["id"],
                title=row["title"],
                is_active=bool(row["is_active"]),
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    def activate_session(self, session_id: str) -> bool:
        timestamp = _utc_now()
        with self._connect() as connection:
            existing = connection.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if not existing:
                return False
            connection.execute("UPDATE sessions SET is_active = 0")
            connection.execute(
                "UPDATE sessions SET is_active = 1, updated_at = ? WHERE id = ?",
                (timestamp, session_id),
            )
        return True

    def delete_session(self, session_id: str) -> dict | None:
        timestamp = _utc_now()
        with self._connect() as connection:
            existing = connection.execute(
                "SELECT id, is_active FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if not existing:
                return None

            connection.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

            next_active = connection.execute(
                "SELECT id, title FROM sessions ORDER BY updated_at DESC, created_at DESC LIMIT 1"
            ).fetchone()

            if next_active is None:
                new_session_id = str(uuid.uuid4())
                new_title = f"Session {timestamp[:19].replace('T', ' ')}"
                connection.execute(
                    "INSERT INTO sessions (id, title, problem, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
                    (new_session_id, new_title, None, timestamp, timestamp),
                )
                return {
                    "deleted_session_id": session_id,
                    "active_session_id": new_session_id,
                    "active_session_title": new_title,
                }

            connection.execute("UPDATE sessions SET is_active = 0")
            connection.execute(
                "UPDATE sessions SET is_active = 1, updated_at = ? WHERE id = ?",
                (timestamp, next_active["id"]),
            )
            return {
                "deleted_session_id": session_id,
                "active_session_id": next_active["id"],
                "active_session_title": next_active["title"],
            }

    def get_active_session_snapshot(self) -> dict:
        session_id = self._ensure_active_session()
        return {
            "session_id": session_id,
            "title": self.active_session_title(),
            "nodes": self.get_all_nodes(),
            "active_root_node_id": self.get_root_node_id(),
        }

    def reset_problem(self, problem: str) -> None:
        session_id = self._ensure_active_session()
        timestamp = _utc_now()
        title = problem.strip()[:120] or "Untitled decision"
        with self._connect() as connection:
            connection.execute("DELETE FROM nodes WHERE session_id = ?", (session_id,))
            connection.execute(
                "UPDATE sessions SET problem = ?, title = ?, updated_at = ? WHERE id = ?",
                (problem, title, timestamp, session_id),
            )

    def add_nodes(self, nodes: List[DecisionNode], problem: Optional[str] = None) -> None:
        session_id = self._ensure_active_session()
        timestamp = _utc_now()
        with self._connect() as connection:
            for node in nodes:
                connection.execute(
                    """
                    INSERT OR REPLACE INTO nodes (
                        id, session_id, parent_id, title, description, depth,
                        risk_score, reward_score, effort_score, time_score,
                        immediate_action, short_term_outcome, long_term_outcome, uncertainty
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        node.id,
                        session_id,
                        node.parent_id,
                        node.title,
                        node.description,
                        node.depth,
                        node.risk_score,
                        node.reward_score,
                        node.effort_score,
                        node.time_score,
                        node.immediate_action,
                        node.short_term_outcome,
                        node.long_term_outcome,
                        node.uncertainty,
                    ),
                )
                connection.execute("DELETE FROM node_risks WHERE node_id = ?", (node.id,))
                for index, risk in enumerate(node.risks):
                    connection.execute(
                        "INSERT INTO node_risks (node_id, position, risk) VALUES (?, ?, ?)",
                        (node.id, index, risk),
                    )
                connection.execute("DELETE FROM suggested_perspectives WHERE node_id = ?", (node.id,))

            if problem and nodes:
                root = next((node for node in nodes if node.parent_id is None), nodes[0])
                connection.execute(
                    "UPDATE sessions SET problem = ?, title = ?, updated_at = ? WHERE id = ?",
                    (problem, problem.strip()[:120] or root.title, timestamp, session_id),
                )
            else:
                connection.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (timestamp, session_id))

    def node_exists(self, node_id: str) -> bool:
        return self.get_node(node_id) is not None

    def get_node(self, node_id: str) -> Optional[DecisionNode]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM nodes WHERE session_id = ? AND id = ?", (session_id, node_id)).fetchone()
            if not row:
                return None
            children = [child["id"] for child in connection.execute(
                "SELECT id FROM nodes WHERE session_id = ? AND parent_id = ? ORDER BY rowid ASC",
                (session_id, node_id),
            ).fetchall()]
            risks = [risk["risk"] for risk in connection.execute(
                "SELECT risk FROM node_risks WHERE node_id = ? ORDER BY position ASC",
                (node_id,),
            ).fetchall()]
        return self._row_to_node(row, children, risks)

    def get_nodes(self, node_ids: List[str]) -> List[DecisionNode]:
        return [node for node_id in node_ids if (node := self.get_node(node_id)) is not None]

    def get_all_nodes(self) -> List[DecisionNode]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM nodes WHERE session_id = ? ORDER BY depth ASC, rowid ASC",
                (session_id,),
            ).fetchall()
            children_rows = connection.execute(
                "SELECT parent_id, id FROM nodes WHERE session_id = ? AND parent_id IS NOT NULL ORDER BY rowid ASC",
                (session_id,),
            ).fetchall()
            risk_rows = connection.execute(
                "SELECT node_id, risk FROM node_risks WHERE node_id IN (SELECT id FROM nodes WHERE session_id = ?) ORDER BY node_id ASC, position ASC",
                (session_id,),
            ).fetchall()

        child_map: dict[str, List[str]] = {}
        for row in children_rows:
            child_map.setdefault(row["parent_id"], []).append(row["id"])

        risk_map: dict[str, List[str]] = {}
        for row in risk_rows:
            risk_map.setdefault(row["node_id"], []).append(row["risk"])

        return [self._row_to_node(row, child_map.get(row["id"], []), risk_map.get(row["id"], [])) for row in rows]

    def get_children(self, node_id: str) -> List[DecisionNode]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            child_rows = connection.execute(
                "SELECT * FROM nodes WHERE session_id = ? AND parent_id = ? ORDER BY rowid ASC",
                (session_id, node_id),
            ).fetchall()
            risk_rows = connection.execute(
                "SELECT node_id, risk FROM node_risks WHERE node_id IN (SELECT id FROM nodes WHERE session_id = ? AND parent_id = ?) ORDER BY node_id ASC, position ASC",
                (session_id, node_id),
            ).fetchall()

        risk_map: dict[str, List[str]] = {}
        for row in risk_rows:
            risk_map.setdefault(row["node_id"], []).append(row["risk"])

        children: List[DecisionNode] = []
        for row in child_rows:
            grandchild_ids = [child["id"] for child in self.get_children_ids(row["id"])]
            children.append(self._row_to_node(row, grandchild_ids, risk_map.get(row["id"], [])))
        return children

    def get_children_ids(self, node_id: str) -> List[sqlite3.Row]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            return connection.execute(
                "SELECT id FROM nodes WHERE session_id = ? AND parent_id = ? ORDER BY rowid ASC",
                (session_id, node_id),
            ).fetchall()

    def append_children(self, parent_id: str, children: List[DecisionNode]) -> None:
        self.add_nodes(children)

    def total_nodes_for_problem(self, problem: str) -> int:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            row = connection.execute(
                "SELECT COUNT(*) AS total FROM nodes WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        return int(row["total"]) if row else 0

    def problem_for_node(self, node_id: str) -> Optional[str]:
        if not self.get_node(node_id):
            return None
        with self._connect() as connection:
            row = connection.execute("SELECT problem FROM sessions WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1").fetchone()
        return row["problem"] if row and row["problem"] else None

    def lineage(self, node_id: str) -> List[DecisionNode]:
        chain: List[DecisionNode] = []
        current = self.get_node(node_id)
        while current:
            chain.append(current)
            current = self.get_node(current.parent_id) if current.parent_id else None
        return list(reversed(chain))

    def get_messages(self, node_id: str) -> List[ConversationMessage]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT id, role, content FROM messages WHERE session_id = ? AND node_id = ? ORDER BY created_at ASC, rowid ASC",
                (session_id, node_id),
            ).fetchall()
        return [ConversationMessage(id=row["id"], role=row["role"], content=row["content"]) for row in rows]

    def add_message(self, node_id: str, role: str, content: str) -> ConversationMessage:
        session_id = self._ensure_active_session()
        message = ConversationMessage(id=str(uuid.uuid4()), role=role, content=content)
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO messages (id, session_id, node_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (message.id, session_id, node_id, role, content, _utc_now()),
            )
            connection.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (_utc_now(), session_id))
        return message

    def replace_messages(self, node_id: str, messages: List[ConversationMessage]) -> None:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            connection.execute("DELETE FROM messages WHERE session_id = ? AND node_id = ?", (session_id, node_id))
            for message in messages:
                connection.execute(
                    "INSERT INTO messages (id, session_id, node_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (message.id, session_id, node_id, message.role, message.content, _utc_now()),
                )

    def get_suggested_perspectives(self, node_id: str) -> List[str]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT suggestion FROM suggested_perspectives WHERE node_id = ? ORDER BY position ASC",
                (node_id,),
            ).fetchall()
        return [row["suggestion"] for row in rows]

    def set_suggested_perspectives(self, node_id: str, suggestions: List[str]) -> None:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            connection.execute("DELETE FROM suggested_perspectives WHERE node_id = ?", (node_id,))
            for index, suggestion in enumerate(suggestions):
                connection.execute(
                    "INSERT INTO suggested_perspectives (node_id, position, suggestion) VALUES (?, ?, ?)",
                    (node_id, index, suggestion),
                )
            connection.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (_utc_now(), session_id))

    def clear_branch_previews(self, node_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM branch_previews WHERE node_id = ?", (node_id,))

    def set_branch_previews(self, node_id: str, previews: List[BranchPreviewDraft]) -> None:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            connection.execute("DELETE FROM branch_previews WHERE node_id = ?", (node_id,))
            for index, preview in enumerate(previews):
                connection.execute(
                    "INSERT INTO branch_previews (id, node_id, position, title, description, immediate_action) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        str(uuid.uuid4()),
                        node_id,
                        index,
                        preview.title,
                        preview.description,
                        preview.immediate_action or None,
                    ),
                )
            connection.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (_utc_now(), session_id))

    def get_branch_previews(self, node_id: str) -> List[BranchPreview]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT id, title, description, immediate_action FROM branch_previews WHERE node_id = ? ORDER BY position ASC",
                (node_id,),
            ).fetchall()
        return [
            BranchPreview(
                id=row["id"],
                title=row["title"],
                description=row["description"],
                immediate_action=row["immediate_action"],
            )
            for row in rows
        ]

    def get_branch_preview(self, preview_id: str) -> Optional[BranchPreview]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT id, node_id, title, description, immediate_action FROM branch_previews WHERE id = ?",
                (preview_id,),
            ).fetchone()
        if not row:
            return None
        return BranchPreview(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            immediate_action=row["immediate_action"],
        )

    def get_branch_preview_node_id(self, preview_id: str) -> Optional[str]:
        with self._connect() as connection:
            row = connection.execute("SELECT node_id FROM branch_previews WHERE id = ?", (preview_id,)).fetchone()
        return row["node_id"] if row else None

    def delete_branch_preview(self, preview_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM branch_previews WHERE id = ?", (preview_id,))
            return cursor.rowcount > 0

    def get_root_node_id(self) -> Optional[str]:
        session_id = self._ensure_active_session()
        with self._connect() as connection:
            row = connection.execute(
                "SELECT id FROM nodes WHERE session_id = ? AND parent_id IS NULL ORDER BY rowid ASC LIMIT 1",
                (session_id,),
            ).fetchone()
        return row["id"] if row else None

    def _row_to_node(self, row: sqlite3.Row, children: List[str], risks: List[str]) -> DecisionNode:
        return DecisionNode(
            id=row["id"],
            parent_id=row["parent_id"],
            title=row["title"],
            description=row["description"],
            depth=row["depth"],
            risk_score=row["risk_score"],
            reward_score=row["reward_score"],
            effort_score=row["effort_score"],
            time_score=row["time_score"],
            children=children,
            immediate_action=row["immediate_action"],
            short_term_outcome=row["short_term_outcome"],
            long_term_outcome=row["long_term_outcome"],
            risks=risks,
            uncertainty=row["uncertainty"],
        )

    def _collect_subtree_ids(self, root_id: str) -> Set[str]:
        seen: Set[str] = set()
        stack = [root_id]
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            stack.extend(child["id"] for child in self.get_children_ids(current))
        return seen
