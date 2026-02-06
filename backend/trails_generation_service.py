"""
Service to generate trails for places using Gemini AI when trails don't exist in database
"""
import os
import logging
import uuid
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Trail, Place
from google import genai

logger = logging.getLogger("EcoAtlas.TrailsGeneration")

async def generate_trails_for_place(
    place: Place,
    api_key: str,
    db: Session
) -> List[Dict[str, Any]]:
    """
    Generate trails for a place using Gemini AI
    
    Args:
        place: Place database object
        api_key: Gemini API key
        db: Database session
        
    Returns:
        List of generated trail data
    """
    try:
        client = genai.Client(api_key=api_key)
        
        # Build place context
        place_info = f"""
Park/Place Name: {place.name}
Type: {place.place_type}
Description: {place.description or 'National Park'}
Location: {place.location if isinstance(place.location, dict) else 'N/A'}
"""
        
        # Get metadata for additional context
        metadata = place.meta_data or {}
        if metadata.get("rating"):
            place_info += f"Rating: {metadata.get('rating')}/5\n"
        if metadata.get("user_ratings_total"):
            place_info += f"Popularity: {metadata.get('user_ratings_total')} reviews\n"
        
        prompt = f"""You are an expert trail guide and outdoor recreation specialist. Generate a comprehensive list of popular hiking trails for this national park/place.

{place_info}

Generate 5-10 well-known trails that visitors typically hike. For each trail, provide:

1. **Trail Name**: Official or commonly known name
2. **Difficulty**: easy, moderate, hard, or expert
3. **Distance**: in miles (realistic for the trail type)
4. **Elevation Gain**: in feet (realistic for the difficulty)
5. **Estimated Duration**: in minutes (based on distance and difficulty)
6. **Description**: 2-3 sentences about what makes this trail special, what you'll see, and why it's popular

Consider:
- Popular well-known trails that visitors seek out
- Variety in difficulty levels
- Different lengths (short scenic walks to longer day hikes)
- Iconic trails that the park is known for
- Trails suitable for different fitness levels

Return as JSON array:
[
  {{
    "name": "Trail Name",
    "difficulty": "easy|moderate|hard|expert",
    "distance_miles": 2.5,
    "elevation_gain_feet": 500,
    "estimated_duration_minutes": 90,
    "description": "Detailed description of the trail, what you'll see, and why it's popular"
  }}
]

Make the trails realistic and based on actual hiking trails that would exist in a place like {place.name}. Include a mix of:
- Easy scenic trails (1-3 miles)
- Moderate day hikes (3-8 miles)
- Challenging trails (8+ miles or significant elevation)
- Iconic/must-do trails"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            }
        )
        
        trails_data = response.text
        import json
        trails = json.loads(trails_data)
        
        # Ensure it's a list
        if not isinstance(trails, list):
            trails = [trails] if trails else []
        
        # Save trails to database
        saved_trails = []
        for trail_data in trails:
            try:
                trail_id = f"{place.id}_trail_{uuid.uuid4().hex[:8]}"
                trail = Trail(
                    id=trail_id,
                    place_id=place.id,
                    name=trail_data.get("name", "Unnamed Trail"),
                    difficulty=trail_data.get("difficulty", "moderate"),
                    distance_miles=trail_data.get("distance_miles"),
                    elevation_gain_feet=trail_data.get("elevation_gain_feet"),
                    estimated_duration_minutes=trail_data.get("estimated_duration_minutes"),
                    description=trail_data.get("description", ""),
                    meta_data={
                        "source": "gemini_generated",
                        "generated_at": datetime.utcnow().isoformat()
                    }
                )
                db.add(trail)
                saved_trails.append({
                    "id": trail.id,
                    "name": trail.name,
                    "difficulty": trail.difficulty,
                    "distance_miles": trail.distance_miles,
                    "elevation_gain_feet": trail.elevation_gain_feet,
                    "estimated_duration_minutes": trail.estimated_duration_minutes,
                    "description": trail.description,
                    "meta_data": trail.meta_data
                })
            except Exception as e:
                logger.error(f"Error saving trail {trail_data.get('name')}: {e}", exc_info=True)
        
        db.commit()
        logger.info(f"Generated and saved {len(saved_trails)} trails for place {place.id}")
        
        return saved_trails
        
    except Exception as e:
        logger.error(f"Error generating trails for place {place.id}: {e}", exc_info=True)
        db.rollback()
        return []


def get_or_generate_trails(place_id: str, db: Session, api_key: str) -> List[Dict[str, Any]]:
    """
    Get trails from database, or generate them if none exist
    
    Args:
        place_id: Place ID
        db: Database session
        api_key: Gemini API key
        
    Returns:
        List of trail data
    """
    # First check database
    trails = db.query(Trail).filter(Trail.place_id == place_id).all()
    
    if trails:
        return [{
            "id": t.id,
            "name": t.name,
            "difficulty": t.difficulty,
            "distance_miles": t.distance_miles,
            "elevation_gain_feet": t.elevation_gain_feet,
            "estimated_duration_minutes": t.estimated_duration_minutes,
            "description": t.description,
            "meta_data": t.meta_data
        } for t in trails]
    
    # If no trails, try to generate them
    place = db.query(Place).filter(Place.id == place_id).first()
    if place:
        import asyncio
        try:
            # Run async function
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, we need to use a different approach
                # For now, return empty and let the endpoint handle async generation
                return []
            else:
                generated = loop.run_until_complete(
                    generate_trails_for_place(place, api_key, db)
                )
                return generated
        except RuntimeError:
            # No event loop, create one
            generated = asyncio.run(
                generate_trails_for_place(place, api_key, db)
            )
            return generated
    
    return []
