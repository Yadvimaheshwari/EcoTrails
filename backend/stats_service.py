"""
Stats service
"""
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct
from backend.models import Hike, User, UserAchievement, Place, Trail, Discovery, UserFavoritePlace

logger = logging.getLogger("EcoAtlas.Stats")


def get_user_stats(user_id: str, db: Session) -> Dict[str, Any]:
    """Get user statistics"""
    try:
        hikes = db.query(Hike).filter(Hike.user_id == user_id).all()
        achievements = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
        
        total_distance = sum(h.distance_miles or 0 for h in hikes)
        total_elevation = sum(h.elevation_gain_feet or 0 for h in hikes)
        max_altitude = max((h.max_altitude_feet or 0 for h in hikes), default=0)
        total_duration = sum(h.duration_minutes or 0 for h in hikes)
        
        return {
            "total_hikes": len(hikes),
            "total_distance_miles": total_distance,
            "total_elevation_gain_feet": total_elevation,
            "max_altitude_feet": max_altitude,
            "total_duration_minutes": total_duration,
            "achievements_unlocked": len(achievements),
            "completed_hikes": len([h for h in hikes if h.status == "completed"])
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        return {}


def get_hike_stats(hike_id: str, user_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get hike statistics"""
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return None
        
        from backend.models import RoutePoint, SensorBatch, Media, Discovery
        route_points_count = db.query(func.count(RoutePoint.id)).filter(RoutePoint.hike_id == hike_id).scalar() or 0
        sensor_batches_count = db.query(func.count(SensorBatch.id)).filter(SensorBatch.hike_id == hike_id).scalar() or 0
        media_count = db.query(func.count(Media.id)).filter(Media.hike_id == hike_id).scalar() or 0
        discoveries_count = db.query(func.count(Discovery.id)).filter(Discovery.hike_id == hike_id).scalar() or 0
        
        return {
            "hike_id": hike.id,
            "distance_miles": hike.distance_miles,
            "duration_minutes": hike.duration_minutes,
            "elevation_gain_feet": hike.elevation_gain_feet,
            "max_altitude_feet": hike.max_altitude_feet,
            "route_points_count": route_points_count,
            "sensor_batches_count": sensor_batches_count,
            "media_count": media_count,
            "discoveries_count": discoveries_count,
            "status": hike.status
        }
    except Exception as e:
        logger.error(f"Error getting hike stats: {e}")
        return None


def get_dashboard_stats(user_id: str, db: Session) -> Dict[str, Any]:
    """Get comprehensive dashboard statistics for the explore page"""
    try:
        # Get all hikes for the user with relationships loaded
        hikes = db.query(Hike).options(
            joinedload(Hike.trail).joinedload(Trail.place)
        ).filter(Hike.user_id == user_id).all()
        completed_hikes = [h for h in hikes if h.status == "completed"]
        
        # Parks explored (unique places from hikes)
        place_ids = set()
        for hike in hikes:
            # Check both trail.place_id and place_id directly
            if hike.trail_id:
                # Try to get place_id from trail relationship
                if hike.trail and hike.trail.place_id:
                    place_ids.add(hike.trail.place_id)
                # Also check if trail has place relationship loaded
                elif hike.trail and hasattr(hike.trail, 'place') and hike.trail.place:
                    place_ids.add(hike.trail.place.id)
            # Fallback to direct place_id
            if hike.place_id:
                place_ids.add(hike.place_id)
        
        parks_explored = len(place_ids)
        
        # Get last park explored
        last_park = None
        if hikes:
            last_hike = max(hikes, key=lambda h: h.start_time if h.start_time else h.created_at)
            # Try to get place from trail relationship
            if last_hike.trail and last_hike.trail.place:
                last_park = {
                    "id": last_hike.trail.place.id,
                    "name": last_hike.trail.place.name,
                    "place_type": last_hike.trail.place.place_type
                }
            # Fallback: get place directly if place_id exists
            elif last_hike.place_id:
                place = db.query(Place).filter(Place.id == last_hike.place_id).first()
                if place:
                    last_park = {
                        "id": place.id,
                        "name": place.name,
                        "place_type": place.place_type
                    }
        
        # Trails completed - count unique trail_ids from completed hikes
        trails_completed = len(set(h.trail_id for h in completed_hikes if h.trail_id))
        
        # Also count by place if no trail_id
        if trails_completed == 0:
            # Count unique places from completed hikes as a fallback
            completed_place_ids = set()
            for h in completed_hikes:
                if h.trail_id and h.trail and h.trail.place_id:
                    completed_place_ids.add(h.trail.place_id)
                elif h.place_id:
                    completed_place_ids.add(h.place_id)
            trails_completed = len(completed_place_ids)
        
        # Elevation gained lifetime
        elevation_gained = sum(h.elevation_gain_feet or 0 for h in completed_hikes)
        
        # Rare discoveries (high confidence discoveries or specific rare types)
        all_discoveries = db.query(Discovery).join(Hike).filter(
            Hike.user_id == user_id
        ).all()
        
        rare_discoveries = [
            d for d in all_discoveries 
            if d.confidence == "High" or d.discovery_type in ["wildlife", "geology"]
        ]
        rare_discoveries_count = len(rare_discoveries)
        
        # Difficulty progression
        difficulty_counts = {}
        for hike in completed_hikes:
            if hike.trail and hike.trail.difficulty:
                diff = hike.trail.difficulty.lower()
                difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
        
        # Get places with states for map visualization
        places_with_states = []
        for place_id in place_ids:
            place = db.query(Place).filter(Place.id == place_id).first()
            if place:
                # Extract state from address or metadata
                state = None
                if place.meta_data and isinstance(place.meta_data, dict):
                    address_components = place.meta_data.get("address_components", [])
                    for comp in address_components:
                        if "administrative_area_level_1" in comp.get("types", []):
                            state = comp.get("short_name")
                            break
                
                # Extract lat/lng from location JSON field (FIXED: was trying to access place.latitude/longitude which don't exist)
                lat = None
                lng = None
                if place.location:
                    if isinstance(place.location, dict):
                        lat = place.location.get("lat") or place.location.get("latitude")
                        lng = place.location.get("lng") or place.location.get("longitude")
                    elif isinstance(place.location, list) and len(place.location) >= 2:
                        # Handle [lat, lng] format
                        lat = place.location[0]
                        lng = place.location[1]
                
                # Also check metadata for location if not found in location field
                if lat is None or lng is None:
                    if place.meta_data and isinstance(place.meta_data, dict):
                        location_data = place.meta_data.get("location") or place.meta_data.get("geometry", {}).get("location", {})
                        if isinstance(location_data, dict):
                            lat = lat or location_data.get("lat") or location_data.get("latitude")
                            lng = lng or location_data.get("lng") or location_data.get("longitude")
                
                logger.debug(f"Place {place.id}: extracted lat={lat}, lng={lng} from location={place.location}")
                
                places_with_states.append({
                    "id": place.id,
                    "name": place.name,
                    "state": state,
                    "lat": lat,
                    "lng": lng
                })
        
        # Discoveries by type
        discoveries_by_type = {}
        for discovery in all_discoveries:
            dtype = discovery.discovery_type
            discoveries_by_type[dtype] = discoveries_by_type.get(dtype, 0) + 1
        
        # Calculate explorer level
        total_points = (
            parks_explored * 10 +
            trails_completed * 5 +
            len(completed_hikes) * 3 +
            rare_discoveries_count * 15
        )
        
        if total_points < 20:
            explorer_level = "Beginner"
            next_milestone = "First trail completed"
            next_milestone_points = 20
        elif total_points < 100:
            explorer_level = "Explorer"
            next_milestone = "Complete 5 trails"
            next_milestone_points = 100
        elif total_points < 300:
            explorer_level = "Adventurer"
            next_milestone = "Explore 10 parks"
            next_milestone_points = 300
        elif total_points < 600:
            explorer_level = "Trailblazer"
            next_milestone = "Reach 50,000 ft elevation"
            next_milestone_points = 600
        else:
            explorer_level = "Master Explorer"
            next_milestone = "Discover 50 rare finds"
            next_milestone_points = 900
        
        # Get recent hikes for activity feed
        recent_hikes = sorted(
            hikes,
            key=lambda h: h.start_time if h.start_time else h.created_at,
            reverse=True
        )[:5]
        
        recent_activity = []
        for hike in recent_hikes:
            activity = {
                "id": hike.id,
                "trail_name": hike.trail.name if hike.trail else "Unknown Trail",
                "place_name": hike.trail.place.name if hike.trail and hike.trail.place else "Unknown Place",
                "status": hike.status,
                "date": (hike.start_time or hike.created_at).isoformat() if hike.start_time or hike.created_at else None,
                "distance_miles": hike.distance_miles,
                "elevation_gain_feet": hike.elevation_gain_feet
            }
            recent_activity.append(activity)
        
        # Active hikes (in progress)
        active_hikes = [h for h in hikes if h.status == "active"]
        active_hikes_count = len(active_hikes)
        
        # Upcoming trips (favorites with planned visit dates in the future)
        from datetime import datetime
        upcoming_favorites = db.query(UserFavoritePlace).filter(
            UserFavoritePlace.user_id == user_id,
            UserFavoritePlace.planned_visit_date.isnot(None)
        ).all()
        
        upcoming_trips_count = 0
        for fav in upcoming_favorites:
            if fav.planned_visit_date:
                try:
                    visit_date = fav.planned_visit_date
                    if isinstance(visit_date, str):
                        visit_date = datetime.fromisoformat(visit_date.replace('Z', '+00:00'))
                    if visit_date >= datetime.utcnow():
                        upcoming_trips_count += 1
                except:
                    pass
        
        # Total discoveries
        total_discoveries = len(all_discoveries)
        
        return {
            "parks_explored": parks_explored,
            "trails_completed": trails_completed,
            "elevation_gained_feet": elevation_gained,
            "rare_discoveries": rare_discoveries_count,
            "last_park": last_park,
            "difficulty_progression": difficulty_counts,
            "places_visited": places_with_states,
            "discoveries_by_type": discoveries_by_type,
            "total_hikes": len(hikes),
            "completed_hikes": len(completed_hikes),
            "active_hikes": active_hikes_count,
            "upcoming_trips": upcoming_trips_count,
            "total_discoveries": total_discoveries,
            "explorer_level": explorer_level,
            "next_milestone": next_milestone,
            "next_milestone_points": next_milestone_points,
            "current_points": total_points,
            "recent_activity": recent_activity
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        return {
            "parks_explored": 0,
            "trails_completed": 0,
            "elevation_gained_feet": 0,
            "rare_discoveries": 0,
            "last_park": None,
            "difficulty_progression": {},
            "places_visited": [],
            "discoveries_by_type": {},
            "total_hikes": 0,
            "completed_hikes": 0,
            "active_hikes": 0,
            "upcoming_trips": 0,
            "total_discoveries": 0
        }
