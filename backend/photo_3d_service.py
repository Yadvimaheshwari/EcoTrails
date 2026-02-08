"""
Photo-to-3D service (DEV stub).

This provides an in-memory job store and a placeholder OBJ download so the
frontend can exercise the full flow end-to-end.

Production note: Replace with a real provider (photogrammetry / NeRF / 3DGS).
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from backend.models import Media, Hike

logger = logging.getLogger("EcoAtlas.Photo3D")

# In-memory job store (in production, store in DB/Redis)
_jobs: Dict[str, Dict[str, Any]] = {}


def _is_dev_mode() -> bool:
    return os.environ.get("ENVIRONMENT", "production") == "development"


def start_photo_3d_job(media_id: str, user_id: str, db: Session) -> Dict[str, Any]:
    """
    Start a 3D job for a media item. Returns the job payload.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        return {"success": False, "error": "Media not found"}

    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user_id).first()
    if not hike:
        return {"success": False, "error": "Access denied"}

    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "media_id": media_id,
        "hike_id": media.hike_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "error": None,
        # Placeholder model URL (text-based OBJ)
        "model_url": f"/api/v1/3d-jobs/{job_id}/model.obj",
        "note": "DEV stub" if _is_dev_mode() else "Not implemented",
    }
    _jobs[job_id] = job

    # Process asynchronously
    asyncio.create_task(_process_job(job_id, user_id, db))

    return {"success": True, "job_id": job_id, "status": "queued", "model_url": job["model_url"]}


async def _process_job(job_id: str, user_id: str, db: Session) -> None:
    job = _jobs.get(job_id)
    if not job:
        return

    job["status"] = "processing"
    job["updated_at"] = datetime.utcnow().isoformat()

    if not _is_dev_mode():
        job["status"] = "failed"
        job["error"] = "Photo-to-3D is not implemented in production. Configure a 3D provider."
        job["updated_at"] = datetime.utcnow().isoformat()
        return

    # DEV mode: simulate some work
    await asyncio.sleep(0.5)

    try:
        media = db.query(Media).filter(Media.id == job["media_id"]).first()
        if not media:
            job["status"] = "failed"
            job["error"] = "Media not found"
            job["updated_at"] = datetime.utcnow().isoformat()
            return

        hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user_id).first()
        if not hike:
            job["status"] = "failed"
            job["error"] = "Access denied"
            job["updated_at"] = datetime.utcnow().isoformat()
            return

        # Store pointer on media meta_data so web/mobile can show it later
        if not isinstance(media.meta_data, dict) or media.meta_data is None:
            media.meta_data = {}
        media.meta_data["model_3d_url"] = job["model_url"]
        media.meta_data["model_3d_job_id"] = job_id
        media.meta_data["model_3d_created_at"] = datetime.utcnow().isoformat()
        db.commit()

        job["status"] = "completed"
        job["updated_at"] = datetime.utcnow().isoformat()
    except Exception as e:
        logger.error(f"Failed to complete 3D job {job_id}: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        job["status"] = "failed"
        job["error"] = str(e)
        job["updated_at"] = datetime.utcnow().isoformat()


def get_photo_3d_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _jobs.get(job_id)


def get_placeholder_obj() -> str:
    """
    Minimal OBJ (text) so clients can download a \"model\" without binary assets.
    """
    return (
        "# EcoTrails DEV placeholder OBJ\\n"
        "o ecotrails_placeholder\\n"
        "v -0.5 -0.5 0.5\\n"
        "v 0.5 -0.5 0.5\\n"
        "v 0.5 0.5 0.5\\n"
        "v -0.5 0.5 0.5\\n"
        "v -0.5 -0.5 -0.5\\n"
        "v 0.5 -0.5 -0.5\\n"
        "v 0.5 0.5 -0.5\\n"
        "v -0.5 0.5 -0.5\\n"
        "f 1 2 3 4\\n"
        "f 5 8 7 6\\n"
        "f 1 5 6 2\\n"
        "f 2 6 7 3\\n"
        "f 3 7 8 4\\n"
        "f 5 1 4 8\\n"
    )

