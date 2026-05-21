from __future__ import annotations

import json
import os
import traceback
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from v2_workflow import competitive_analysis_v2


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEED_RECORDS_PATH = BACKEND_ROOT / "examples" / "v2_seed_records.json"


def _load_default_seed_records() -> list[dict[str, Any]]:
    if not DEFAULT_SEED_RECORDS_PATH.exists():
        return []
    return json.loads(DEFAULT_SEED_RECORDS_PATH.read_text(encoding="utf-8"))


def _json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


def _bool_from_payload(payload: dict[str, Any], name: str, default: bool = False) -> bool:
    value = payload.get(name, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def run_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    request = str(payload.get("request") or payload.get("message") or "").strip()
    if not request:
        raise ValueError("Missing required field: request")

    seed_records = payload.get("seed_records")
    if seed_records is None and _bool_from_payload(payload, "use_default_seed_records", True):
        seed_records = _load_default_seed_records()
    if seed_records is None:
        seed_records = []
    if not isinstance(seed_records, list):
        raise ValueError("seed_records must be a list when provided")

    state = competitive_analysis_v2.invoke(
        {
            "request": request,
            "live_collection": _bool_from_payload(payload, "live_collection", False),
            "llm_analysis": _bool_from_payload(payload, "llm_analysis", False),
            "seed_records": seed_records,
            "max_search_queries": int(payload.get("max_search_queries") or 6),
            "query_cache": not _bool_from_payload(payload, "disable_query_cache", False),
            "query_cache_dir": str(payload.get("query_cache_dir") or "../.dca_cache/v2_queries"),
        }
    )

    knowledge_base = state.get("knowledge_base", {})
    report_draft = state.get("report_draft", {})

    response: dict[str, Any] = {
        "mode": "python-langgraph-v2",
        "workflow": "competitive_analysis_v2",
        "report": report_draft.get("markdown", ""),
        "qa": state.get("quality_review", {}),
        "trace": state.get("trace", []),
        "artifacts": state.get("artifacts", []),
        "sources": knowledge_base.get("sources", []),
        "evidence": knowledge_base.get("evidence", []),
        "claims": knowledge_base.get("claims", []),
        "revision_count": state.get("revision_count", 0),
    }

    if _bool_from_payload(payload, "include_state", False):
        response["state"] = state

    return response


class CompetitiveAnalysisHandler(BaseHTTPRequestHandler):
    server_version = "CompetitiveAnalysisHTTP/0.1"

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = _json_bytes(payload)
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", os.getenv("DCA_ALLOWED_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send_json(HTTPStatus.NO_CONTENT, {})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in {"/", "/health"}:
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "service": "competitive-analysis-agent",
                    "workflow": "competitive_analysis_v2",
                },
            )
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {path}"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in {"/analyze", "/api/analyze"}:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {path}"})
            return

        try:
            content_length = int(self.headers.get("Content-Length") or "0")
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Invalid JSON: {exc}"})
            return

        try:
            self._send_json(HTTPStatus.OK, run_analysis(payload))
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except Exception as exc:
            error_payload: dict[str, Any] = {"error": str(exc)}
            if os.getenv("DCA_DEBUG", "").strip().lower() in {"1", "true", "yes"}:
                error_payload["traceback"] = traceback.format_exc()
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, error_payload)

    def log_message(self, format: str, *args: Any) -> None:
        if os.getenv("DCA_HTTP_QUIET", "").strip().lower() in {"1", "true", "yes"}:
            return
        super().log_message(format, *args)


def main() -> None:
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8011"))
    server = ThreadingHTTPServer((host, port), CompetitiveAnalysisHandler)
    print(f"Competitive Analysis backend listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
