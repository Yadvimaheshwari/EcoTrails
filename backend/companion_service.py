"""
Real-time companion service for hiking - identifies vegetation, wildlife, and provides guidance
"""
import os
import logging
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
from google import genai
from google.genai import types

logger = logging.getLogger("EcoAtlas.Companion")

class HikingCompanion:
    """AI companion for real-time hiking assistance"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client(api_key=api_key)
    
    async def identify_from_image(
        self,
        image_data: bytes,
        location: Optional[Dict[str, float]] = None,
        trail_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Identify what the user is seeing from a photo
        
        Args:
            image_data: Image bytes
            location: GPS location {lat, lng}
            trail_context: Trail name or context
            
        Returns:
            Identification result with details
        """
        try:
            location_str = ""
            if location:
                location_str = f"Location: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}"
            
            prompt = f"""You are an expert naturalist and hiking companion. Analyze this image taken during a hike.

{location_str}
Trail Context: {trail_context or 'General hiking area'}

Identify and provide detailed information about:

1. **PRIMARY SUBJECT**: What is the main focus of this image?
   - Plant species (common name, scientific name if possible)
   - Animal/wildlife (species, behavior)
   - Geological feature (rock type, formation)
   - Landscape feature
   - Other natural element

2. **DETAILED DESCRIPTION**:
   - Physical characteristics
   - Size/scale
   - Color, texture, shape
   - Unique identifying features

3. **ECOLOGICAL CONTEXT**:
   - Habitat type
   - Ecosystem role
   - Seasonal information
   - Geographic distribution

4. **INTERESTING FACTS**:
   - Fun facts about this subject
   - Historical or cultural significance
   - Conservation status (if applicable)
   - Interesting behaviors or adaptations

5. **SAFETY NOTES** (if applicable):
   - Is this safe to approach/touch?
   - Any hazards or warnings?
   - Best viewing practices

6. **PHOTOGRAPHY TIPS** (if relevant):
   - Best time to photograph
   - Lighting suggestions
   - Composition tips

Return as JSON:
{{
  "primary_subject": {{
    "type": "plant|animal|geological|landscape|other",
    "common_name": "Common name",
    "scientific_name": "Scientific name if known",
    "category": "Specific category"
  }},
  "description": "Detailed description",
  "ecological_context": {{
    "habitat": "Habitat type",
    "ecosystem_role": "Role in ecosystem",
    "seasonal_info": "Seasonal information",
    "distribution": "Geographic distribution"
  }},
  "interesting_facts": ["fact1", "fact2"],
  "safety_notes": ["note1", "note2"],
  "photography_tips": ["tip1", "tip2"],
  "confidence": "high|medium|low"
}}"""

            media_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, media_part],
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.7,
                }
            )
            
            result = response.text if hasattr(response, 'text') else str(response)
            import json
            try:
                identification = json.loads(result)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {result[:200]}")
                # Try to extract JSON from markdown code blocks if present
                if "```json" in result:
                    json_start = result.find("```json") + 7
                    json_end = result.find("```", json_start)
                    if json_end > json_start:
                        result = result[json_start:json_end].strip()
                        identification = json.loads(result)
                else:
                    raise ValueError(f"Invalid JSON response: {str(e)}")
            
            return {
                "success": True,
                "identification": identification,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error identifying from image: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def identify_from_audio(
        self,
        audio_data: bytes,
        location: Optional[Dict[str, float]] = None,
        trail_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Identify sounds from audio recording (bird calls, animal sounds, etc.)
        
        Args:
            audio_data: Audio bytes
            location: GPS location
            trail_context: Trail name or context
            
        Returns:
            Identification result
        """
        try:
            location_str = ""
            if location:
                location_str = f"Location: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}"
            
            prompt = f"""You are an expert naturalist specializing in wildlife sounds. Analyze this audio recording from a hike.

{location_str}
Trail Context: {trail_context or 'General hiking area'}

Identify and provide information about:

1. **SOUND SOURCE**: What is making this sound?
   - Bird species (common name, scientific name)
   - Animal species
   - Natural sound (wind, water, etc.)
   - Other source

2. **SOUND CHARACTERISTICS**:
   - Type of call/sound
   - Purpose (mating, warning, communication, etc.)
   - Time of day context
   - Behavioral context

3. **SPECIES INFORMATION**:
   - Common name
   - Scientific name
   - Habitat preferences
   - Geographic range
   - Interesting behaviors

4. **LISTENING TIPS**:
   - How to identify this sound
   - When you're most likely to hear it
   - What to listen for

Return as JSON:
{{
  "sound_source": {{
    "type": "bird|animal|natural|other",
    "common_name": "Common name",
    "scientific_name": "Scientific name",
    "sound_type": "Type of call/sound"
  }},
  "characteristics": {{
    "purpose": "Purpose of the sound",
    "time_context": "Time of day relevance",
    "behavioral_context": "Behavioral context"
  }},
  "species_info": {{
    "habitat": "Habitat preferences",
    "range": "Geographic range",
    "behaviors": "Interesting behaviors"
  }},
  "listening_tips": ["tip1", "tip2"],
  "confidence": "high|medium|low"
}}"""

            media_part = types.Part.from_bytes(
                data=audio_data,
                mime_type="audio/mpeg"  # Adjust based on actual format
            )
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, media_part],
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.7,
                }
            )
            
            result = response.text if hasattr(response, 'text') else str(response)
            import json
            try:
                identification = json.loads(result)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {result[:200]}")
                # Try to extract JSON from markdown code blocks if present
                if "```json" in result:
                    json_start = result.find("```json") + 7
                    json_end = result.find("```", json_start)
                    if json_end > json_start:
                        result = result[json_start:json_end].strip()
                        identification = json.loads(result)
                else:
                    raise ValueError(f"Invalid JSON response: {str(e)}")
            
            return {
                "success": True,
                "identification": identification,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error identifying from audio: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_trail_vegetation_info(
        self,
        trail_name: str,
        place_name: str,
        location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Get information about vegetation and natural habitat along a trail
        
        Args:
            trail_name: Name of the trail
            place_name: Name of the park/place
            location: GPS location
            
        Returns:
            Vegetation and habitat information
        """
        try:
            location_str = ""
            if location:
                location_str = f"Location: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}"
            
            prompt = f"""You are an expert ecologist. Provide comprehensive information about the vegetation and natural habitat along the trail: {trail_name} in {place_name}.

{location_str}

Provide detailed information about:

1. **VEGETATION ZONES** along the trail:
   - Types of ecosystems (forest, meadow, alpine, etc.)
   - Dominant plant species in each zone
   - Tree species
   - Understory plants
   - Wildflowers (seasonal)
   - Grasses and ground cover

2. **WILDLIFE HABITAT**:
   - Animals you might encounter
   - Bird species
   - Mammals
   - Reptiles/amphibians
   - Insects of interest

3. **SEASONAL VARIATIONS**:
   - What to expect in different seasons
   - Best times to see specific plants/animals
   - Seasonal colors and changes

4. **ECOLOGICAL FEATURES**:
   - Unique ecological relationships
   - Succession patterns
   - Fire ecology (if applicable)
   - Water features and their role

5. **OBSERVATION TIPS**:
   - What to look for
   - Best times to observe
   - How to identify key species
   - Photography opportunities

Return as JSON:
{{
  "vegetation_zones": [
    {{
      "zone_name": "Zone name",
      "ecosystem_type": "Type",
      "dominant_species": ["species1", "species2"],
      "description": "Description"
    }}
  ],
  "wildlife": {{
    "birds": ["species1", "species2"],
    "mammals": ["species1", "species2"],
    "other": ["species1", "species2"]
  }},
  "seasonal_info": {{
    "spring": "What to see in spring",
    "summer": "What to see in summer",
    "fall": "What to see in fall",
    "winter": "What to see in winter"
  }},
  "ecological_features": ["feature1", "feature2"],
  "observation_tips": ["tip1", "tip2"]
}}"""

            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.7,
                }
            )
            
            result = response.text
            import json
            info = json.loads(result)
            
            return {
                "success": True,
                "trail_name": trail_name,
                "place_name": place_name,
                "vegetation_info": info,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting trail vegetation info: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def suggest_next_action(
        self,
        current_location: Dict[str, float],
        trail_progress: float,  # Percentage or miles
        time_of_day: str,
        recent_observations: List[Dict[str, Any]],
        trail_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Suggest the next best action to make the hike more informative and memorable
        
        Args:
            current_location: GPS location
            trail_progress: How far along the trail (0-1 or miles)
            time_of_day: "morning", "afternoon", "evening"
            recent_observations: List of recent identifications
            trail_context: Trail name
            
        Returns:
            Suggested action
        """
        try:
            observations_summary = "\n".join([
                f"- {obs.get('primary_subject', {}).get('common_name', 'Unknown')}: {obs.get('description', '')[:50]}"
                for obs in recent_observations[-5:]  # Last 5 observations
            ])
            
            prompt = f"""You are a hiking companion AI. Based on the current situation, suggest the next best action to make this hike more informative and memorable.

Current Situation:
- Location: {current_location.get('lat', 'N/A')}, {current_location.get('lng', 'N/A')}
- Trail Progress: {trail_progress * 100 if trail_progress < 1 else trail_progress}% or {trail_progress if trail_progress > 1 else 'N/A'} miles
- Time of Day: {time_of_day}
- Trail: {trail_context or 'Unknown trail'}

Recent Observations:
{observations_summary or 'None yet'}

Suggest the next best action. Consider:
- What's interesting nearby based on the location and trail progress
- Time of day opportunities (lighting, wildlife activity)
- Building on recent observations
- Educational opportunities
- Photography opportunities
- Safety considerations
- Making the experience memorable

Return as JSON:
{{
  "suggested_action": {{
    "title": "Action title",
    "description": "Detailed description of what to do",
    "reason": "Why this is a good idea now",
    "expected_outcome": "What you might see/learn",
    "time_estimate": "How long this might take",
    "difficulty": "easy|moderate|challenging"
  }},
  "nearby_opportunities": [
    {{
      "opportunity": "What to look for",
      "location": "Where (relative to current position)",
      "why_interesting": "Why it's worth checking out"
    }}
  ],
  "tips": ["tip1", "tip2"]
}}"""

            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.8,
                }
            )
            
            result = response.text
            import json
            suggestion = json.loads(result)
            
            return {
                "success": True,
                "suggestion": suggestion,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error suggesting next action: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


def get_companion_service(api_key: str) -> HikingCompanion:
    """Get or create companion service instance"""
    return HikingCompanion(api_key)
