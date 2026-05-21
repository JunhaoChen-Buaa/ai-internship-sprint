from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from v2_workflow import competitive_analysis_v2


def _load_seed_records(path: str | None) -> list[dict]:
    if not path:
        return []
    seed_path = Path(path)
    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")
    return json.loads(seed_path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Competitive Analysis V2 workflow.")
    parser.add_argument("request", help="Competitive analysis request.")
    parser.add_argument("--live", action="store_true", help="Enable live Perplexity-backed collection.")
    parser.add_argument("--llm-analysis", action="store_true", help="Generate claims with an LLM when OPENAI_API_KEY is set.")
    parser.add_argument("--seed-records", help="Path to a JSON list of seeded source/evidence records.")
    parser.add_argument("--max-search-queries", type=int, default=6)
    parser.add_argument("--no-cache", action="store_true", help="Disable live query cache.")
    parser.add_argument("--cache-dir", default="../.dca_cache/v2_queries")
    parser.add_argument("--out-dir", default="../run_outputs/v2")
    args = parser.parse_args()

    state = competitive_analysis_v2.invoke(
        {
            "request": args.request,
            "live_collection": args.live,
            "llm_analysis": args.llm_analysis,
            "seed_records": _load_seed_records(args.seed_records),
            "max_search_queries": args.max_search_queries,
            "query_cache": not args.no_cache,
            "query_cache_dir": args.cache_dir,
        }
    )

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.out_dir).resolve() / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    report_path = out_dir / "report.md"
    state_path = out_dir / "state.json"
    trace_path = out_dir / "trace.json"
    artifacts_path = out_dir / "artifacts.json"

    report_path.write_text(state["report_draft"]["markdown"], encoding="utf-8")
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    trace_path.write_text(json.dumps(state.get("trace", []), ensure_ascii=False, indent=2), encoding="utf-8")
    artifacts_path.write_text(json.dumps(state.get("artifacts", []), ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Output directory: {out_dir}")
    print(f"Report: {report_path}")
    print(f"Trace events: {len(state.get('trace', []))}")
    print(f"Artifacts: {len(state.get('artifacts', []))}")
    print(f"QA passed: {state['quality_review']['passed']}")
    print(f"Revision count: {state.get('revision_count', 0)}")


if __name__ == "__main__":
    main()
