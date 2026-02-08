from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from backend.models import OfficialMapCache


OFFICIAL_MAP_CACHE_TTL_DAYS = 7


def _key_for_park_code(park_code: str) -> str:
    return f"official_maps:{(park_code or '').strip().lower()}"


def get_cached_pdf_url(db: Session, *, park_code: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Returns (pdf_url, full_name) if a fresh cached entry exists for park_code.
    """
    pc = (park_code or "").strip().lower()
    if not pc:
        return None

    key = _key_for_park_code(pc)
    row = db.query(OfficialMapCache).filter(OfficialMapCache.key == key).first()
    if not row or not row.pdf_url:
        return None

    fetched_at = row.fetched_at or datetime.utcnow()
    if datetime.utcnow() - fetched_at > timedelta(days=OFFICIAL_MAP_CACHE_TTL_DAYS):
        return None

    return (row.pdf_url, row.full_name)


def upsert_cached_pdf_url(
    db: Session,
    *,
    park_code: str,
    pdf_url: Optional[str],
    full_name: Optional[str] = None,
) -> None:
    pc = (park_code or "").strip().lower()
    if not pc:
        return

    key = _key_for_park_code(pc)
    row = db.query(OfficialMapCache).filter(OfficialMapCache.key == key).first()
    now = datetime.utcnow()
    if row:
        row.pdf_url = pdf_url
        row.full_name = full_name or row.full_name
        row.fetched_at = now
        row.updated_at = now
    else:
        row = OfficialMapCache(
            key=key,
            park_code=pc,
            full_name=full_name,
            pdf_url=pdf_url,
            fetched_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(row)

    db.commit()

