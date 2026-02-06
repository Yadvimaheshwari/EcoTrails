"""
Vision Service - Gemini Vision API Integration

Real-time species/object identification for hiking discovery mode.
Uses Gemini's vision capabilities to identify wildlife, plants, geology, and landmarks.
"""

import os
import json
import base64
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Rarity determination based on species type
RARITY_KEYWORDS = {
    'legendary': [
        'condor', 'eagle', 'wolf', 'bear', 'cougar', 'mountain lion', 
        'bobcat', 'owl', 'newt', 'salamander', 'rattlesnake', 'fox',
        'bald eagle', 'golden eagle', 'peregrine falcon'
    ],
    'rare': [
        'hawk', 'heron', 'egret', 'coyote', 'snake', 'lizard', 'turtle',
        'frog', 'toad', 'kingfisher', 'woodpecker', 'vulture', 'orchid',
        'fossil', 'geode', 'crystal', 'obsidian'
    ],
    'uncommon': [
        'deer', 'rabbit', 'squirrel', 'chipmunk', 'hummingbird', 'quail',
        'mushroom', 'fungus', 'fern', 'lichen', 'moss', 'wildflower',
        'granite', 'sandstone', 'serpentine'
    ]
}

# XP values by rarity
XP_BY_RARITY = {
    'common': 20,
    'uncommon': 35,
    'rare': 60,
    'legendary': 100
}


