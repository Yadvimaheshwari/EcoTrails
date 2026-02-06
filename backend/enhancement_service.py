"""
Media Enhancement Service
Handles optional post-processing enhancement jobs
"""
import logging
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Media
from backend.storage import save_local_file, get_local_file
from backend.ai_services import enhance_photo_nano_banana

logger = logging.getLogger("EcoAtlas.Enhancement")

# In-memory job store (in production, use Redis or database)
_enhancement_jobs: Dict[str, Dict[str, Any]] = {}


async def start_enhancement_job(
    media_id: str,
    options: Dict[str, Any],
    api_key: str,
    db: Session
) -> Dict[str, Any]:
    """Start an enhancement job for a media item"""
    try:
        media = db.query(Media).filter(Media.id == media_id).first()
        if not media:
            return {"success": False, "error": "Media not found"}
        
        if media.type != 'photo':
            return {"success": False, "error": "Enhancement only available for photos"}
        
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "media_id": media_id,
            "status": "queued",
            "options": options,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": None,
            "enhanced_url": None,
        }
        
        _enhancement_jobs[job_id] = job
        
        # Start enhancement asynchronously (don't await)
        asyncio.create_task(process_enhancement_job(job_id, media_id, options, api_key, db))
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "queued"
        }
    except Exception as e:
        logger.error(f"Error starting enhancement job: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def process_enhancement_job(
    job_id: str,
    media_id: str,
    options: Dict[str, Any],
    api_key: str,
    db: Session
):
    """Process an enhancement job"""
    try:
        job = _enhancement_jobs.get(job_id)
        if not job:
            return
        
        job["status"] = "processing"
        job["updated_at"] = datetime.utcnow().isoformat()
        
        # Get media
        media = db.query(Media).filter(Media.id == media_id).first()
        if not media:
            job["status"] = "failed"
            job["error"] = "Media not found"
            job["updated_at"] = datetime.utcnow().isoformat()
            return
        
        # Read original file
        original_data = get_local_file(media.storage_key)
        if not original_data:
            job["status"] = "failed"
            job["error"] = "Original file not found"
            job["updated_at"] = datetime.utcnow().isoformat()
            return
        
        # Enhance photo
        try:
            enhancement_result = await enhance_photo_nano_banana(
                original_data,
                options,
                api_key
            )
        except Exception as e:
            logger.error(f"Enhancement error: {e}", exc_info=True)
            job["status"] = "failed"
            job["error"] = f"Enhancement failed: {str(e)}"
            job["updated_at"] = datetime.utcnow().isoformat()
            return
        
        if not enhancement_result.get("success"):
            job["status"] = "failed"
            job["error"] = enhancement_result.get("error", "Enhancement failed")
            job["updated_at"] = datetime.utcnow().isoformat()
            return
        
        # Save enhanced version
        enhanced_key = f"{media.storage_key}_enhanced"
        enhanced_data = enhancement_result.get("enhanced_image_data")
        
        # Check if in dev mode (no actual enhanced image)
        if enhancement_result.get("dev_mode"):
            # In dev mode, just store metadata
            try:
                if not media.meta_data:
                    media.meta_data = {}
                media.meta_data["enhancement_metadata"] = enhancement_result
                media.meta_data["enhancement_note"] = "Dev mode: Enhancement suggestions available"
                db.commit()
                
                job["status"] = "completed"
                job["updated_at"] = datetime.utcnow().isoformat()
                job["note"] = "Dev mode: No enhanced image generated"
            except Exception as e:
                logger.error(f"Error storing enhancement metadata: {e}", exc_info=True)
                job["status"] = "failed"
                job["error"] = f"Failed to store metadata: {str(e)}"
                job["updated_at"] = datetime.utcnow().isoformat()
        elif enhanced_data:
            try:
                # If enhanced_data is base64, decode it
                if isinstance(enhanced_data, str):
                    import base64
                    enhanced_data = base64.b64decode(enhanced_data)
                
                if save_local_file(enhanced_key, enhanced_data):
                    enhanced_url = f"/api/v1/media/{enhanced_key}"
                    
                    # Update media metadata with enhanced version
                    if not media.meta_data:
                        media.meta_data = {}
                    media.meta_data["enhanced_url"] = enhanced_url
                    media.meta_data["enhanced_at"] = datetime.utcnow().isoformat()
                    db.commit()
                    
                    job["status"] = "completed"
                    job["enhanced_url"] = enhanced_url
                    job["updated_at"] = datetime.utcnow().isoformat()
                else:
                    job["status"] = "failed"
                    job["error"] = "Failed to save enhanced file"
                    job["updated_at"] = datetime.utcnow().isoformat()
            except Exception as e:
                logger.error(f"Error saving enhanced file: {e}", exc_info=True)
                job["status"] = "failed"
                job["error"] = f"Failed to save enhanced file: {str(e)}"
                job["updated_at"] = datetime.utcnow().isoformat()
        else:
            # No enhanced data returned, but success - store metadata
            try:
                if not media.meta_data:
                    media.meta_data = {}
                media.meta_data["enhancement_metadata"] = enhancement_result.get("metadata", {})
                db.commit()
                
                job["status"] = "completed"
                job["updated_at"] = datetime.utcnow().isoformat()
                job["note"] = "Enhancement completed but no enhanced image available"
            except Exception as e:
                logger.error(f"Error storing enhancement metadata: {e}", exc_info=True)
                job["status"] = "failed"
                job["error"] = f"Failed to store metadata: {str(e)}"
                job["updated_at"] = datetime.utcnow().isoformat()
            
    except Exception as e:
        logger.error(f"Error processing enhancement job {job_id}: {e}", exc_info=True)
        job = _enhancement_jobs.get(job_id)
        if job:
            job["status"] = "failed"
            job["error"] = str(e)
            job["updated_at"] = datetime.utcnow().isoformat()


def get_enhancement_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get status of an enhancement job"""
    return _enhancement_jobs.get(job_id)


def cancel_enhancement_job(job_id: str) -> bool:
    """Cancel an enhancement job"""
    job = _enhancement_jobs.get(job_id)
    if not job:
        return False
    
    if job["status"] in ["queued", "processing"]:
        job["status"] = "cancelled"
        job["updated_at"] = datetime.utcnow().isoformat()
        return True
    
    return False


def get_media_enhancement_jobs(media_id: str) -> list[Dict[str, Any]]:
    """Get all enhancement jobs for a media item"""
    return [
        job for job in _enhancement_jobs.values()
        if job.get("media_id") == media_id
    ]
