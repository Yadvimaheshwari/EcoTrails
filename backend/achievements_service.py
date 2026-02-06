"""
Achievements service
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.models import Achievement, UserAchievement, Hike, User

logger = logging.getLogger("EcoAtlas.Achievements")


def compute_achievements(user_id: str, hike_id: str, db: Session) -> List[str]:
    """Compute and unlock achievements for a hike"""
    try:
        hike = db.query(Hike).filter(
            Hike.id == hike_id,
            Hike.user_id == user_id
        ).first()
        
        if not hike:
            return []
        
        unlocked = []
        
        # Check various achievements
        all_hikes = db.query(Hike).filter(Hike.user_id == user_id).all()
        
        # First hike
        if len(all_hikes) == 1:
            achievement = db.query(Achievement).filter(Achievement.code == "first_hike").first()
            if achievement and not db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement.id
            ).first():
                user_achievement = UserAchievement(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    achievement_id=achievement.id,
                    hike_id=hike_id
                )
                db.add(user_achievement)
                unlocked.append("first_hike")
        
        # Expert trail (if difficulty is hard/expert)
        if hike.trail and hike.trail.difficulty in ["hard", "expert"]:
            achievement = db.query(Achievement).filter(Achievement.code == "expert_trail").first()
            if achievement and not db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement.id,
                UserAchievement.hike_id == hike_id
            ).first():
                user_achievement = UserAchievement(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    achievement_id=achievement.id,
                    hike_id=hike_id
                )
                db.add(user_achievement)
                unlocked.append("expert_trail")
        
        # Highest point
        if hike.max_altitude_feet:
            max_altitude = max((h.max_altitude_feet or 0 for h in all_hikes), default=0)
            if hike.max_altitude_feet == max_altitude and hike.max_altitude_feet > 10000:
                achievement = db.query(Achievement).filter(Achievement.code == "highest_point").first()
                if achievement and not db.query(UserAchievement).filter(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id
                ).first():
                    user_achievement = UserAchievement(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        achievement_id=achievement.id,
                        hike_id=hike_id
                    )
                    db.add(user_achievement)
                    unlocked.append("highest_point")
        
        # Longest day
        if hike.distance_miles:
            max_distance = max((h.distance_miles or 0 for h in all_hikes), default=0)
            if hike.distance_miles == max_distance and hike.distance_miles > 20:
                achievement = db.query(Achievement).filter(Achievement.code == "longest_day").first()
                if achievement and not db.query(UserAchievement).filter(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id
                ).first():
                    user_achievement = UserAchievement(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        achievement_id=achievement.id,
                        hike_id=hike_id
                    )
                    db.add(user_achievement)
                    unlocked.append("longest_day")
        
        # Park-specific achievements (National AND State Parks)
        if hike.place and hike.place.name:
            park_name = hike.place.name.lower()
            is_national = 'national park' in park_name or 'national monument' in park_name or 'national forest' in park_name
            is_state = 'state park' in park_name or 'state forest' in park_name
            
            if is_national or is_state:
                park_code = _get_park_achievement_code(park_name)
                category = "national_park" if is_national else "state_park"
                achievement = db.query(Achievement).filter(Achievement.code == park_code).first()
                
                if not achievement:
                    icon_url = _get_park_logo_url(park_name)
                    achievement = Achievement(
                        id=str(uuid.uuid4()),
                        code=park_code,
                        name=f"{hike.place.name} Explorer",
                        description=f"Completed a trail in {hike.place.name}",
                        icon=icon_url,
                        category=category,
                        meta_data={
                            "park_name": hike.place.name,
                            "park_type": "national" if is_national else "state",
                            "place_id": hike.place_id,
                        }
                    )
                    db.add(achievement)
                    db.flush()
                
                if not db.query(UserAchievement).filter(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id
                ).first():
                    user_achievement = UserAchievement(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        achievement_id=achievement.id,
                        hike_id=hike_id,
                        meta_data={
                            "park_name": hike.place.name,
                            "trail_name": hike.trail.name if hike.trail else None,
                        }
                    )
                    db.add(user_achievement)
                    unlocked.append(park_code)
        
        db.commit()
        return unlocked
    except Exception as e:
        logger.error(f"Error computing achievements: {e}")
        db.rollback()
        return []


def get_user_achievements(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Get user's achievements"""
    try:
        user_achievements = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).order_by(desc(UserAchievement.unlocked_at)).all()
        
        result = []
        for ua in user_achievements:
            achievement = db.query(Achievement).filter(Achievement.id == ua.achievement_id).first()
            if achievement:
                result.append({
                    "id": ua.id,
                    "achievement": {
                        "id": achievement.id,
                        "code": achievement.code,
                        "name": achievement.name,
                        "description": achievement.description,
                        "icon": achievement.icon,
                        "category": achievement.category
                    },
                    "unlocked_at": ua.unlocked_at.isoformat() if ua.unlocked_at else None,
                    "hike_id": ua.hike_id
                })
        
        return result
    except Exception as e:
        logger.error(f"Error getting user achievements: {e}")
        return []


def get_all_achievements(db: Session) -> List[Dict[str, Any]]:
    """Get all available achievements"""
    try:
        achievements = db.query(Achievement).all()
        return [{
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category,
            "metadata": a.meta_data
        } for a in achievements]
    except Exception as e:
        logger.error(f"Error getting all achievements: {e}")
        return []


