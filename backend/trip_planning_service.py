"""
Trip planning service with Gemini AI for generating checklists and packing lists
"""
import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import JournalEntry, Place, User
from google import genai

logger = logging.getLogger("EcoAtlas.TripPlanning")

async def generate_trip_plan(
    place_name: str,
    visit_date: str,
    place_data: Dict[str, Any],
    api_key: str
) -> Dict[str, Any]:
    """
    Generate a comprehensive trip plan using Gemini AI
    
    Args:
        place_name: Name of the park/place
        visit_date: Planned visit date (ISO format)
        place_data: Place information (location, weather, etc.)
        api_key: Gemini API key
        
    Returns:
        Dict with trip plan including checklist and packing list
    """
    try:
        # Use explicit v1alpha to match the rest of the backend and avoid auth-mode ambiguity.
        client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        
        # Build context from place data
        location_info = ""
        if place_data.get("location"):
            loc = place_data["location"]
            location_info = f"Location: {loc.get('lat', 'N/A')}, {loc.get('lng', 'N/A')}"
        
        weather_info = ""
        if place_data.get("weather"):
            w = place_data["weather"]
            weather_info = f"Expected weather: {w.get('description', 'N/A')}, Temp: {w.get('temperature', 'N/A')}°F"
        
        prompt = f"""You are an expert outdoor trip planner. Create a comprehensive trip plan for visiting {place_name} on {visit_date}.

Place Information:
- Name: {place_name}
- {location_info}
- {weather_info}
- Type: {place_data.get('place_type', 'National Park')}

Generate a detailed trip plan with:

1. PRE-TRIP CHECKLIST (organized by category):
   - Documentation & Permits
   - Accommodation & Reservations
   - Transportation
   - Equipment & Gear
   - Health & Safety
   - Communication
   - Food & Water
   - Personal Items

2. PACKING LIST (specific to this park and season):
   - Essential Gear (must-have items)
   - Clothing (appropriate for weather and activities)
   - Safety Items (first aid, navigation, etc.)
   - Food & Water Supplies
   - Optional Items (nice-to-have)
   - Special Considerations (park-specific items)

3. TRIP TIMELINE:
   - Pre-trip (1 week before)
   - Day before
   - Day of trip
   - During trip
   - Post-trip

4. SAFETY TIPS:
   - Weather-related precautions
   - Wildlife safety
   - Trail safety
   - Emergency contacts

5. RECOMMENDED ACTIVITIES:
   - Must-see attractions
   - Best trails for the season
   - Photography spots
   - Educational opportunities

Return as JSON with this structure:
{{
  "checklist": {{
    "documentation": ["item1", "item2"],
    "accommodation": ["item1", "item2"],
    "transportation": ["item1", "item2"],
    "equipment": ["item1", "item2"],
    "health_safety": ["item1", "item2"],
    "communication": ["item1", "item2"],
    "food_water": ["item1", "item2"],
    "personal": ["item1", "item2"]
  }},
  "packing_list": {{
    "essential_gear": ["item1", "item2"],
    "clothing": ["item1", "item2"],
    "safety_items": ["item1", "item2"],
    "food_water": ["item1", "item2"],
    "optional": ["item1", "item2"],
    "special_considerations": ["item1", "item2"]
  }},
  "timeline": {{
    "one_week_before": ["task1", "task2"],
    "day_before": ["task1", "task2"],
    "day_of": ["task1", "task2"],
    "during_trip": ["task1", "task2"],
    "post_trip": ["task1", "task2"]
  }},
  "safety_tips": ["tip1", "tip2"],
  "recommended_activities": ["activity1", "activity2"]
}}

Make it specific to {place_name} and the visit date {visit_date}. Consider seasonal factors, weather patterns, and park-specific requirements."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            }
        )
        
        # Handle response - could be text or have a text attribute
        plan_data = response.text if hasattr(response, 'text') else str(response)
        import json
        try:
            plan = json.loads(plan_data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {plan_data[:200]}")
            # Try to extract JSON from markdown code blocks if present
            if "```json" in plan_data:
                json_start = plan_data.find("```json") + 7
                json_end = plan_data.find("```", json_start)
                if json_end > json_start:
                    plan_data = plan_data[json_start:json_end].strip()
                    plan = json.loads(plan_data)
            else:
                raise ValueError(f"Invalid JSON response: {str(e)}")
        
        return {
            "success": True,
            "place_name": place_name,
            "visit_date": visit_date,
            "plan": plan,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating trip plan: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

def save_trip_plan_to_journal(
    user_id: str,
    place_id: str,
    place_name: str,
    visit_date: str,
    trip_plan: Dict[str, Any],
    db: Session
) -> JournalEntry:
    """Save trip plan as a journal entry"""
    try:
        # Format plan as readable content
        plan_content = f"""# Trip Plan: {place_name}
**Visit Date:** {visit_date}
**Generated:** {trip_plan.get('generated_at', datetime.utcnow().isoformat())}

## Pre-Trip Checklist

"""
        checklist = trip_plan.get("plan", {}).get("checklist", {})
        for category, items in checklist.items():
            plan_content += f"### {category.replace('_', ' ').title()}\n"
            for item in items:
                plan_content += f"- [ ] {item}\n"
            plan_content += "\n"
        
        plan_content += "\n## Packing List\n\n"
        packing = trip_plan.get("plan", {}).get("packing_list", {})
        for category, items in packing.items():
            plan_content += f"### {category.replace('_', ' ').title()}\n"
            for item in items:
                plan_content += f"- [ ] {item}\n"
            plan_content += "\n"
        
        plan_content += "\n## Timeline\n\n"
        timeline = trip_plan.get("plan", {}).get("timeline", {})
        for phase, tasks in timeline.items():
            plan_content += f"### {phase.replace('_', ' ').title()}\n"
            for task in tasks:
                plan_content += f"- {task}\n"
            plan_content += "\n"
        
        plan_content += "\n## Safety Tips\n\n"
        for tip in trip_plan.get("plan", {}).get("safety_tips", []):
            plan_content += f"- {tip}\n"
        
        plan_content += "\n## Recommended Activities\n\n"
        for activity in trip_plan.get("plan", {}).get("recommended_activities", []):
            plan_content += f"- {activity}\n"
        
        entry = JournalEntry(
            id=f"trip_plan_{user_id}_{place_id}_{int(datetime.utcnow().timestamp())}",
            user_id=user_id,
            title=f"Trip Plan: {place_name}",
            content=plan_content,
            entry_type="trip_plan",
            metadata={
                "place_id": place_id,
                "place_name": place_name,
                "visit_date": visit_date,
                "trip_plan_data": trip_plan
            }
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        logger.info(f"Saved trip plan to journal for user {user_id}, place {place_id}")
        return entry
        
    except Exception as e:
        logger.error(f"Error saving trip plan to journal: {e}", exc_info=True)
        db.rollback()
        raise
