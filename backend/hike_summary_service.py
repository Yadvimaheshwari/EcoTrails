"""
Hike summary service using Gemini Vision to automatically generate comprehensive hike summaries
"""
import os
import logging
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Hike, Media, Discovery, RoutePoint
from google import genai
from google.genai import types

logger = logging.getLogger("EcoAtlas.HikeSummary")

async def generate_hike_summary(
    hike_id: str,
    db: Session,
    api_key: str
) -> Dict[str, Any]:
    """
    Generate comprehensive hike summary using Gemini Vision
    
    Analyzes:
    - All photos from the hike
    - Route points and elevation
    - Discoveries made
    - Weather conditions
    - Time of day patterns
    
    Returns:
        Comprehensive summary with insights
    """
    try:
        client = genai.Client(api_key=api_key)
        
        # Get hike data
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return {"success": False, "error": "Hike not found"}
        
        # Get all media (photos)
        photos = db.query(Media).filter(
            Media.hike_id == hike_id,
            Media.type == 'photo'
        ).all()
        
        # Get discoveries
        discoveries = db.query(Discovery).filter(Discovery.hike_id == hike_id).all()
        
        # Get route points for elevation profile
        route_points = db.query(RoutePoint).filter(RoutePoint.hike_id == hike_id).order_by(RoutePoint.timestamp).all()
        
        # Build context
        trail_name = hike.trail.name if hike.trail else "Unknown Trail"
        place_name = hike.trail.place.name if hike.trail and hike.trail.place else "Unknown Place"
        
        hike_duration = ""
        if hike.duration_minutes:
            hours = hike.duration_minutes // 60
            minutes = hike.duration_minutes % 60
            hike_duration = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        
        distance_info = f"{hike.distance_miles:.2f} miles" if hike.distance_miles else "Unknown distance"
        elevation_info = f"+{int(hike.elevation_gain_feet)} ft" if hike.elevation_gain_feet else "Unknown elevation"
        
        discoveries_summary = []
        for disc in discoveries:
            discoveries_summary.append({
                "type": disc.discovery_type,
                "description": disc.description,
                "confidence": disc.confidence,
                "timestamp": disc.timestamp.isoformat() if disc.timestamp else None
            })
        
        # Prepare photos for analysis
        photo_parts = []
        photo_descriptions = []
        
        for i, photo in enumerate(photos[:10]):  # Limit to 10 photos for analysis
            try:
                if photo.file_path:
                    with open(photo.file_path, 'rb') as f:
                        photo_data = f.read()
                elif photo.url:
                    # If URL, would need to fetch - for now skip
                    continue
                else:
                    continue
                
                photo_parts.append(types.Part.from_bytes(
                    data=photo_data,
                    mime_type="image/jpeg"
                ))
                photo_descriptions.append(f"Photo {i+1}: Taken during hike")
            except Exception as e:
                logger.warning(f"Could not load photo {photo.id}: {e}")
                continue
        
        # Build comprehensive prompt
        prompt = f"""You are an expert hiking companion and naturalist. Analyze this completed hike and generate a comprehensive, engaging summary.

HIKE INFORMATION:
- Trail: {trail_name}
- Location: {place_name}
- Distance: {distance_info}
- Elevation Gain: {elevation_info}
- Duration: {hike_duration}
- Date: {hike.start_time.strftime('%B %d, %Y') if hike.start_time else 'Unknown'}

DISCOVERIES MADE:
{chr(10).join([f"- {d['type']}: {d['description']}" for d in discoveries_summary]) if discoveries_summary else "No specific discoveries logged"}

PHOTOS ANALYZED:
{len(photo_parts)} photos from the hike showing various moments, views, and discoveries.

Generate a comprehensive hike summary that includes:

1. **HIKE NARRATIVE** (2-3 paragraphs):
   - Tell the story of this hike
   - Describe the journey, terrain, and experience
   - Highlight key moments and observations
   - Make it engaging and personal

2. **DISCOVERIES HIGHLIGHT**:
   - Summarize the discoveries made
   - Explain their significance
   - Connect them to the ecosystem

3. **PHOTO INSIGHTS**:
   - What the photos reveal about the hike
   - Key moments captured
   - Environmental context shown

4. **LEARNING HIGHLIGHTS**:
   - What was learned about the area
   - Ecological insights
   - Natural history connections

5. **MEMORABLE MOMENTS**:
   - Standout experiences
   - Unique observations
   - Special moments captured

6. **REFLECTION**:
   - Personal reflection on the experience
   - Connection to nature
   - Takeaways from the hike

Return as JSON:
{{
  "hike_narrative": "Engaging narrative of the hike experience",
  "discoveries_highlight": "Summary of discoveries and their significance",
  "photo_insights": "What the photos reveal about the hike",
  "learning_highlights": ["insight1", "insight2", "insight3"],
  "memorable_moments": ["moment1", "moment2", "moment3"],
  "reflection": "Personal reflection on the experience",
  "key_themes": ["theme1", "theme2"],
  "recommendations": "Suggestions for future visits or similar hikes"
}}"""

        # Generate summary with photos
        contents = [prompt]
        if photo_parts:
            contents.extend(photo_parts)
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.8,
            }
        )
        
        result = response.text
        import json
        try:
            summary = json.loads(result)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown
            if "```json" in result:
                json_start = result.find("```json") + 7
                json_end = result.find("```", json_start)
                if json_end > json_start:
                    result = result[json_start:json_end].strip()
                    summary = json.loads(result)
            else:
                raise
        
        return {
            "success": True,
            "summary": summary,
            "hike_id": hike_id,
            "photos_analyzed": len(photo_parts),
            "discoveries_count": len(discoveries),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating hike summary: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


async def generate_discovery_journal_entry(
    discovery_data: Dict[str, Any],
    location: Dict[str, float],
    trail_context: str,
    api_key: str
) -> Dict[str, Any]:
    """
    Generate a contextual journal entry for a discovery using Gemini Vision
    
    Creates rich, educational journal entries that connect discoveries
    to broader ecological and natural history contexts.
    """
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""You are a naturalist and educator. Create a rich, contextual journal entry for this discovery.

DISCOVERY:
- Type: {discovery_data.get('type', 'Unknown')}
- Description: {discovery_data.get('description', 'No description')}
- Location: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}
- Trail: {trail_context}

Create a journal entry that:
1. Describes what was discovered
2. Explains its ecological significance
3. Connects it to the broader ecosystem
4. Shares interesting natural history facts
5. Reflects on the moment of discovery

Make it personal, educational, and engaging. Write as if documenting a meaningful moment in nature.

Return as JSON:
{{
  "title": "Short, descriptive title",
  "content": "Rich journal entry content (2-3 paragraphs)",
  "educational_notes": ["note1", "note2"],
  "ecological_context": "How this fits into the ecosystem",
  "personal_reflection": "Reflection on the discovery moment"
}}"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.8,
            }
        )
        
        result = response.text
        import json
        entry = json.loads(result)
        
        return {
            "success": True,
            "journal_entry": entry
        }
        
    except Exception as e:
        logger.error(f"Error generating discovery journal entry: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
