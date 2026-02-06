"""
Activity Generation Service

Generates contextual activities using Gemini AI based on:
- Real-time location
- Time of day
- Season
- Weather
- User's pace and preferences
- Recently captured discoveries
"""

import os
import json
import logging
from typing import List, Dict, Any
from datetime import datetime
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class ActivityGenerationService:
    """
    Generate contextual activities using Gemini AI
    Uses Bard agent for narrative and Observer for environmental context
    """
    
    def __init__(self):
        self.api_key = os.environ.get("API_KEY")
        self.client = None
        
    def _get_client(self):
        """Lazy initialization of Gemini client"""
        if not self.client:
            if not self.api_key:
                raise ValueError("API_KEY environment variable not set")
            self.client = genai.Client(api_key=self.api_key, http_options={'api_version': 'v1alpha'})
        return self.client
    
    async def generate_contextual_activities(
        self,
        location: Dict[str, float],
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate 3-5 activities based on real-time context
        
        Args:
            location: {lat, lng, elevation}
            context: {
                season: str,
                time_of_day: str,  # morning, afternoon, evening
                weather: str,
                terrain_type: str,  # forest, alpine, desert
                recent_discoveries: List[str],  # What user has seen
                user_pace: str,  # slow, moderate, fast
                hike_duration_minutes: int
            }
        """
        try:
            client = self._get_client()
            
            prompt = f"""You are an expert outdoor educator and trail guide. Generate engaging, educational activities for a hiker at this moment in their journey.

CONTEXT:
- Location: {location['lat']:.4f}, {location['lng']:.4f}, Elevation: {location.get('elevation', 'unknown')}m
- Season: {context.get('season', 'unknown')}
- Time: {context.get('time_of_day', 'daytime')}
- Weather: {context.get('weather', 'clear')}
- Terrain: {context.get('terrain_type', 'mixed')}
- Recent discoveries: {', '.join(context.get('recent_discoveries', [])[:3]) or 'None yet'}
- Hike duration so far: {context.get('hike_duration_minutes', 0)} minutes

Generate 4-5 contextual activities that:
1. Match the current environment and conditions
2. Are achievable right now (not "wait until sunset")
3. Teach something meaningful about nature
4. Range from quick (5 min) to moderate (15 min)
5. Mix observation, photography, listening, and mindfulness

Respond with JSON array:
[
  {{
    "type": "observation|photo_challenge|audio_listen|mindfulness|exploration",
    "title": "Engaging title (5-7 words)",
    "description": "What to do (1-2 sentences)",
    "prompt": "Specific instructions",
    "xp": 20-60 (based on effort),
    "estimated_minutes": 5-15,
    "educational_note": "What they'll learn",
    "completion_criteria": {{"type": "timer|photo|observation_count|audio_duration"}},
    "contextual_reason": "Why this activity right now?"
  }}
]

Make activities feel like they were hand-picked for this exact moment. Be creative and educational."""

            response = await client.aio.models.generate_content(
                model="gemini-2.0-flash-thinking-exp-01-21",
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.8,  # More creative
                    thinking_config=types.ThinkingConfig(thinking_budget=8000)
                )
            )
            
            activities_text = response.text.strip()
            if activities_text.startswith("```json"):
                activities_text = activities_text[7:-3]
            
            activities = json.loads(activities_text)
            
            # Add generated timestamp and IDs
            for activity in activities:
                activity['id'] = f"dynamic-{datetime.utcnow().timestamp()}-{hash(activity['title']) % 10000}"
                activity['generated_at'] = datetime.utcnow().isoformat()
                activity['is_dynamic'] = True
            
            logger.info(f"Generated {len(activities)} contextual activities")
            return activities
            
        except Exception as e:
            logger.error(f"Activity generation failed: {e}")
            return self._fallback_activities(context)
    
    def _fallback_activities(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generic fallback activities when AI fails"""
        return [
            {
                "id": "fallback-1",
                "type": "observation",
                "title": "Five Senses Check-In",
                "description": "Pause and engage all five senses",
                "prompt": "What do you see, hear, smell, feel, and taste right now?",
                "xp": 25,
                "estimated_minutes": 5,
                "completion_criteria": {"type": "timer", "duration_seconds": 300},
                "educational_note": "Mindfulness enhances awareness of your surroundings",
                "contextual_reason": "Take a moment to connect with nature"
            },
            {
                "id": "fallback-2",
                "type": "photo_challenge",
                "title": "Capture a Pattern",
                "description": "Find and photograph a pattern in nature",
                "prompt": "Look for repeating shapes, textures, or colors",
                "xp": 30,
                "estimated_minutes": 7,
                "completion_criteria": {"type": "photo"},
                "educational_note": "Patterns reveal nature's mathematical beauty",
                "contextual_reason": "Sharpen your observational skills"
            },
            {
                "id": "fallback-3",
                "type": "audio_listen",
                "title": "Soundscape Survey",
                "description": "Identify different sounds in your environment",
                "prompt": "Listen carefully for 3 minutes. How many distinct sounds can you identify?",
                "xp": 35,
                "estimated_minutes": 5,
                "completion_criteria": {"type": "audio_duration", "duration_seconds": 180},
                "educational_note": "Acoustic ecology helps understand ecosystem health",
                "contextual_reason": "Tune into the trail's natural symphony"
            }
        ]


# Singleton instance
activity_generation_service = ActivityGenerationService()
