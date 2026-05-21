from __future__ import annotations

import json
from pathlib import Path

from v2_workflow import competitive_analysis_v2


REQUEST = "Create a competitive analysis comparing Linear and Asana for product development teams."


def _load_seed_records() -> list[dict]:
    path = Path(__file__).resolve().parents[1] / "examples" / "v2_seed_records.json"
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    empty_state = competitive_analysis_v2.invoke({"request": REQUEST})
    assert empty_state["quality_review"]["passed"] is False
    assert empty_state["revision_count"] == 1
    assert len(empty_state.get("trace", [])) >= 6

    seed_state = competitive_analysis_v2.invoke(
        {
            "request": REQUEST,
            "seed_records": _load_seed_records(),
            "llm_analysis": True,
        }
    )
    assert seed_state["quality_review"]["passed"] is True
    assert seed_state["revision_count"] == 0
    assert len(seed_state["knowledge_base"]["sources"]) == 4
    assert len(seed_state["knowledge_base"]["evidence"]) == 4
    assert len(seed_state["knowledge_base"]["claims"]) == 4
    assert "Source Quality" in seed_state["report_draft"]["markdown"]
    assert "Company Fact Sheets" in seed_state["report_draft"]["markdown"]

    print("V2 smoke test passed")
    print(f"empty_trace={len(empty_state.get('trace', []))}")
    print(f"seed_trace={len(seed_state.get('trace', []))}")
    print(f"seed_claims={len(seed_state['knowledge_base']['claims'])}")


if __name__ == "__main__":
    main()
