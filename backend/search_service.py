"""
Search service
"""
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from backend.models import Hike, Place, Trail

logger = logging.getLogger("EcoAtlas.Search")


def search_hikes(query: str, user_id: str, limit: int = 20, db: Session = None) -> List[Dict[str, Any]]:
    """Search hikes"""
    if not db:
        return []
    
    try:
        # Search in hike metadata, or join with trails/places
        hikes = db.query(Hike).filter(
            Hike.user_id == user_id,
            or_(
                func.cast(Hike.meta_data, db.String).ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        return [{
            "id": h.id,
            "trail_id": h.trail_id,
            "place_id": h.place_id,
            "status": h.status,
            "start_time": h.start_time.isoformat() if h.start_time else None,
            "distance_miles": h.distance_miles,
            "duration_minutes": h.duration_minutes
        } for h in hikes]
    except Exception as e:
        logger.error(f"Error searching hikes: {e}")
        return []


def search_places(query: str, limit: int = 20, db: Session = None) -> List[Dict[str, Any]]:
    """Search places"""
    if not db:
        return []
    
    try:
        places = db.query(Place).filter(
            or_(
                Place.name.ilike(f"%{query}%"),
                Place.description.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        return [{
            "id": p.id,
            "name": p.name,
            "place_type": p.place_type,
            "location": p.location,
            "description": p.description
        } for p in places]
    except Exception as e:
        logger.error(f"Error searching places: {e}")
        return []
