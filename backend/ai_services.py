"""
AI Services for EcoTrails - Nano Banana Pro, Veo, and Gemini integration
"""
import os
import logging
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from backend.models import Hike, Media, RoutePoint, Discovery

logger = logging.getLogger("EcoAtlas.AI")

# Initialize Gemini client
def get_gemini_client(api_key: Optional[str] = None):
    """Get Gemini client with API key"""
    key = api_key or os.environ.get("API_KEY")
    if not key:
        raise ValueError("API_KEY not set")
    return genai.Client(api_key=key)


async def enhance_photo_nano_banana(
    image_data: bytes,
    options: Dict[str, Any],
    api_key: str
) -> Dict[str, Any]:
    """
    Enhance photo using Nano Banana Pro (Gemini's image editing)
    
    Note: Nano Banana Pro is integrated into Gemini, so we use Gemini's image editing capabilities
    """
    try:
        client = get_gemini_client(api_key)
        
        # Convert image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Create prompt for image enhancement
        enhancement_prompt = f"""Enhance this hiking photo with the following adjustments:
- Lighting: {options.get('lighting', 'natural')}
- Style: {options.get('style', 'natural')}
- Enhance subject: {options.get('enhance_subject', True)}
- Remove shadows: {options.get('remove_shadows', False)}
- Background: {'Replace with natural outdoor background' if options.get('background_replacement') else 'Keep original'}

Apply professional photo enhancement while preserving the authenticity of the scene and subjects.
Return the enhanced image as base64 encoded data."""

        # Use Gemini's image generation/editing capabilities
        # Note: Nano Banana Pro API integration pending - using Gemini vision for now
        import os
        is_dev = os.environ.get("ENVIRONMENT", "production") == "development"
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_data,
                    mime_type="image/jpeg"
                ),
                enhancement_prompt
            ],
            config={
                "temperature": 0.7,
            }
        )
        
        # In production, return error if not fully implemented
        # In dev mode, return metadata for testing
        if not is_dev:
            return {
                "success": False,
                "error": "Photo enhancement not yet fully implemented. Nano Banana Pro API integration required."
            }
        
        # Dev mode: return metadata for testing
        return {
            "success": True,
            "enhancement_suggestions": response.text if hasattr(response, 'text') else "Enhancement applied",
            "original_size": len(image_data),
            "dev_mode": True,
            "note": "DEV MODE: Nano Banana Pro integration pending - enhanced image would be returned here"
        }
        
    except Exception as e:
        logger.error(f"Photo enhancement error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


async def generate_trail_video_veo(
    hike_id: str,
    options: Dict[str, Any],
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """
    Generate trail recap video using Veo
    
    Note: Veo API integration pending - returns error in production mode
    """
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return {"success": False, "error": "Hike not found"}
        
        # Get hike data
        route_points = db.query(RoutePoint).filter(
            RoutePoint.hike_id == hike_id
        ).order_by(RoutePoint.timestamp).all()
        
        media = db.query(Media).filter(
            Media.hike_id == hike_id,
            Media.type == 'photo'
        ).all()
        
        discoveries = db.query(Discovery).filter(
            Discovery.hike_id == hike_id
        ).all()
        
        # Prepare video generation prompt for Veo
        video_prompt = f"""Create a cinematic {options.get('duration', 60)}-second hiking video recap with:
- Style: {options.get('style', 'cinematic')}
- Include elevation changes and terrain transitions
- Show key moments: trail start, discoveries, scenic views, completion
- Music tempo: {options.get('music_tempo', 'medium')}
- Include stats overlay: distance, elevation gain, duration
- Narration: {'Yes' if options.get('include_narration') else 'No'}

Trail: {hike.trail.name if hike.trail else 'Unknown Trail'}
Distance: {hike.distance_miles} miles
Elevation: {hike.elevation_gain_feet} feet
Duration: {hike.duration_minutes} minutes
Discoveries: {len(discoveries)}
Photos: {len(media)}

Create a professional, inspiring video that captures the essence of this hiking adventure."""
        
        # Check if in dev mode
        import os
        is_dev = os.environ.get("ENVIRONMENT", "production") == "development"
        
        # In production, return error if not fully implemented
        if not is_dev:
            return {
                "success": False,
                "error": "Video generation not yet fully implemented. Veo API integration required."
            }
        
        # Dev mode: return placeholder URLs for testing
        return {
            "success": True,
            "video_url": f"/api/v1/videos/{hike_id}/recap.mp4",  # DEV MODE ONLY
            "thumbnail_url": f"/api/v1/videos/{hike_id}/thumbnail.jpg",  # DEV MODE ONLY
            "duration": options.get('duration', 60),
            "status": "generating",
            "dev_mode": True,
            "note": "DEV MODE: Veo video generation - actual video would be generated and stored here"
        }
        
    except Exception as e:
        logger.error(f"Video generation error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


async def generate_hike_story(
    hike_id: str,
    style: str,
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """Generate AI story for hike using Gemini 3 Pro"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return {"success": False, "error": "Hike not found"}
        
        route_points = db.query(RoutePoint).filter(
            RoutePoint.hike_id == hike_id
        ).order_by(RoutePoint.timestamp).all()
        
        discoveries = db.query(Discovery).filter(
            Discovery.hike_id == hike_id
        ).all()
        
        media = db.query(Media).filter(Media.hike_id == hike_id).all()
        
        # Build comprehensive context
        context = f"""
Hike Details:
- Trail: {hike.trail.name if hike.trail else 'Unknown'}
- Distance: {hike.distance_miles} miles
- Elevation Gain: {hike.elevation_gain_feet} feet
- Duration: {hike.duration_minutes} minutes
- Start: {hike.start_time}
- End: {hike.end_time}

Route Points: {len(route_points)} GPS points recorded
Discoveries: {len(discoveries)} - {', '.join([d.discovery_type for d in discoveries[:5]])}
Photos: {len(media)} photos taken
"""
        
        style_prompts = {
            "narrative": "Write a compelling narrative story about this hike, focusing on the journey, challenges overcome, and memorable moments.",
            "poetic": "Write a poetic, reflective piece about this hiking experience, capturing the beauty of nature and the inner journey.",
            "adventure": "Write an exciting adventure story highlighting the challenges, discoveries, and triumphs of this hike.",
            "reflective": "Write a thoughtful, introspective reflection on this hiking experience, focusing on personal growth and connection with nature."
        }
        
        prompt = f"""{style_prompts.get(style, style_prompts['narrative'])}

{context}

Create a rich, engaging story that includes:
1. A main narrative (300-500 words)
2. Key highlights (3-5 bullet points)
3. Emotional journey timeline (correlate emotions with elevation/time)
4. Memorable moments with timestamps

Return as JSON with: story, highlights (array), emotional_journey (array of {{time, emotion, description}}), key_moments (array of {{time, moment, significance}})."""
        
        client = get_gemini_client(api_key)
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",  # Using flash for now, upgrade to 3-pro for production
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.8,
            }
        )
        
        import json
        story_data = json.loads(response.text if hasattr(response, 'text') else '{}')
        
        return {
            "success": True,
            "story": story_data.get("story", ""),
            "highlights": story_data.get("highlights", []),
            "emotional_journey": story_data.get("emotional_journey", []),
            "key_moments": story_data.get("key_moments", [])
        }
        
    except Exception as e:
        logger.error(f"Story generation error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


async def organize_photos_intelligently(
    hike_id: str,
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """Organize photos into smart albums using AI"""
    try:
        media = db.query(Media).filter(
            Media.hike_id == hike_id,
            Media.type == 'photo'
        ).all()
        
        if not media:
            return {
                "success": True,
                "albums": [],
                "tags": [],
                "highlights": []
            }
        
        # Analyze photos with Gemini
        client = get_gemini_client(api_key)
        
        # For each photo, get AI analysis (in production, batch process)
        albums = []
        tags = {}
        highlights = []
        
        # Group photos by location/time/theme
        # This is a simplified version - in production, use Gemini Vision to analyze each photo
        for i, photo in enumerate(media[:10]):  # Limit for demo
            # Analyze photo content
            prompt = f"""Analyze this hiking photo and provide:
1. Theme (e.g., "Scenic View", "Wildlife", "Trail Path", "Discovery")
2. Key tags (e.g., "mountain", "sunset", "wildlife", "waterfall")
3. Is this a highlight photo? (yes/no)

Photo metadata: {photo.meta_data or {}}"""
            
            # In production, send actual image to Gemini Vision
            # For now, create smart groupings based on metadata
            theme = photo.meta_data.get('theme', 'General') if photo.meta_data else 'General'
            
            if not any(a['theme'] == theme for a in albums):
                albums.append({
                    "name": f"{theme} Photos",
                    "photos": [photo.url],
                    "theme": theme,
                    "location": photo.meta_data.get('location') if photo.meta_data else None
                })
            else:
                album = next(a for a in albums if a['theme'] == theme)
                album['photos'].append(photo.url)
        
        return {
            "success": True,
            "albums": albums,
            "tags": [{"tag": "hiking", "photos": [m.url for m in media]}],
            "highlights": [media[0].url] if media else []
        }
        
    except Exception as e:
        logger.error(f"Photo organization error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


async def get_predictive_insights(
    user_id: str,
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """Generate predictive insights about user's hiking patterns"""
    try:
        from backend.hikes_service import get_hike_history
        hikes = get_hike_history(user_id, 50, db)
        
        if not hikes:
            return {
                "patterns": [],
                "recommendations": [],
                "progress_predictions": [],
                "skill_development": {
                    "current_level": "Beginner",
                    "next_milestone": "Complete 5 hikes",
                    "progress_percentage": 0
                }
            }
        
        # Analyze patterns with Gemini
        client = get_gemini_client(api_key)
        
        # Helper function to safely get numeric values (handle None)
        def safe_get(value, default=0):
            return value if value is not None else default
        
        # Calculate totals safely handling None values
        total_distance = sum(safe_get(h.get('distance_miles')) for h in hikes)
        total_elevation = sum(safe_get(h.get('elevation_gain_feet')) for h in hikes)
        avg_elevation = total_elevation / len(hikes) if hikes else 0
        
        # Get favorite difficulty
        difficulties = [h.get('trail', {}).get('difficulty', 'moderate') if isinstance(h.get('trail'), dict) else 'moderate' for h in hikes if h.get('trail')]
        favorite_difficulty = max(set(difficulties), key=difficulties.count) if difficulties else 'moderate'
        
        context = f"""
User has completed {len(hikes)} hikes:
- Total distance: {total_distance} miles
- Average elevation: {avg_elevation:.0f} feet
- Favorite difficulty: {favorite_difficulty}
"""
        
        prompt = f"""Analyze this user's hiking data and provide:
1. Patterns (e.g., "You hike faster on sunny days", "You prefer mountain trails")
2. Trail recommendations based on their history
3. Progress predictions for achievements
4. Skill development assessment

{context}

Return JSON with: patterns (array of {{pattern, confidence, explanation}}), recommendations (array of {{trail_id, reason, match_score}}), progress_predictions (array), skill_development (object)."""
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            }
        )
        
        import json
        insights = json.loads(response.text if hasattr(response, 'text') else '{}')
        
        return {
            "patterns": insights.get("patterns", []),
            "recommendations": insights.get("recommendations", []),
            "progress_predictions": insights.get("progress_predictions", []),
            "skill_development": insights.get("skill_development", {
                "current_level": "Intermediate",
                "next_milestone": "Complete 10 hikes",
                "progress_percentage": 50
            })
        }
        
    except Exception as e:
        logger.error(f"Predictive insights error: {e}", exc_info=True)
        return {
            "patterns": [],
            "recommendations": [],
            "progress_predictions": [],
            "skill_development": {
                "current_level": "Beginner",
                "next_milestone": "Complete 5 hikes",
                "progress_percentage": 0
            }
        }


async def search_journal_natural_language(
    query: str,
    user_id: str,
    filters: Optional[Dict[str, Any]],
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """Natural language search through journal entries"""
    try:
        from backend.journal_service import get_journal_entries
        entries = get_journal_entries(user_id, None, None, 100, db)
        
        # Use Gemini to understand query and match entries
        client = get_gemini_client(api_key)
        
        entries_context = "\n".join([
            f"Entry {i+1}: {e.get('title', '')} - {e.get('content', '')[:200]}..."
            for i, e in enumerate(entries[:20])
        ])
        
        prompt = f"""Search through these journal entries for: "{query}"

Entries:
{entries_context}

Return JSON with: results (array of {{hike_id, relevance_score, matched_snippets, highlights}}), suggestions (array of related search terms)."""
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.5,
            }
        )
        
        import json
        search_results = json.loads(response.text if hasattr(response, 'text') else '{}')
        
        return {
            "results": search_results.get("results", []),
            "suggestions": search_results.get("suggestions", [])
        }
        
    except Exception as e:
        logger.error(f"Journal search error: {e}", exc_info=True)
        return {
            "results": [],
            "suggestions": []
        }
