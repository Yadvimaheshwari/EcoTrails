"""
Hikes service
"""
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.models import Hike, RoutePoint, SensorBatch, Trail, Place

logger = logging.getLogger("EcoAtlas.Hikes")


def create_hike_session(
    user_id: str,
    trail_id: Optional[str] = None,
    place_id: Optional[str] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Create a new hike session"""
    if not db:
        return None
    
    try:
        hike = Hike(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trail_id=trail_id,
            place_id=place_id,
            status='active',
            start_time=datetime.utcnow()
        )
        db.add(hike)
        db.commit()
        db.refresh(hike)
        
        return {
            "id": hike.id,
            "user_id": hike.user_id,
            "trail_id": hike.trail_id,
            "place_id": hike.place_id,
            "status": hike.status,
            "start_time": hike.start_time.isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating hike session: {e}")
        db.rollback()
        return None


def start_hike(hike_id: str, db: Session) -> bool:
    """Start a hike"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return False
        
        hike.status = 'active'
        if not hike.start_time:
            hike.start_time = datetime.utcnow()
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error starting hike: {e}")
        db.rollback()
        return False


def pause_hike(hike_id: str, db: Session) -> bool:
    """Pause a hike"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return False
        
        hike.status = 'paused'
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error pausing hike: {e}")
        db.rollback()
        return False


def end_hike(
    hike_id: str,
    distance_miles: Optional[float] = None,
    duration_minutes: Optional[int] = None,
    db: Session = None
) -> bool:
    """End a hike"""
    if not db:
        return False
    
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return False
        
        hike.status = 'completed'
        hike.end_time = datetime.utcnow()
        if distance_miles:
            hike.distance_miles = distance_miles
        if duration_minutes:
            hike.duration_minutes = duration_minutes
        
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error ending hike: {e}")
        db.rollback()
        return False


def upload_route_points(hike_id: str, points: List[Dict[str, Any]], db: Session) -> bool:
    """Upload route points"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return False
        
        for point_data in points:
            point = RoutePoint(
                id=str(uuid.uuid4()),
                hike_id=hike_id,
                segment_id=point_data.get("segment_id"),
                timestamp=datetime.fromisoformat(point_data["timestamp"].replace("Z", "+00:00")),
                latitude=point_data["latitude"],
                longitude=point_data["longitude"],
                altitude=point_data.get("altitude"),
                accuracy=point_data.get("accuracy")
            )
            db.add(point)
        
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error uploading route points: {e}")
        db.rollback()
        return False


def upload_sensor_batch(hike_id: str, batch_data: Dict[str, Any], db: Session) -> bool:
    """Upload sensor batch"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return False
        
        batch = SensorBatch(
            id=str(uuid.uuid4()),
            hike_id=hike_id,
            timestamp=datetime.fromisoformat(batch_data["timestamp"].replace("Z", "+00:00")),
            heart_rate=batch_data.get("heart_rate"),
            cadence=batch_data.get("cadence"),
            pace=batch_data.get("pace"),
            altitude=batch_data.get("altitude"),
            pressure=batch_data.get("pressure"),
            temperature=batch_data.get("temperature"),
            accelerometer=batch_data.get("accelerometer"),
            gyroscope=batch_data.get("gyroscope"),
            meta_data=batch_data.get("metadata")
        )
        db.add(batch)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error uploading sensor batch: {e}")
        db.rollback()
        return False


def get_hike_history(user_id: str, limit: int = 50, db: Session = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get user's hike history"""
    if not db:
        return []
    
    try:
        query = db.query(Hike).filter(Hike.user_id == user_id)
        
        # Filter by status if provided
        if status:
            query = query.filter(Hike.status == status)
        
        hikes = query.order_by(desc(Hike.start_time)).limit(limit).all()
        
        return [{
            "id": h.id,
            "user_id": h.user_id,
            "trail_id": h.trail_id,
            "place_id": h.place_id,
            "status": h.status,
            "start_time": h.start_time.isoformat() if h.start_time else None,
            "end_time": h.end_time.isoformat() if h.end_time else None,
            "distance_miles": h.distance_miles,
            "duration_minutes": h.duration_minutes,
            "elevation_gain_feet": h.elevation_gain_feet,
            "max_altitude_feet": h.max_altitude_feet,
            "weather": h.weather,
            "meta_data": h.meta_data,
            "created_at": h.created_at.isoformat() if h.created_at else None,
            "updated_at": h.updated_at.isoformat() if h.updated_at else None
        } for h in hikes]
    except Exception as e:
        logger.error(f"Error getting hike history: {e}")
        return []


def get_hike_details(hike_id: str, user_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get hike details with all relationships loaded"""
    from sqlalchemy.orm import joinedload
    
    try:
        hike = db.query(Hike).options(
            joinedload(Hike.trail).joinedload(Trail.place)
        ).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return None
        
        # Get route points
        from backend.models import RoutePoint
        route_points = db.query(RoutePoint).filter(
            RoutePoint.hike_id == hike_id
        ).order_by(RoutePoint.timestamp).all()
        
        # Get discoveries
        from backend.models import Discovery
        discoveries = db.query(Discovery).filter(
            Discovery.hike_id == hike_id
        ).all()
        
        # Get media
        from backend.models import Media
        media = db.query(Media).filter(
            Media.hike_id == hike_id
        ).all()
        
        result = {
            "id": hike.id,
            "user_id": hike.user_id,
            "trail_id": hike.trail_id,
            "place_id": hike.place_id,
            "status": hike.status,
            "start_time": hike.start_time.isoformat() if hike.start_time else None,
            "end_time": hike.end_time.isoformat() if hike.end_time else None,
            "distance_miles": hike.distance_miles,
            "duration_minutes": hike.duration_minutes,
            "elevation_gain_feet": hike.elevation_gain_feet,
            "max_altitude_feet": hike.max_altitude_feet,
            "weather": hike.weather,
            "metadata": hike.meta_data,
            "route_points": [{
                "latitude": rp.latitude,
                "longitude": rp.longitude,
                "altitude": rp.altitude,
                "timestamp": rp.timestamp.isoformat() if rp.timestamp else None,
                "lat": rp.latitude,  # Alias for compatibility
                "lng": rp.longitude,  # Alias for compatibility
                "elevation": rp.altitude  # Alias for compatibility
            } for rp in route_points],
            "discoveries": [{
                "id": d.id,
                "discovery_type": d.discovery_type,
                "description": d.description,
                "confidence": d.confidence
            } for d in discoveries],
            "media": [{
                "id": m.id,
                "type": m.type,
                "url": m.url,
                "metadata": m.meta_data
            } for m in media]
        }
        
        # Add trail details if available
        if hike.trail:
            result["trail"] = {
                "id": hike.trail.id,
                "name": hike.trail.name,
                "difficulty": hike.trail.difficulty,
                "distance_miles": hike.trail.distance_miles,
                "elevation_gain_feet": hike.trail.elevation_gain_feet,
                "estimated_duration_minutes": hike.trail.estimated_duration_minutes,
                "description": hike.trail.description,
                "place_id": hike.trail.place_id
            }
            
            # Add place details if available
            if hike.trail.place:
                # Extract lat/lng from location JSON field
                lat = None
                lng = None
                if hike.trail.place.location:
                    if isinstance(hike.trail.place.location, dict):
                        lat = hike.trail.place.location.get("lat") or hike.trail.place.location.get("latitude")
                        lng = hike.trail.place.location.get("lng") or hike.trail.place.location.get("longitude")
                    elif isinstance(hike.trail.place.location, list) and len(hike.trail.place.location) >= 2:
                        lat = hike.trail.place.location[0]
                        lng = hike.trail.place.location[1]
                
                result["trail"]["place"] = {
                    "id": hike.trail.place.id,
                    "name": hike.trail.place.name,
                    "place_type": hike.trail.place.place_type,
                    "location": hike.trail.place.location,
                    "latitude": lat,
                    "longitude": lng
                }
        
        return result
    except Exception as e:
        logger.error(f"Error getting hike details: {e}", exc_info=True)
        return None
