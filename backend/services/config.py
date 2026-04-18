from __future__ import annotations

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


_PLACEHOLDER_MARKERS = (
    "your_",
    "placeholder",
    "example",
    "replace_me",
    "changeme",
    "dummy",
)


def load_thinkr_env() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(repo_root / "backend" / ".env", override=False)


def normalize_api_key(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    stripped = value.strip()
    if not stripped:
        return None

    lowered = stripped.lower()
    if any(marker in lowered for marker in _PLACEHOLDER_MARKERS):
        return None

    return stripped
