"""
Insights service with 10-step Gemini analysis pipeline
"""
import os
import json
import logging
import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from backend.models import (
    Hike, Media, RoutePoint, SensorBatch, Discovery, SensoryMemory,
    MasteryRecord, JournalEntry, Insight
)

logger = logging.getLogger("EcoAtlas.Insights")

FAST_MODEL = "gemini-2.0-flash"
PRO_MODEL = "gemini-2.0-flash"  # Using flash for now, can upgrade to pro later


def parse_json_response(text: str) -> Dict[str, Any]:
    """Parse JSON from Gemini response"""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


async def call_gemini(
    prompt: str,
    context: str = "",
    model: str = FAST_MODEL,
    response_schema: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Call Gemini API with retry logic"""
    api_key = api_key or os.environ.get("API_KEY")
    if not api_key:
        raise ValueError("API_KEY not set")
    
    client = genai.Client(api_key=api_key)
    
    for attempt in range(max_retries):
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json" if response_schema else "text/plain",
                response_schema=response_schema if response_schema else None
            )
            
            full_prompt = f"{prompt}\n\nCONTEXT:\n{context}" if context else prompt
            
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=[full_prompt],
                config=config
            )
            
            if response_schema:
                return parse_json_response(response.text)
            return {"text": response.text}
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
    
    raise Exception("Failed to call Gemini after retries")


# Task 1: Build core hike record
async def task1_build_core_record(
    hike_data: Dict[str, Any],
    sensor_data: List[Dict[str, Any]],
    weather_data: Optional[Dict[str, Any]],
    park_metadata: Optional[Dict[str, Any]],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 1: Build core hike record"""
    prompt = """Build a comprehensive core hike record from the provided data.
Include: distance, elevation profile, duration, terrain characteristics, weather conditions, and any notable patterns.
Output as JSON with fields: distance_miles, elevation_gain_feet, max_altitude_feet, duration_minutes, terrain_type, weather_summary, notable_patterns."""
    
    context = f"""
Hike Data: {json.dumps(hike_data)}
Sensor Data: {json.dumps(sensor_data[:50])}  # Limit to first 50 for context
Weather: {json.dumps(weather_data)}
Park Metadata: {json.dumps(park_metadata)}
"""
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "distance_miles": {"type": "NUMBER"},
            "elevation_gain_feet": {"type": "NUMBER"},
            "max_altitude_feet": {"type": "NUMBER"},
            "duration_minutes": {"type": "NUMBER"},
            "terrain_type": {"type": "STRING"},
            "weather_summary": {"type": "STRING"},
            "notable_patterns": {"type": "ARRAY", "items": {"type": "STRING"}}
        }
    }
    
    return await call_gemini(prompt, context, FAST_MODEL, schema, api_key)


