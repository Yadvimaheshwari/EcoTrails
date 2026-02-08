from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional


def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\\s]+", " ", s)
    s = re.sub(r"\\s+", " ", s).strip()
    return s


def score_full_name_match(query: str, full_name: str) -> int:
    """
    Returns 0-100 score for how well full_name matches query.
    Case-insensitive, based on SequenceMatcher + substring bonuses.
    """
    q = _norm(query)
    n = _norm(full_name)
    if not q or not n:
        return 0
    if q == n:
        return 100
    ratio = SequenceMatcher(None, q, n).ratio()
    score = int(round(ratio * 100))
    if q in n or n in q:
        score = min(100, score + 15)
    # If all query tokens appear, small bump
    q_tokens = set(q.split())
    n_tokens = set(n.split())
    if q_tokens and q_tokens.issubset(n_tokens):
        score = min(100, score + 10)
    return max(0, min(100, score))


@dataclass(frozen=True)
class NPSParkSelection:
    park_code: str
    full_name: str
    score: int


def select_best_nps_park(
    query: str,
    parks: List[Dict[str, Any]],
    *,
    min_score: int = 50,
) -> Optional[NPSParkSelection]:
    """
    parks expected to contain keys like:
      - fullName + parkCode (raw NPS API)
      - or name + id (our normalized NPSService output)
    """
    best: Optional[NPSParkSelection] = None
    for p in parks or []:
        full_name = (p.get("fullName") or p.get("name") or "").strip()
        park_code = (p.get("parkCode") or p.get("id") or "").strip().lower()
        if not full_name or not park_code:
            continue
        s = score_full_name_match(query, full_name)
        if best is None or s > best.score:
            best = NPSParkSelection(park_code=park_code, full_name=full_name, score=s)

    if best is None:
        return None
    if best.score < int(min_score):
        return None
    return best

