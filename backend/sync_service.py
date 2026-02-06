"""
Sync service for offline data
"""
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.models import Hike, RoutePoint, SensorBatch

logger = logging.getLogger("EcoAtlas.Sync")


def sync_offline_data(
    hike_id: str,
    user_id: str,
    route_points: Optional[List[Dict[str, Any]]] = None,
    sensor_batches: Optional[List[Dict[str, Any]]] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Sync offline data for a hike"""
    if not db:
        return {"success": False, "error": "Database session required"}
    
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return {"success": False, "error": "Hike not found"}
        
        synced_items = []
        
        # Sync route points
        if route_points:
            from backend.hikes_service import upload_route_points
            if upload_route_points(hike_id, route_points, db):
                synced_items.append(f"{len(route_points)} route points")
        
        # Sync sensor batches
        if sensor_batches:
            from backend.hikes_service import upload_sensor_batch
            for batch in sensor_batches:
                if upload_sensor_batch(hike_id, batch, db):
                    synced_items.append("sensor batch")
        
        return {
            "success": True,
            "hike_id": hike_id,
            "synced_items": synced_items,
            "message": f"Synced {len(synced_items)} items"
        }
    except Exception as e:
        logger.error(f"Error syncing offline data: {e}")
        db.rollback()
        return {"success": False, "error": str(e)}


def get_sync_status(hike_id: str, user_id: str, db: Session) -> Dict[str, Any]:
    """Get sync status for a hike"""
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return {"status": "not_found"}
        
        from sqlalchemy import func
        route_points_count = db.query(func.count(RoutePoint.id)).filter(RoutePoint.hike_id == hike_id).scalar() or 0
        sensor_batches_count = db.query(func.count(SensorBatch.id)).filter(SensorBatch.hike_id == hike_id).scalar() or 0
        
        return {
            "status": "synced" if hike.status == "completed" else "pending",
            "hike_id": hike_id,
            "route_points_count": route_points_count,
            "sensor_batches_count": sensor_batches_count,
            "last_updated": hike.updated_at.isoformat() if hike.updated_at else None
        }
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        return {"status": "error", "error": str(e)}
