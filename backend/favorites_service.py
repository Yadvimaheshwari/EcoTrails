"""
Service for managing user favorite places
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.models import UserFavoritePlace, Place, User

logger = logging.getLogger("EcoAtlas.Favorites")


def add_favorite_place(
    user_id: str,
    place_id: str,
    planned_visit_date: Optional[datetime] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Add a place to user's favorites"""
    if not db:
        return None
    
    try:
        # Check if already favorited
        existing = db.query(UserFavoritePlace).filter(
            UserFavoritePlace.user_id == user_id,
            UserFavoritePlace.place_id == place_id
        ).first()
        
        if existing:
            # Update planned visit date if provided
            if planned_visit_date:
                existing.planned_visit_date = planned_visit_date
                existing.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing)
            return {
                "id": existing.id,
                "user_id": existing.user_id,
                "place_id": existing.place_id,
                "planned_visit_date": existing.planned_visit_date.isoformat() if existing.planned_visit_date else None,
                "created_at": existing.created_at.isoformat() if existing.created_at else None
            }
        
        favorite = UserFavoritePlace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            place_id=place_id,
            planned_visit_date=planned_visit_date
        )
        
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
        
        return {
            "id": favorite.id,
            "user_id": favorite.user_id,
            "place_id": favorite.place_id,
            "planned_visit_date": favorite.planned_visit_date.isoformat() if favorite.planned_visit_date else None,
            "created_at": favorite.created_at.isoformat() if favorite.created_at else None
        }
    except Exception as e:
        logger.error(f"Error adding favorite place: {e}", exc_info=True)
        db.rollback()
        return None


def remove_favorite_place(user_id: str, place_id: str, db: Session) -> bool:
    """Remove a place from user's favorites"""
    try:
        favorite = db.query(UserFavoritePlace).filter(
            UserFavoritePlace.user_id == user_id,
            UserFavoritePlace.place_id == place_id
        ).first()
        
        if not favorite:
            return False
        
        db.delete(favorite)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error removing favorite place: {e}", exc_info=True)
        db.rollback()
        return False


def get_user_favorites(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Get all favorite places for a user"""
    try:
        favorites = db.query(UserFavoritePlace).filter(
            UserFavoritePlace.user_id == user_id
        ).order_by(desc(UserFavoritePlace.created_at)).all()
        
        result = []
        for fav in favorites:
            place = db.query(Place).filter(Place.id == fav.place_id).first()
            result.append({
                "id": fav.id,
                "place_id": fav.place_id,
                "planned_visit_date": fav.planned_visit_date.isoformat() if fav.planned_visit_date else None,
                "created_at": fav.created_at.isoformat() if fav.created_at else None,
                "place": {
                    "id": place.id if place else None,
                    "name": place.name if place else None,
                    "place_type": place.place_type if place else None,
                    "location": place.location if place else None,
                    "description": place.description if place else None
                } if place else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error getting user favorites: {e}", exc_info=True)
        return []


def is_favorite(user_id: str, place_id: str, db: Session) -> bool:
    """Check if a place is favorited by user"""
    try:
        favorite = db.query(UserFavoritePlace).filter(
            UserFavoritePlace.user_id == user_id,
            UserFavoritePlace.place_id == place_id
        ).first()
        return favorite is not None
    except Exception as e:
        logger.error(f"Error checking favorite: {e}", exc_info=True)
        return False