class VisionService:
    """Service for real-time visual identification using Gemini Vision"""
    
    def __init__(self):
        self.client = None
        self.model_name = "gemini-2.0-flash"  # Fast vision model
        
    def _get_client(self):
        """Lazy initialization of Gemini client"""
        if self.client is None:
            api_key = os.environ.get("API_KEY")
            if not api_key:
                raise ValueError("API_KEY environment variable not set")
            self.client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
        return self.client
    
    async def identify_image(
        self,
        image_data: str,
        location: Optional[Dict[str, float]] = None,
        context: str = "hiking_trail_discovery"
    ) -> Dict[str, Any]:
        """
        Identify species/objects in an image using Gemini Vision.
        
        Args:
            image_data: Base64-encoded image (with or without data URI prefix)
            location: Optional GPS coordinates for context
            context: Context hint for better identification
            
        Returns:
            Identification result with species info, confidence, and fun facts
        """
        try:
            client = self._get_client()
            
            # Clean base64 data
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Create image part
            image_bytes = base64.b64decode(image_data)
            
            # Build location context
            location_context = ""
            if location:
                location_context = f"Location: {location.get('lat', 0):.4f}, {location.get('lng', 0):.4f}. "
            
            # Create the prompt
            prompt = f"""You are an expert naturalist and biologist helping hikers identify wildlife, plants, and geological features on the trail.

{location_context}

Analyze this image and identify what you see. Focus on:
1. Wildlife (animals, birds, insects)
2. Plants (trees, flowers, ferns, fungi)
3. Geological features (rocks, formations, fossils)
4. Notable landmarks or features

Respond with a JSON object containing:
{{
    "identified": true/false,
    "name": "Common name of the species/object",
    "scientific_name": "Scientific name if applicable",
    "category": "plant|animal|bird|insect|geology|fungi|landscape|unknown",
    "confidence": 0-100 (your confidence percentage),
    "description": "Brief 1-2 sentence description",
    "habitat": "Where this is typically found",
    "fun_facts": ["List of 2-3 interesting facts"],
    "conservation": "Conservation status if known (e.g., 'Endangered', 'Threatened', null)",
    "season": "Best time of year to see this"
}}

If you cannot identify anything notable, set "identified": false and provide a helpful message in description.
Be accurate and educational. Avoid wild guesses - express uncertainty in your confidence score.
"""

            # Call Gemini Vision API
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.model_name,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,  # Lower temperature for more accurate identification
                )
            )
            
            # Parse response
            result_text = response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            result = json.loads(result_text.strip())
            
            if not result.get("identified", False):
                return {
                    "success": False,
                    "message": result.get("description", "Could not identify anything notable in the image.")
                }
            
            # Determine rarity
            name_lower = result.get("name", "").lower()
            rarity = self._determine_rarity(name_lower)
            
            # Calculate XP
            xp = XP_BY_RARITY.get(rarity, 20)
            
            return {
                "success": True,
                "identification": {
                    "name": result.get("name", "Unknown"),
                    "scientificName": result.get("scientific_name"),
                    "category": result.get("category", "unknown"),
                    "confidence": min(100, max(0, result.get("confidence", 50))),
                    "description": result.get("description", ""),
                    "rarity": rarity,
                    "xp": xp,
                    "funFacts": result.get("fun_facts", []),
                    "habitat": result.get("habitat"),
                    "conservation": result.get("conservation"),
                    "season": result.get("season")
                }
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"[VisionService] JSON parse error: {e}")
            return self._fallback_result()
        except Exception as e:
            logger.error(f"[VisionService] Identification failed: {e}")
            return self._fallback_result()
    
    def _determine_rarity(self, name: str) -> str:
        """Determine rarity based on species name"""
        name_lower = name.lower()
        
        for rarity, keywords in RARITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return rarity
        
        return "common"
    
    def _fallback_result(self) -> Dict[str, Any]:
        """Return a fallback result when API fails"""
        return {
            "success": True,
            "identification": {
                "name": "Unknown Species",
                "scientificName": None,
                "category": "unknown",
                "confidence": 30,
                "description": "We couldn't identify this with confidence. Try capturing a clearer image.",
                "rarity": "common",
                "xp": 10,
                "funFacts": ["Every discovery helps you learn more about nature!"],
                "habitat": None,
                "conservation": None
            }
        }
    
    async def get_nearby_species_hints(
        self,
        location: Dict[str, float],
        season: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get hints about species likely to be found at a location.
        Used for "field guide" hints and gamification.
        """
        try:
            client = self._get_client()
            
            month = datetime.now().strftime("%B")
            
            prompt = f"""You are an expert naturalist. Given this location and time of year, suggest what wildlife, plants, and natural features a hiker might encounter.

Location: {location.get('lat', 0):.4f}, {location.get('lng', 0):.4f}
Season: {season or month}

Respond with a JSON array of 5-8 species/features to look for:
[
    {{
        "name": "Common name",
        "category": "plant|animal|bird|insect|geology|fungi",
        "likelihood": "high|medium|low",
        "hint": "Brief tip on where/how to spot it",
        "xp": 20-100 (rarer = more XP)
    }}
]

Include a mix of common and rare species. Make it feel like a treasure hunt!
"""
            
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                )
            )
            
            result_text = response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            return json.loads(result_text.strip())
            
        except Exception as e:
            logger.error(f"[VisionService] Species hints failed: {e}")
            return self._fallback_species_hints()
    
    def _fallback_species_hints(self) -> List[Dict[str, Any]]:
        """Return fallback species hints"""
        return [
            {"name": "Oak Tree", "category": "plant", "likelihood": "high", "hint": "Look for distinctive lobed leaves", "xp": 20},
            {"name": "Songbird", "category": "bird", "likelihood": "high", "hint": "Listen for melodic calls in trees", "xp": 25},
            {"name": "Deer", "category": "animal", "likelihood": "medium", "hint": "Check meadows at dawn/dusk", "xp": 40},
            {"name": "Wildflower", "category": "plant", "likelihood": "medium", "hint": "Sunny clearings often have blooms", "xp": 25},
            {"name": "Hawk", "category": "bird", "likelihood": "low", "hint": "Scan the sky near ridges", "xp": 60},
        ]
    
    async def identify_image_enhanced(
        self,
        image_data: str,
        location: Optional[Dict[str, float]] = None,
        hike_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced identification using multiple Gemini agents working in parallel:
        - Observer: Visual analysis
        - Spatial: Location verification
        - Bard: Narrative synthesis
        """
        try:
            from backend.agents import EcoAtlasAgents
            
            # Initialize agents
            agents = EcoAtlasAgents(api_key=self.api_key)
            
            # Prepare image
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            
            # Task 1: Observer - Visual analysis
            observer_task = agents.observer.execute(
                task_description="Analyze this image for environmental characteristics, species, and ecosystem health indicators.",
                context=f"Location: {location}" if location else "",
                media_parts=[image_part],
                response_schema={
                    "type": "object",
                    "properties": {
                        "species_identified": {"type": "array", "items": {"type": "string"}},
                        "ecosystem_type": {"type": "string"},
                        "environmental_indicators": {"type": "array", "items": {"type": "string"}},
                        "notable_features": {"type": "array", "items": {"type": "string"}},
                        "confidence": {"type": "number"}
                    }
                }
            )
            
            # Task 2: Spatial - Location verification (if location provided)
            spatial_task = None
            if location:
                spatial_task = agents.spatial.execute(
                    task_description=f"Verify this location ({location['lat']}, {location['lng']}) and identify nearby landmarks or terrain features visible in the image.",
                    context="Use Google Maps grounding to verify location accuracy.",
                    media_parts=[image_part],
                    response_schema={
                        "type": "object",
                        "properties": {
                            "location_verified": {"type": "boolean"},
                            "nearby_landmarks": {"type": "array", "items": {"type": "string"}},
                            "terrain_description": {"type": "string"}
                        }
                    }
                )
            
            # Execute in parallel
            if spatial_task:
                results = await asyncio.gather(observer_task, spatial_task)
                observer_result, spatial_result = results[0], results[1]
            else:
                observer_result = await observer_task
                spatial_result = {}
            
            # Task 3: Bard - Synthesize narrative
            bard_prompt = f"""Create an engaging, educational narrative about this discovery.

Observer findings: {json.dumps(observer_result)}
Location context: {json.dumps(spatial_result)}
Hiker's journey: {hike_context.get('duration_minutes', 0) if hike_context else 0} minutes into hike, {hike_context.get('discoveries_so_far', 0) if hike_context else 0} discoveries made

Write 2-3 sentences that:
1. Celebrate the discovery
2. Share an interesting fact
3. Connect it to the broader ecosystem or trail experience"""

            bard_result = await agents.bard.execute(
                task_description=bard_prompt,
                context="",
                media_parts=[image_part]
            )
            
            # Calculate XP and rarity from observer results
            species_list = observer_result.get('species_identified', [])
            primary_species = species_list[0] if species_list else "Unknown"
            rarity = self._determine_rarity(primary_species)
            xp = XP_BY_RARITY.get(rarity, 20)
            
            # Combine results
            return {
                "success": True,
                "identification": {
                    "name": primary_species,
                    "species": species_list,
                    "ecosystem": observer_result.get('ecosystem_type'),
                    "features": observer_result.get('notable_features', []),
                    "confidence": observer_result.get('confidence', 50),
                    "location_verified": spatial_result.get('location_verified', False) if spatial_result else False,
                    "landmarks": spatial_result.get('nearby_landmarks', []) if spatial_result else [],
                    "narrative": bard_result if isinstance(bard_result, str) else str(bard_result),
                    "xp": xp,
                    "rarity": rarity,
                    "category": "wildlife" if "animal" in observer_result.get('ecosystem_type', '').lower() else "plant"
                },
                "agent_insights": {
                    "observer": observer_result,
                    "spatial": spatial_result,
                    "narrative": bard_result
                },
                "method": "multi_agent_enhanced"
            }
            
        except Exception as e:
            logger.error(f"[VisionService] Enhanced identification failed: {e}")
            # Fallback to basic identification
            return await self.identify_image(image_data, location)


# Singleton instance
vision_service = VisionService()
