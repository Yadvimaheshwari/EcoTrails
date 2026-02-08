"""
Offline Maps Service (Official PDF/JPG packs per park)

Responsibilities:
- Resolve official printable map URLs for a park (NPS PDFs when available)
- Download assets via streaming with safety checks (size, content-type, retries)
- Persist assets and statuses in the database
"""

import os
import json
import time
import hashlib
import logging
import pathlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests
from sqlalchemy.orm import Session
from difflib import SequenceMatcher

from backend.models import Place, OfflineMapAsset
from backend.official_map_service import NPS_MAP_DATABASE, discover_best_pdf_url
from backend.official_map_cache import get_cached_pdf_url, upsert_cached_pdf_url

logger = logging.getLogger("EcoAtlas.OfflineMaps")


DEFAULT_STORAGE_PATH_CANDIDATES = [
    "./apps/web/public/offline-maps",  # dev-friendly
    "./uploads/offline-maps",
]


def _get_storage_root() -> pathlib.Path:
    env_path = os.environ.get("OFFLINE_MAPS_STORAGE_PATH")
    if env_path:
        return pathlib.Path(env_path).expanduser().resolve()

    for c in DEFAULT_STORAGE_PATH_CANDIDATES:
        p = pathlib.Path(c).expanduser().resolve()
        # Prefer an existing path; otherwise allow the first candidate.
        if p.exists():
            return p
    return pathlib.Path(DEFAULT_STORAGE_PATH_CANDIDATES[0]).expanduser().resolve()


def _safe_ext_from_type(file_type: str) -> str:
    ft = (file_type or "").lower().strip()
    if ft == "pdf":
        return ".pdf"
    if ft in ("jpg", "jpeg"):
        return ".jpg"
    if ft == "png":
        return ".png"
    return ".bin"


def _guess_file_type_from_headers(content_type: str, url: str) -> str:
    ct = (content_type or "").lower()
    if "application/pdf" in ct:
        return "pdf"
    if "image/jpeg" in ct or "image/jpg" in ct:
        return "jpg"
    if "image/png" in ct:
        return "png"

    # fallback by URL suffix
    u = (url or "").lower()
    if ".pdf" in u:
        return "pdf"
    if ".jpg" in u or ".jpeg" in u:
        return "jpg"
    if ".png" in u:
        return "png"
    return "pdf"


def _load_seed_sources() -> Dict[str, Any]:
    """
    Load seeds/offline_map_sources.json if present.
    Shape:
      {
        "parks": {
          "yose": [{"title": "...", "url": "...", "fileType": "pdf"}],
          ...
        }
      }
    """
    candidates = [
        pathlib.Path("./seeds/offline_map_sources.json"),
        pathlib.Path("./offline_map_sources.json"),
    ]
    for p in candidates:
        try:
            if p.exists():
                data = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning(f"Failed reading seed sources from {p}: {e}")
    return {"parks": {}}


def _norm(s: str) -> str:
    s = (s or "").lower().strip()
    return " ".join("".join(ch if ch.isalnum() else " " for ch in s).split())


