"""
Media service
"""
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Media, Hike
from backend.storage import get_upload_url, get_media_url, save_local_file

logger = logging.getLogger("EcoAtlas.Media")


def get_signed_upload_url(
    user_id: str,
    hike_id: str,
    content_type: str,
    category: Optional[str] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Get signed upload URL for media"""
    if not db:
        return None
    
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return None
        
        extension = content_type.split('/')[1] if '/' in content_type else 'bin'
        key = f"hikes/{hike_id}/{uuid.uuid4()}.{extension}"
        media_id = str(uuid.uuid4())
        
        media_type = 'photo' if content_type.startswith('image/') else 'video' if content_type.startswith('video/') else 'audio'
        
        media = Media(
            id=media_id,
            hike_id=hike_id,
            type=media_type,
            category=category or 'general',
            storage_key=key,
            url=get_media_url(key),
            mime_type=content_type,
            size_bytes=0
        )
        db.add(media)
        db.commit()
        
        upload_url = get_upload_url(key, content_type)
        
        return {
            "uploadUrl": upload_url,
            "mediaId": media_id,
            "key": key
        }
    except Exception as e:
        logger.error(f"Error getting signed upload URL: {e}")
        db.rollback()
        return None


def register_uploaded_media(
    media_id: str,
    user_id: str,
    size_bytes: int,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = None
) -> Optional[Media]:
    """Register uploaded media"""
    if not db:
        return None
    
    try:
        media = db.query(Media).filter(Media.id == media_id).first()
        if not media:
            return None
        
        hike = db.query(Hike).filter(Hike.id == media.hike_id).first()
        if not hike or hike.user_id != user_id:
            return None
        
        media.size_bytes = size_bytes
        media.synced_at = datetime.utcnow()
        
        if metadata:
            if metadata.get("width"):
                media.width = metadata["width"]
            if metadata.get("height"):
                media.height = metadata["height"]
            if metadata.get("durationMs"):
                media.duration_ms = metadata["durationMs"]
            if metadata.get("location"):
                media.location = metadata["location"]
            if metadata.get("timestamp"):
                media.created_at = datetime.fromisoformat(metadata["timestamp"].replace("Z", "+00:00"))
            if metadata.get("segmentId"):
                media.segment_id = metadata["segmentId"]
            media.meta_data = metadata
        
        db.commit()
        db.refresh(media)
        return media
    except Exception as e:
        logger.error(f"Error registering uploaded media: {e}")
        db.rollback()
        return None


def get_hike_media(
    hike_id: str,
    user_id: str,
    media_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = None
) -> List[Dict[str, Any]]:
    """Get media for a hike"""
    if not db:
        return []
    
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return []
        
        query = db.query(Media).filter(Media.hike_id == hike_id)
        
        if media_type:
            query = query.filter(Media.type == media_type)
        if category:
            query = query.filter(Media.category == category)
        
        media_list = query.order_by(Media.created_at.asc()).all()
        
        return [{
            "id": m.id,
            "type": m.type,
            "category": m.category,
            "url": m.url,
            "mime_type": m.mime_type,
            "size_bytes": m.size_bytes,
            "width": m.width,
            "height": m.height,
            "duration_ms": m.duration_ms,
            "location": m.location,
            "created_at": m.created_at.isoformat() if m.created_at else None
        } for m in media_list]
    except Exception as e:
        logger.error(f"Error getting hike media: {e}")
        return []