def _get_park_achievement_code(park_name: str) -> str:
    """Generate achievement code from park name"""
    import re
    clean_name = park_name.lower()
    for suffix in [' national park', ' national monument', ' national forest', ' state park', ' state forest']:
        clean_name = clean_name.replace(suffix, '')
    clean_name = re.sub(r'[^a-z0-9]+', '_', clean_name.strip())
    return f"park_{clean_name}"


def _get_park_logo_url(park_name: str) -> str:
    """Get official NPS badge/logo URL for a park using NPS API or known codes"""
    import os
    import requests
    
    # Known NPS park codes for faster lookup
    NPS_PARK_CODES = {
        "yosemite": "yose", "yellowstone": "yell", "grand canyon": "grca",
        "zion": "zion", "glacier": "glac", "rocky mountain": "romo",
        "grand teton": "grte", "acadia": "acad", "olympic": "olym",
        "shenandoah": "shen", "great smoky mountains": "grsm",
        "bryce canyon": "brca", "arches": "arch", "crater lake": "crla",
        "mount rainier": "mora", "denali": "dena", "everglades": "ever",
        "redwood": "redw", "joshua tree": "jotr", "sequoia": "seki",
        "death valley": "deva", "big bend": "bibe", "canyonlands": "cany",
        "capitol reef": "care", "mesa verde": "meve", "hawaii volcanoes": "havo",
        "glacier bay": "glba", "north cascades": "noca", "kenai fjords": "kefj",
        "haleakala": "hale", "channel islands": "chis", "pinnacles": "pinn",
        "lassen volcanic": "lavo", "guadalupe mountains": "gumo",
        "dry tortugas": "drto", "saguaro": "sagu", "petrified forest": "pefo",
        "great sand dunes": "grsa", "black canyon": "blca",
    }
    
    normalized = park_name.lower().replace(' national park', '').replace(' state park', '').strip()
    
    # Try known codes first
    park_code = NPS_PARK_CODES.get(normalized)
    
    if not park_code:
        # Try NPS API
        nps_api_key = os.getenv("NPS_API_KEY", "demo")
        try:
            resp = requests.get(
                "https://developer.nps.gov/api/v1/parks",
                params={"q": park_name, "limit": 1, "api_key": nps_api_key},
                timeout=5,
            )
            if resp.status_code == 200:
                parks = resp.json().get("data", [])
                if parks:
                    park_code = parks[0].get("parkCode")
                    # Also try to get the first image
                    images = parks[0].get("images", [])
                    if images:
                        return images[0].get("url", "🏞️")
        except Exception:
            pass
    
    if park_code:
        # Return NPS badge image URL using known pattern
        return f"https://www.nps.gov/{park_code}/index.htm"
    
    # Check for state parks
    if 'state park' in park_name.lower():
        return "🌲"
    
    return "🏞️"


async def get_park_badge_info(park_name: str) -> Dict[str, Any]:
    """Fetch detailed park badge/image info from NPS API"""
    import os
    import httpx
    
    nps_api_key = os.getenv("NPS_API_KEY", "demo")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://developer.nps.gov/api/v1/parks",
                params={"q": park_name, "limit": 1, "api_key": nps_api_key},
            )
            
            if response.status_code == 200:
                parks = response.json().get("data", [])
                if parks:
                    park = parks[0]
                    images = park.get("images", [])
                    return {
                        "park_code": park.get("parkCode"),
                        "name": park.get("fullName"),
                        "designation": park.get("designation"),
                        "description": park.get("description"),
                        "states": park.get("states"),
                        "url": park.get("url"),
                        "badge_image": images[0].get("url") if images else None,
                        "badge_caption": images[0].get("caption") if images else None,
                        "all_images": [
                            {"url": img.get("url"), "caption": img.get("caption"), "title": img.get("title")}
                            for img in images[:5]
                        ],
                    }
    except Exception as e:
        logger.error(f"Error fetching park badge info: {e}")
    
    return {
        "park_code": None,
        "name": park_name,
        "badge_image": None,
        "all_images": [],
    }


def get_user_stats(user_id: str, db: Session) -> Dict[str, Any]:
    """Get comprehensive user statistics for dashboard"""
    try:
        # Get all completed hikes
        completed_hikes = db.query(Hike).filter(
            Hike.user_id == user_id,
            Hike.status == 'completed'
        ).all()
        
        # Calculate stats
        total_hikes = len(completed_hikes)
        total_distance = sum(h.distance_miles or 0 for h in completed_hikes)
        total_elevation = sum(h.total_elevation_gain_feet or 0 for h in completed_hikes)
        
        # Get unique parks visited
        parks_visited = set()
        for hike in completed_hikes:
            if hike.place and hike.place.name:
                parks_visited.add(hike.place.name)
        
        # Get achievements
        achievements = get_user_achievements(user_id, db)
        
        # Get park-specific achievements
        park_achievements = [a for a in achievements if a['achievement'].get('category') == 'park_explorer']
        
        return {
            "total_hikes": total_hikes,
            "total_distance_miles": round(total_distance, 2),
            "total_elevation_feet": round(total_elevation, 0),
            "parks_visited": len(parks_visited),
            "park_names": list(parks_visited),
            "total_achievements": len(achievements),
            "park_achievements": park_achievements,
            "all_achievements": achievements
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        return {
            "total_hikes": 0,
            "total_distance_miles": 0,
            "total_elevation_feet": 0,
            "parks_visited": 0,
            "park_names": [],
            "total_achievements": 0,
            "park_achievements": [],
            "all_achievements": []
        }
