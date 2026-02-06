"""
Trail map generation service using Gemini to create detailed cartoon-style maps
"""
import os
import logging
import base64
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.models import Trail, Place
from google import genai
from google.genai import types

logger = logging.getLogger("EcoAtlas.TrailMap")

async def generate_trail_map(
    trail: Trail,
    place: Place,
    api_key: str
) -> Dict[str, Any]:
    """
    Generate a detailed cartoon-style trail map using Gemini
    
    Args:
        trail: Trail database object
        place: Place database object
        api_key: Gemini API key
        
    Returns:
        Dict with map data (SVG/description that can be rendered)
    """
    try:
        client = genai.Client(api_key=api_key)
        
        # Build trail context
        trail_info = f"""
Trail Name: {trail.name}
Distance: {trail.distance_miles} miles
Elevation Gain: {trail.elevation_gain_feet} feet
Difficulty: {trail.difficulty}
Description: {trail.description or 'No description available'}
"""
        
        place_info = f"""
Park/Place: {place.name}
Location: {place.location if isinstance(place.location, dict) else 'N/A'}
Type: {place.place_type}
"""
        
        prompt = f"""You are a professional cartographer and trail mapping specialist. Create a detailed, intuitive, and aesthetically pleasing topographic trail map for hiking that can be used offline. This map should be professional-grade, detail-oriented, and highly informative - NOT cartoon-style. The map should look like a professional USGS-style topographic map with clear, readable typography and precise symbology suitable for navigation.

{place_info}

{trail_info}

Create a comprehensive, professional topographic trail map with:

1. **TRAIL ROUTE** (Primary focus):
   - Main trail path (thick, clearly visible line with trail name)
   - Start point (trailhead) with parking icon
   - End point or loop return point
   - Key waypoints with distance markers (every 0.25-0.5 miles)
   - Elevation markers at significant points
   - Switchbacks clearly indicated
   - Trail junctions with connecting trail names
   - Side trails or alternate routes (if applicable)

2. **TOPOGRAPHIC DETAILS** (Critical for navigation):
   - Contour lines showing elevation changes (subtle, professional)
   - Elevation labels at peaks, saddles, and key points
   - Slope indicators (steep sections clearly marked)
   - Terrain shading to show relief
   - Elevation profile chart (small inset or along trail)

3. **TERRAIN FEATURES** (Realistic representation):
   - Mountain peaks with elevation labels
   - Ridges and valleys
   - Water features (rivers, streams, lakes, waterfalls) with names
   - Forested areas (different tree types if known)
   - Open meadows/clearings
   - Rock formations and cliffs
   - Scree fields or talus slopes
   - Wetlands or marshy areas

4. **LANDMARKS & POINTS OF INTEREST** (Precise locations):
   - Scenic viewpoints (with icons and names)
   - Rest areas or benches
   - Water sources (springs, streams, lakes) - critical for safety
   - Trail junctions with connecting trail names
   - Emergency markers or waypoints
   - Parking areas and access roads
   - Campgrounds or backcountry sites
   - Historical markers or interpretive signs
   - Geological features of interest

5. **SAFETY INFORMATION** (Clearly marked):
   - Steep/dangerous sections (red warning indicators)
   - Areas prone to weather issues (exposure, avalanche risk)
   - Wildlife viewing areas
   - Emergency contact points or ranger stations
   - Cell phone coverage areas (if known)
   - First aid locations
   - Escape routes or bailout points

6. **VEGETATION & HABITAT ZONES** (Ecological context):
   - Different ecosystem zones along the trail (alpine, subalpine, forest, etc.)
   - Dominant tree species in different sections
   - Wildlife habitat areas
   - Wildflower areas (seasonal indicators)
   - Burn areas or recent disturbances

7. **NAVIGATION AIDS** (Professional cartographic elements):
   - Compass rose (showing magnetic north and true north)
   - Scale bar (with both metric and imperial)
   - Detailed legend explaining all symbols
   - Grid lines or coordinate system (if applicable)
   - Trail difficulty markers at key sections
   - Estimated time markers (based on average pace)
   - Distance markers (cumulative from start)

Return as JSON with this structure:
{{
  "map_description": "Detailed text description of the map layout",
  "waypoints": [
    {{
      "name": "Start Point",
      "distance_from_start": 0.0,
      "elevation": 5000,
      "type": "trailhead",
      "description": "Parking and trail start",
      "coordinates": {{"lat": 48.7, "lng": -113.7}}
    }}
  ],
  "terrain_features": [
    {{
      "type": "mountain",
      "name": "Summit Peak",
      "elevation": 8000,
      "location": "2.5 miles from start",
      "description": "Highest point on trail"
    }}
  ],
  "landmarks": [
    {{
      "name": "Scenic Overlook",
      "distance_from_start": 1.2,
      "type": "viewpoint",
      "description": "360-degree mountain views"
    }}
  ],
  "safety_notes": [
    {{
      "location": "Mile 2.0-2.5",
      "type": "steep_section",
      "warning": "Steep rocky section, use caution"
    }}
  ],
  "vegetation_zones": [
    {{
      "name": "Alpine Meadow",
      "start_mile": 0.0,
      "end_mile": 1.5,
      "vegetation": ["wildflowers", "grasses"],
      "wildlife": ["marmots", "pikas"]
    }}
  ],
  "navigation": {{
    "compass_directions": {{
      "north": "toward summit",
      "south": "toward trailhead",
      "east": "valley view",
      "west": "mountain range"
    }},
    "scale": "1 inch = 0.5 miles",
    "estimated_time": "{trail.estimated_duration_minutes} minutes"
  }},
  "svg_code": "A complete, ready-to-render SVG map as a JSON-escaped string. CRITICAL: All newlines must be escaped as \\n, quotes as \\\", and backslashes as \\\\. The SVG should be a valid XML string starting with <svg> and ending with </svg>. Keep the SVG compact (single line preferred) or properly escape all special characters. This must be a PROFESSIONAL TOPOGRAPHIC MAP, not cartoon-style. Include: trail path (thick, clearly visible line #2C5530 or #1B4332), contour lines (subtle gray #D3D3D3), waypoints (numbered markers with elevation), landmarks (precise icons), elevation profile chart, compass rose, scale bar, and professional cartographic elements. Use professional colors: trail path #2C5530 or #1B4332 (dark green/brown), landmarks #228B22 (forest green), water #4A90E2 (blue), mountains #8B7355 (earth tones), forests #3D5A3D (dark green), elevation labels #2C2C2C (dark gray), contour lines #C0C0C0 (light gray). The map should look like a professional USGS-style topographic map - detailed, accurate, and highly informative. Make it approximately 1000x800 pixels for better detail, with clear typography and professional symbology suitable for navigation."
}}

Make the map highly detailed and suitable for offline navigation. Include all information a hiker would need without internet access.

CRITICAL: The svg_code field must contain a complete, valid SVG XML string that starts with <svg> and ends with </svg>. It should be renderable directly in HTML without any modifications. Do not wrap it in markdown code blocks or add any extra formatting - just the raw SVG XML string."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.8,
            }
        )
        
        # Handle response - could be text or have a text attribute
        map_data = response.text if hasattr(response, 'text') else str(response)
        import json
        import re
        
        def clean_json_string(s: str) -> str:
            """Remove or escape control characters that break JSON parsing"""
            # First, try to find and fix the SVG code field specifically
            # SVG code might contain unescaped newlines and other characters
            if '"svg_code"' in s or "'svg_code'" in s:
                # Try to extract and properly escape the SVG code
                # Find the svg_code field and its value
                svg_pattern = r'["\']svg_code["\']\s*:\s*["\']([^"\']*(?:\\.[^"\']*)*)["\']'
                # But this won't work for multi-line strings, so let's use a different approach
                # We'll clean all control characters that aren't properly escaped
                pass
            
            # Remove control characters that aren't part of valid JSON escape sequences
            # Keep \n, \r, \t when they're escaped, but remove raw control chars
            # Replace unescaped control characters with spaces
            s = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', ' ', s)
            return s
        
        try:
            # First, try to extract JSON from markdown code blocks if present
            if "```json" in map_data:
                json_start = map_data.find("```json") + 7
                json_end = map_data.find("```", json_start)
                if json_end > json_start:
                    map_data = map_data[json_start:json_end].strip()
            
            # Clean the JSON string
            cleaned_data = clean_json_string(map_data)
            
            # Try to parse the JSON
            map_info = json.loads(cleaned_data)
            
            # If svg_code exists, clean it up (it might have control characters)
            if 'svg_code' in map_info and isinstance(map_info['svg_code'], str):
                # Remove any control characters from SVG code
                map_info['svg_code'] = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', map_info['svg_code'])
                # Ensure it's a valid SVG string
                if not map_info['svg_code'].strip().startswith('<svg'):
                    logger.warning("SVG code doesn't start with <svg, might be malformed")
                    
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response. Error at position {e.pos}: {str(e)}")
            logger.error(f"Response preview (first 500 chars): {map_data[:500]}")
            
            # Try a more aggressive cleaning approach
            try:
                # Find the JSON object boundaries
                brace_start = map_data.find('{')
                brace_end = map_data.rfind('}')
                if brace_start >= 0 and brace_end > brace_start:
                    json_str = map_data[brace_start:brace_end+1]
                    
                    # Remove all control characters that break JSON parsing
                    # Replace them with spaces to preserve JSON structure
                    json_str = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', ' ', json_str)
                    
                    # Try to parse the cleaned JSON
                    map_info = json.loads(json_str)
                    
                    # Clean the SVG code after parsing (remove any remaining problematic chars)
                    if 'svg_code' in map_info and isinstance(map_info['svg_code'], str):
                        # Remove control characters but preserve valid SVG structure
                        map_info['svg_code'] = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', map_info['svg_code'])
                        # Ensure it's a valid SVG - try to extract if malformed
                        if not map_info['svg_code'].strip().startswith('<svg'):
                            logger.warning("SVG code doesn't start with <svg, attempting to extract")
                            svg_match = re.search(r'<svg[^>]*>.*?</svg>', map_info['svg_code'], re.DOTALL)
                            if svg_match:
                                map_info['svg_code'] = svg_match.group(0)
                else:
                    raise ValueError(f"Could not find JSON object boundaries: {str(e)}")
            except Exception as e2:
                logger.error(f"Failed to recover JSON: {str(e2)}")
                # Last resort: try to parse with strict=False (but json.loads doesn't have that)
                # Instead, return a partial response
                raise ValueError(f"Invalid JSON response: {str(e)}")
        
        return {
            "success": True,
            "trail_id": trail.id,
            "trail_name": trail.name,
            "map_data": map_info,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating trail map: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
