from __future__ import annotations

import argparse
import json
from typing import Any, Dict

from services.ai import DecisionAIService


def _openai_live_check(service: DecisionAIService) -> Dict[str, Any]:
    if service.client is None:
        return {"ok": False, "message": "OpenAI client is not configured."}

    try:
        response = service.client.responses.create(
            model=service.openai_model,
            input="Reply with OK only.",
            max_output_tokens=8,
        )
        output_text = getattr(response, "output_text", "") or ""
        return {
            "ok": True,
            "message": "OpenAI live check succeeded.",
            "response_preview": output_text.strip()[:80],
        }
    except Exception as exc:
        return {"ok": False, "message": f"OpenAI live check failed: {exc}"}


def _anthropic_live_check(service: DecisionAIService) -> Dict[str, Any]:
    try:
        response = service._anthropic_request(
            {
                "model": service.anthropic_model,
                "max_tokens": 16,
                "messages": [{"role": "user", "content": "Reply with OK only."}],
            }
        )
        text_blocks = [block.get("text", "") for block in response.get("content", []) if block.get("type") == "text"]
        return {
            "ok": True,
            "message": "Anthropic live check succeeded.",
            "response_preview": " ".join(text_blocks).strip()[:80],
        }
    except Exception as exc:
        return {"ok": False, "message": f"Anthropic live check failed: {exc}"}


def build_status(service: DecisionAIService, live: bool) -> Dict[str, Any]:
    status: Dict[str, Any] = {
        "provider": service.active_provider,
        "configured": {
            "openai": bool(service.openai_api_key),
            "anthropic": bool(service.anthropic_api_key),
        },
        "models": {
            "openai": service.openai_model,
            "anthropic": service.anthropic_model,
        },
        "live": live,
    }

    if not live:
        return status

    if service.active_provider == "openai":
        status.update(_openai_live_check(service))
    elif service.active_provider == "anthropic":
        status.update(_anthropic_live_check(service))
    else:
        status.update(
            {
                "ok": True,
                "message": "No LLM provider configured. Thinkr will use fallback generation.",
            }
        )

    return status


def main() -> None:
    parser = argparse.ArgumentParser(description="Check the active Thinkr LLM provider.")
    parser.add_argument("--live", action="store_true", help="Perform a minimal live API call with the active provider.")
    args = parser.parse_args()

    service = DecisionAIService()
    print(json.dumps(build_status(service, args.live), indent=2))


if __name__ == "__main__":
    main()