# Task 2: Infer mastery milestones
async def task2_infer_mastery_milestones(
    core_record: Dict[str, Any],
    route_points: List[Dict[str, Any]],
    sensor_data: List[Dict[str, Any]],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 2: Infer mastery milestones"""
    prompt = """Analyze the hike data to infer mastery milestones achieved.
Consider: altitude milestones, scrambling likelihood (class 1-5), navigation complexity, night/winter hiking, river crossings, exposure tolerance.
Output as JSON with fields: altitude_milestone, scrambling_likelihood, navigation_complexity, night_hiking, winter_hiking, river_crossings, exposure_tolerance.
Each field should indicate if achieved and the level/class."""
    
    context = f"""
Core Record: {json.dumps(core_record)}
Route Points: {len(route_points)} points
Sensor Data: {len(sensor_data)} batches
"""
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "altitude_milestone": {"type": "OBJECT", "properties": {"achieved": {"type": "BOOLEAN"}, "value_feet": {"type": "NUMBER"}}},
            "scrambling_likelihood": {"type": "OBJECT", "properties": {"achieved": {"type": "BOOLEAN"}, "class": {"type": "STRING"}}},
            "navigation_complexity": {"type": "OBJECT", "properties": {"achieved": {"type": "BOOLEAN"}, "level": {"type": "STRING"}}},
            "night_hiking": {"type": "BOOLEAN"},
            "winter_hiking": {"type": "BOOLEAN"},
            "river_crossings": {"type": "BOOLEAN"},
            "exposure_tolerance": {"type": "OBJECT", "properties": {"before": {"type": "STRING"}, "after": {"type": "STRING"}}}
        }
    }
    
    return await call_gemini(prompt, context, FAST_MODEL, schema, api_key)


# Task 3: Analyze visuals
async def task3_analyze_visuals(
    media_list: List[Dict[str, Any]],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 3: Analyze visuals for environmental patterns"""
    if not media_list:
        return {"visual_patterns": [], "temporal_changes": [], "inferences": []}
    
    prompt = """Analyze the provided images for environmental patterns.
Look for: vegetation density, soil exposure, moisture indicators, terrain transitions.
Output as JSON with fields: visual_patterns (array of strings), temporal_changes (array of strings), inferences (array of objects with inference and confidence)."""
    
    # Note: In production, you'd load actual image data here
    context = f"Media count: {len(media_list)} images/videos"
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "visual_patterns": {"type": "ARRAY", "items": {"type": "STRING"}},
            "temporal_changes": {"type": "ARRAY", "items": {"type": "STRING"}},
            "inferences": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "inference": {"type": "STRING"},
                        "confidence": {"type": "STRING", "enum": ["Low", "Medium", "High"]}
                    }
                }
            }
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 4: Analyze audio
async def task4_analyze_audio(
    audio_media: List[Dict[str, Any]],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 4: Analyze ambient audio for soundscape"""
    if not audio_media:
        return {"summary": "No audio data", "richness": "unknown", "confidence_notes": "No audio provided"}
    
    prompt = """Analyze the ambient audio for soundscape characteristics.
Look for: biodiversity richness (low/moderate/high), water presence, wind patterns, human activity.
Output as JSON with fields: summary, richness (enum: low/moderate/high), detected_sounds (array), confidence_notes."""
    
    context = f"Audio clips: {len(audio_media)}"
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "summary": {"type": "STRING"},
            "richness": {"type": "STRING", "enum": ["low", "moderate", "high"]},
            "detected_sounds": {"type": "ARRAY", "items": {"type": "STRING"}},
            "confidence_notes": {"type": "STRING"}
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 5: Fuse satellite context
async def task5_fuse_satellite_context(
    ground_observations: Dict[str, Any],
    location: Dict[str, float],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 5: Fuse satellite context with ground observations"""
    prompt = """Compare large-scale satellite/remote sensing patterns with on-ground observations.
Identify: consistent observations, divergent observations, unclear areas.
Output as JSON with fields: consistent_observations (array), divergent_observations (array), unclear_areas (array)."""
    
    context = f"""
Ground Observations: {json.dumps(ground_observations)}
Location: {location}
"""
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "consistent_observations": {"type": "ARRAY", "items": {"type": "STRING"}},
            "divergent_observations": {"type": "ARRAY", "items": {"type": "STRING"}},
            "unclear_areas": {"type": "ARRAY", "items": {"type": "STRING"}}
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 6: Generate discoveries
async def task6_generate_discoveries(
    all_data: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 6: Generate discoveries"""
    prompt = """Generate discoveries from the hike data.
Categories: wildlife encounter likelihood, rare plants/ecology, geology features, hidden features, historical/cultural finds.
Use probabilistic language. Include confidence levels.
Output as JSON with array of discoveries, each with: type, description, confidence, evidence_notes, what_would_improve_certainty."""
    
    context = json.dumps(all_data, indent=2)
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "discoveries": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "type": {"type": "STRING", "enum": ["wildlife", "plant", "geology", "feature", "cultural"]},
                        "description": {"type": "STRING"},
                        "confidence": {"type": "STRING", "enum": ["Low", "Medium", "High"]},
                        "evidence_notes": {"type": "STRING"},
                        "what_would_improve_certainty": {"type": "STRING"}
                    }
                }
            }
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 7: Generate sensory memory
async def task7_generate_sensory_memory(
    hike_summary: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 7: Generate sensory/emotional memory layer"""
    prompt = """Generate sensory and emotional memory insights from the hike.
Include: quietness rating (0-10), awe scale (0-10), loneliness vs peace, fear moments, confidence growth, mental clarity, most beautiful moment, hardest segment, gratitude moment, almost quit moment.
Output as JSON with all these fields."""
    
    context = json.dumps(hike_summary, indent=2)
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "quietness_rating": {"type": "NUMBER"},
            "awe_scale": {"type": "NUMBER"},
            "loneliness_vs_peace": {"type": "STRING"},
            "fear_moments": {"type": "ARRAY", "items": {"type": "STRING"}},
            "confidence_growth": {"type": "NUMBER"},
            "mental_clarity": {"type": "NUMBER"},
            "most_beautiful_moment": {"type": "STRING"},
            "hardest_segment": {"type": "STRING"},
            "gratitude_moment": {"type": "STRING"},
            "almost_quit_moment": {"type": "STRING"}
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 8: Update achievements
async def task8_update_achievements(
    hike_data: Dict[str, Any],
    all_hikes_summary: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 8: Identify achievement codes"""
    prompt = """Identify achievement codes that should be unlocked based on this hike and user's overall hiking history.
Consider: first hike, expert trail, wildlife encounter, highest point, longest day, most elevation, etc.
Output as JSON with array of achievement codes."""
    
    context = f"""
Current Hike: {json.dumps(hike_data)}
All Hikes Summary: {json.dumps(all_hikes_summary)}
"""
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "achievement_codes": {"type": "ARRAY", "items": {"type": "STRING"}}
        }
    }
    
    return await call_gemini(prompt, context, FAST_MODEL, schema, api_key)


# Task 9: Generate legacy journal
async def task9_generate_legacy_journal(
    complete_analysis: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 9: Generate 300-500 word legacy journal narrative"""
    prompt = """Write a 300-500 word narrative journal entry about this hike.
Tone: calm, reflective, nature-focused. Avoid technical language. Focus on the experience, observations, and feelings.
Output as JSON with fields: title, content (the narrative text)."""
    
    context = json.dumps(complete_analysis, indent=2)
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING"},
            "content": {"type": "STRING"}
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


# Task 10: Produce final report
async def task10_produce_final_report(
    complete_analysis: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Task 10: Produce final post-hike report (6 cards max)"""
    prompt = """Create a final post-hike report with maximum 6 insight cards.
Each card should have: title, summary, confidence (Low/Medium/High), evidence_links (array of media IDs or references).
Focus on the most meaningful insights. Be concise.
Output as JSON with array of report cards."""
    
    context = json.dumps(complete_analysis, indent=2)
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "cards": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "summary": {"type": "STRING"},
                        "confidence": {"type": "STRING", "enum": ["Low", "Medium", "High"]},
                        "evidence_links": {"type": "ARRAY", "items": {"type": "STRING"}}
                    }
                }
            }
        }
    }
    
    return await call_gemini(prompt, context, PRO_MODEL, schema, api_key)


async def run_hike_analysis(hike_id: str, db: Session, api_key: Optional[str] = None) -> bool:
    """Run the complete 10-step analysis pipeline"""
    try:
        # Fetch hike data
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            logger.error(f"Hike {hike_id} not found")
            return False
        
        # Fetch related data
        route_points = db.query(RoutePoint).filter(RoutePoint.hike_id == hike_id).all()
        sensor_batches = db.query(SensorBatch).filter(SensorBatch.hike_id == hike_id).all()
        media_list = db.query(Media).filter(Media.hike_id == hike_id).all()
        
        # Prepare data
        hike_data = {
            "id": hike.id,
            "distance_miles": hike.distance_miles,
            "duration_minutes": hike.duration_minutes,
            "elevation_gain_feet": hike.elevation_gain_feet,
            "max_altitude_feet": hike.max_altitude_feet,
            "weather": hike.weather,
            "start_time": hike.start_time.isoformat() if hike.start_time else None,
            "end_time": hike.end_time.isoformat() if hike.end_time else None
        }
        
        route_data = [{
            "latitude": rp.latitude,
            "longitude": rp.longitude,
            "altitude": rp.altitude,
            "timestamp": rp.timestamp.isoformat()
        } for rp in route_points]
        
        sensor_data = [{
            "timestamp": sb.timestamp.isoformat(),
            "heart_rate": sb.heart_rate,
            "cadence": sb.cadence,
            "altitude": sb.altitude
        } for sb in sensor_batches]
        
        media_data = [{
            "id": m.id,
            "type": m.type,
            "category": m.category,
            "url": m.url
        } for m in media_list]
        
        audio_media = [m for m in media_data if m["type"] == "audio"]
        visual_media = [m for m in media_data if m["type"] in ["photo", "video"]]
        
        # Run all 10 tasks
        logger.info(f"Starting analysis for hike {hike_id}")
        
        core_record = await task1_build_core_record(hike_data, sensor_data, hike.weather, None, api_key)
        mastery_milestones = await task2_infer_mastery_milestones(core_record, route_data, sensor_data, api_key)
        visual_analysis = await task3_analyze_visuals(visual_media, api_key)
        audio_analysis = await task4_analyze_audio(audio_media, api_key)
        
        ground_observations = {
            "visual": visual_analysis,
            "audio": audio_analysis,
            "core": core_record
        }
        location = route_data[0] if route_data else {"latitude": 0, "longitude": 0}
        satellite_fusion = await task5_fuse_satellite_context(ground_observations, location, api_key)
        
        all_data = {
            "hike": hike_data,
            "core_record": core_record,
            "mastery": mastery_milestones,
            "visual": visual_analysis,
            "audio": audio_analysis,
            "satellite": satellite_fusion
        }
        discoveries = await task6_generate_discoveries(all_data, api_key)
        
        sensory_memory = await task7_generate_sensory_memory(all_data, api_key)
        
        # Get user's all hikes summary
        all_hikes = db.query(Hike).filter(Hike.user_id == hike.user_id).all()
        all_hikes_summary = {
            "total_hikes": len(all_hikes),
            "total_distance": sum(h.distance_miles or 0 for h in all_hikes),
            "max_elevation": max((h.max_altitude_feet or 0 for h in all_hikes), default=0)
        }
        achievements = await task8_update_achievements(hike_data, all_hikes_summary, api_key)
        
        complete_analysis = {**all_data, "discoveries": discoveries, "sensory": sensory_memory}
        legacy_journal = await task9_generate_legacy_journal(complete_analysis, api_key)
        final_report = await task10_produce_final_report(complete_analysis, api_key)
        
        # Store results in database
        # Store discoveries
        if discoveries.get("discoveries"):
            for disc_data in discoveries["discoveries"]:
                discovery = Discovery(
                    id=str(uuid.uuid4()),
                    hike_id=hike_id,
                    discovery_type=disc_data["type"],
                    timestamp=datetime.utcnow(),
                    confidence=disc_data["confidence"],
                    description=disc_data["description"],
                    notes=disc_data.get("what_would_improve_certainty")
                )
                db.add(discovery)
        
        # Store sensory memory
        if sensory_memory:
            sensory = SensoryMemory(
                id=str(uuid.uuid4()),
                hike_id=hike_id,
                quietness_rating=sensory_memory.get("quietness_rating"),
                awe_scale=sensory_memory.get("awe_scale"),
                loneliness_vs_peace=sensory_memory.get("loneliness_vs_peace"),
                fear_moments=sensory_memory.get("fear_moments"),
                confidence_growth=sensory_memory.get("confidence_growth"),
                mental_clarity=sensory_memory.get("mental_clarity"),
                most_beautiful_moment=sensory_memory.get("most_beautiful_moment"),
                hardest_segment=sensory_memory.get("hardest_segment"),
                gratitude_moment=sensory_memory.get("gratitude_moment"),
                almost_quit_moment=sensory_memory.get("almost_quit_moment")
            )
            db.add(sensory)
        
        # Store mastery records
        if mastery_milestones:
            if mastery_milestones.get("altitude_milestone", {}).get("achieved"):
                mastery = MasteryRecord(
                    id=str(uuid.uuid4()),
                    hike_id=hike_id,
                    milestone_type="altitude",
                    value=mastery_milestones["altitude_milestone"].get("value_feet"),
                    achieved=True
                )
                db.add(mastery)
            
            if mastery_milestones.get("scrambling_likelihood", {}).get("achieved"):
                mastery = MasteryRecord(
                    id=str(uuid.uuid4()),
                    hike_id=hike_id,
                    milestone_type="scrambling",
                    meta_data={"class": mastery_milestones["scrambling_likelihood"].get("class")},
                    achieved=True
                )
                db.add(mastery)
        
        # Store legacy journal
        if legacy_journal:
            journal = JournalEntry(
                id=str(uuid.uuid4()),
                user_id=hike.user_id,
                hike_id=hike_id,
                entry_type="legacy",
                title=legacy_journal.get("title", "Hike Reflection"),
                content=legacy_journal.get("content", "")
            )
            db.add(journal)
        
        # Update insight record
        insight = db.query(Insight).filter(Insight.hike_id == hike_id).first()
        if not insight:
            insight = Insight(
                id=str(uuid.uuid4()),
                hike_id=hike_id,
                status="completed"
            )
            db.add(insight)
        else:
            insight.status = "completed"
        
        insight.final_report = final_report.get("cards", [])
        insight.updated_at = datetime.utcnow()
        
        db.commit()
        logger.info(f"Analysis completed for hike {hike_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error running hike analysis: {e}")
        db.rollback()
        
        # Update insight status to failed
        insight = db.query(Insight).filter(Insight.hike_id == hike_id).first()
        if insight:
            insight.status = "failed"
            db.commit()
        
        return False


def start_analysis(hike_id: str, db: Session) -> bool:
    """Start analysis (queue background job)"""
    try:
        insight = db.query(Insight).filter(Insight.hike_id == hike_id).first()
        if not insight:
            insight = Insight(
                id=str(uuid.uuid4()),
                hike_id=hike_id,
                status="processing"
            )
            db.add(insight)
        else:
            insight.status = "processing"
        
        db.commit()
        
        # In production, queue this as a background job
        # For now, run synchronously (in production, use Celery or similar)
        import asyncio
        api_key = os.environ.get("API_KEY")
        asyncio.run(run_hike_analysis(hike_id, db, api_key))
        
        return True
    except Exception as e:
        logger.error(f"Error starting analysis: {e}")
        db.rollback()
        return False


def get_insight_status(hike_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get insight status"""
    try:
        insight = db.query(Insight).filter(Insight.hike_id == hike_id).first()
        if not insight:
            return {"status": "pending"}
        
        return {
            "status": insight.status,
            "created_at": insight.created_at.isoformat() if insight.created_at else None,
            "updated_at": insight.updated_at.isoformat() if insight.updated_at else None
        }
    except Exception as e:
        logger.error(f"Error getting insight status: {e}")
        return None


def get_insight_report(hike_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get insight report"""
    try:
        insight = db.query(Insight).filter(Insight.hike_id == hike_id).first()
        if not insight or insight.status != "completed":
            return None
        
        return {
            "status": insight.status,
            "final_report": insight.final_report or [],
            "created_at": insight.created_at.isoformat() if insight.created_at else None
        }
    except Exception as e:
        logger.error(f"Error getting insight report: {e}")
        return None
