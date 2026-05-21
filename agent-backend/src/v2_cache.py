from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class QueryCache:
    def __init__(self, cache_dir: str | Path = "../.dca_cache/v2_queries") -> None:
        self.cache_dir = Path(cache_dir).resolve()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _path_for_query(self, query: str) -> Path:
        digest = hashlib.sha256(query.encode("utf-8")).hexdigest()[:24]
        return self.cache_dir / f"{digest}.json"

    def get(self, query: str) -> Any | None:
        path = self._path_for_query(query)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def set(self, query: str, results: Any) -> None:
        payload = {
            "query": query,
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
        self._path_for_query(query).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
