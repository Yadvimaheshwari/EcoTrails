"""
Export service
"""
import json
import csv
import io
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Hike, RoutePoint, SensorBatch, Media, Discovery

logger = logging.getLogger("EcoAtlas.Export")


def export_hike_data(hike_id: str, user_id: str, format: str = "json", db: Session = None) -> Optional[bytes]:
    """Export hike data as JSON or CSV"""
    if not db:
        return None
    
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return None
        
        # Fetch all related data
        route_points = db.query(RoutePoint).filter(RoutePoint.hike_id == hike_id).all()
        sensor_batches = db.query(SensorBatch).filter(SensorBatch.hike_id == hike_id).all()
        media_list = db.query(Media).filter(Media.hike_id == hike_id).all()
        discoveries = db.query(Discovery).filter(Discovery.hike_id == hike_id).all()
        
        data = {
            "hike": {
                "id": hike.id,
                "status": hike.status,
                "start_time": hike.start_time.isoformat() if hike.start_time else None,
                "end_time": hike.end_time.isoformat() if hike.end_time else None,
                "distance_miles": hike.distance_miles,
                "duration_minutes": hike.duration_minutes,
                "elevation_gain_feet": hike.elevation_gain_feet,
                "max_altitude_feet": hike.max_altitude_feet,
                "weather": hike.weather,
                "metadata": hike.meta_data
            },
            "route_points": [{
                "timestamp": rp.timestamp.isoformat(),
                "latitude": rp.latitude,
                "longitude": rp.longitude,
                "altitude": rp.altitude,
                "accuracy": rp.accuracy
            } for rp in route_points],
            "sensor_batches": [{
                "timestamp": sb.timestamp.isoformat(),
                "heart_rate": sb.heart_rate,
                "cadence": sb.cadence,
                "pace": sb.pace,
                "altitude": sb.altitude,
                "pressure": sb.pressure,
                "temperature": sb.temperature
            } for sb in sensor_batches],
            "media": [{
                "id": m.id,
                "type": m.type,
                "category": m.category,
                "url": m.url,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "location": m.location
            } for m in media_list],
            "discoveries": [{
                "type": d.discovery_type,
                "description": d.description,
                "confidence": d.confidence,
                "timestamp": d.timestamp.isoformat() if d.timestamp else None,
                "location": d.location
            } for d in discoveries]
        }
        
        if format == "json":
            return json.dumps(data, indent=2).encode("utf-8")
        elif format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write hike summary
            writer.writerow(["Field", "Value"])
            writer.writerow(["Hike ID", hike.id])
            writer.writerow(["Start Time", hike.start_time.isoformat() if hike.start_time else ""])
            writer.writerow(["End Time", hike.end_time.isoformat() if hike.end_time else ""])
            writer.writerow(["Distance (miles)", hike.distance_miles or ""])
            writer.writerow(["Duration (minutes)", hike.duration_minutes or ""])
            writer.writerow([])
            
            # Write route points
            writer.writerow(["Route Points"])
            writer.writerow(["Timestamp", "Latitude", "Longitude", "Altitude", "Accuracy"])
            for rp in route_points:
                writer.writerow([
                    rp.timestamp.isoformat(),
                    rp.latitude,
                    rp.longitude,
                    rp.altitude or "",
                    rp.accuracy or ""
                ])
            writer.writerow([])
            
            # Write discoveries
            writer.writerow(["Discoveries"])
            writer.writerow(["Type", "Description", "Confidence", "Timestamp"])
            for d in discoveries:
                writer.writerow([
                    d.discovery_type,
                    d.description or "",
                    d.confidence,
                    d.timestamp.isoformat() if d.timestamp else ""
                ])
            
            return output.getvalue().encode("utf-8")
        else:
            return None
    except Exception as e:
        logger.error(f"Error exporting hike data: {e}")
        return None