async def resolve_nps_park_code(place: Place) -> Optional[str]:
    """
    Best-effort: get NPS parkCode from Place metadata or NPS API.
    """
    # NOTE: do not trust meta park codes; derive from NPS API per request.
    nps_api_key = os.environ.get("NPS_API_KEY")
    if not nps_api_key or not place.name:
        return None

    try:
        resp = requests.get(
            "https://developer.nps.gov/api/v1/parks",
            params={"q": place.name, "limit": 8, "api_key": nps_api_key},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        parks = resp.json().get("data", []) or []
    except Exception:
        return None

    from backend.nps_matcher import select_best_nps_park

    sel = select_best_nps_park(place.name, parks, min_score=50)
    return sel.park_code if sel else None


def _dedupe_by_url(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for it in items:
        url = (it.get("url") or "").strip()
        if not url:
            continue
        if url in seen:
            continue
        seen.add(url)
        out.append(it)
    return out


def resolve_seed_assets(nps_park_code: Optional[str]) -> List[Dict[str, Any]]:
    seed = _load_seed_sources()
    parks = seed.get("parks") if isinstance(seed, dict) else {}
    if not isinstance(parks, dict) or not nps_park_code:
        return []

    items = parks.get(nps_park_code) or []
    if not isinstance(items, list):
        return []

    out = []
    for it in items:
        if not isinstance(it, dict):
            continue
        url = it.get("url")
        if not url:
            continue
        out.append(
            {
                "title": it.get("title") or "Official map",
                "url": url,
                "fileType": (it.get("fileType") or "pdf").lower(),
                "source": "seed",
            }
        )
    return _dedupe_by_url(out)


def resolve_scraped_assets(nps_park_code: str, db: Optional[Session] = None, *, full_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Scrape NPS park pages for printable map PDFs.
    """
    park_code = (nps_park_code or "").strip().lower()
    if not park_code:
        return []

    # DB-backed cache keyed strictly by parkCode
    if db is not None:
        cached = get_cached_pdf_url(db, park_code=park_code)
        if cached and cached[0]:
            pdf_url = cached[0]
        else:
            pdf_url = discover_best_pdf_url(park_code)
            upsert_cached_pdf_url(db, park_code=park_code, pdf_url=pdf_url, full_name=full_name)
    else:
        pdf_url = discover_best_pdf_url(park_code)

    if not pdf_url:
        return []
    return _dedupe_by_url(
        [
            {
                "title": f"{park_code.upper()} Official map",
                "url": pdf_url,
                "fileType": "pdf",
                "source": "nps_discovery",
            }
        ]
    )


def resolve_curated_assets(place_name: str) -> List[Dict[str, Any]]:
    """
    Use the curated map database in official_map_service (direct NPS PDF links).
    Returns a single best-known map when we have it.
    """
    normalized = _norm(place_name)
    out: List[Dict[str, Any]] = []
    for key, data in NPS_MAP_DATABASE.items():
        if key in normalized or normalized in key:
            url = data.get("map_url")
            if url:
                out.append(
                    {
                        "title": f"{place_name} map",
                        "url": url,
                        "fileType": "pdf",
                        "source": "curated",
                    }
                )
    return _dedupe_by_url(out)


def ensure_assets_for_park(place: Place, db: Session, resolved: List[Dict[str, Any]]) -> List[OfflineMapAsset]:
    """
    Upsert OfflineMapAsset rows for a park based on resolved URLs.
    """
    existing = db.query(OfflineMapAsset).filter(OfflineMapAsset.park_id == place.id).all()
    by_url = {a.source_url: a for a in existing if a.source_url}

    assets: List[OfflineMapAsset] = []
    for it in resolved:
        url = it["url"]
        title = it.get("title") or "Official map"
        file_type = (it.get("fileType") or "pdf").lower()

        if url in by_url:
            a = by_url[url]
            # Update title/file_type if needed
            if title and a.title != title:
                a.title = title
            if file_type and a.file_type != file_type:
                a.file_type = file_type
            assets.append(a)
            continue

        a = OfflineMapAsset(
            id=f"oma_{hashlib.md5((place.id + '|' + url).encode()).hexdigest()[:16]}",
            park_id=place.id,
            title=title,
            source_url=url,
            file_type=file_type,
            status="not_downloaded",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(a)
        assets.append(a)

    db.commit()
    return assets


def _download_stream_to_file(
    url: str,
    dest_path: pathlib.Path,
    *,
    max_bytes: int,
    timeout_seconds: int = 20,
    retries: int = 3,
) -> Tuple[int, str, str]:
    """
    Download URL to dest_path via streaming.
    Returns (bytes_written, sha256, content_type).
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    last_err: Optional[Exception] = None
    for attempt in range(1, retries + 1):
        try:
            # Automated checks to prevent 404s and guessed paths
            if not url or not isinstance(url, str) or not url.strip():
                raise ValueError("Empty URL")
            if not (url.startswith("http://") or url.startswith("https://")):
                raise ValueError("URL must start with http(s)")

            # HEAD validate before downloading (best-effort)
            try:
                head = requests.head(url, timeout=10, allow_redirects=True, headers={"User-Agent": "EcoTrails/1.0"})
                if head.status_code != 200:
                    raise ValueError(f"HEAD check failed (HTTP {head.status_code})")
            except Exception as he:
                raise ValueError(f"HEAD check failed: {he}")

            with requests.get(url, stream=True, timeout=timeout_seconds, headers={"User-Agent": "EcoTrails/1.0"}) as r:
                r.raise_for_status()
                content_type = (r.headers.get("content-type") or "").split(";")[0].strip()

                h = hashlib.sha256()
                written = 0
                with tmp_path.open("wb") as f:
                    for chunk in r.iter_content(chunk_size=1024 * 128):
                        if not chunk:
                            continue
                        written += len(chunk)
                        if written > max_bytes:
                            raise ValueError(f"File too large (> {max_bytes} bytes)")
                        h.update(chunk)
                        f.write(chunk)

                tmp_path.replace(dest_path)
                return written, h.hexdigest(), content_type
        except Exception as e:
            last_err = e
            # backoff
            sleep_s = min(2 ** (attempt - 1), 8)
            time.sleep(sleep_s)

    raise last_err or RuntimeError("Download failed")


async def download_offline_maps_for_park(park_id: str, db: Session) -> Dict[str, Any]:
    place = db.query(Place).filter(Place.id == park_id).first()
    if not place:
        return {"success": False, "message": "Park not found", "assets": []}

    # Resolve map sources (curated -> seed -> scrape)
    nps_code = await resolve_nps_park_code(place)

    resolved: List[Dict[str, Any]] = []
    resolved.extend(resolve_curated_assets(place.name))
    resolved.extend(resolve_seed_assets(nps_code))
    if nps_code:
        resolved.extend(resolve_scraped_assets(nps_code, db, full_name=place.name))

    resolved = _dedupe_by_url(resolved)

    if not resolved:
        return {
            "success": False,
            "message": (
                "Official printable maps are not available for this park. "
                "You can still use online navigation or download offline tiles later."
            ),
            "assets": [],
        }

    assets = ensure_assets_for_park(place, db, resolved)

    storage_root = _get_storage_root()
    max_bytes = int(os.environ.get("OFFLINE_MAPS_MAX_BYTES", str(50 * 1024 * 1024)))

    updated_assets: List[OfflineMapAsset] = []
    for asset in assets:
        # already downloaded and file exists
        if asset.status == "downloaded" and asset.local_path and pathlib.Path(asset.local_path).exists():
            updated_assets.append(asset)
            continue

        # Download
        try:
            asset.status = "downloading"
            asset.error = None
            asset.updated_at = datetime.utcnow()
            db.commit()

            dest_dir = storage_root / park_id
            ext = _safe_ext_from_type(asset.file_type)
            dest_path = dest_dir / f"{asset.id}{ext}"

            written, checksum, content_type = _download_stream_to_file(
                asset.source_url,
                dest_path,
                max_bytes=max_bytes,
                timeout_seconds=20,
                retries=3,
            )

            file_type = _guess_file_type_from_headers(content_type, asset.source_url)
            # If we guessed a different file type than existing, rename.
            if file_type != asset.file_type:
                new_path = dest_dir / f"{asset.id}{_safe_ext_from_type(file_type)}"
                try:
                    dest_path.replace(new_path)
                    dest_path = new_path
                except Exception:
                    pass
                asset.file_type = file_type

            asset.local_path = str(dest_path)
            asset.bytes = int(written)
            asset.checksum = checksum
            asset.status = "downloaded"
            asset.downloaded_at = datetime.utcnow()
            asset.updated_at = datetime.utcnow()
            db.commit()

            updated_assets.append(asset)
        except Exception as e:
            logger.warning(f"[OfflineMaps] Download failed for {asset.source_url}: {e}")
            asset.status = "failed"
            asset.error = str(e)
            asset.updated_at = datetime.utcnow()
            db.commit()
            updated_assets.append(asset)

    return {
        "success": True,
        "parkId": park_id,
        "parkName": place.name,
        "npsParkCode": nps_code,
        "storageRoot": str(storage_root),
        "assets": [serialize_asset(a) for a in updated_assets],
    }


def serialize_asset(a: OfflineMapAsset) -> Dict[str, Any]:
    return {
        "id": a.id,
        "parkId": a.park_id,
        "title": a.title,
        "sourceUrl": a.source_url,
        "fileType": a.file_type,
        "bytes": a.bytes,
        "checksum": a.checksum,
        "downloadedAt": a.downloaded_at.isoformat() if a.downloaded_at else None,
        "status": a.status,
        "error": a.error,
    }

