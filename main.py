
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('/app/backend/.env')

import json
import base64
import logging
import asyncio
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel as PydanticBaseModel, Field
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import get_db, init_db
from backend.websocket_handler import handle_ecodroid_stream
from backend.redis_client import redis_client
from backend.models import (
    HikeSession, RealtimeObservation, EnvironmentalRecord,
    EcoDroidDevice, WearableDevice, WearableAlert,
    User, Hike, Place, Trail, Media, Discovery, Achievement, Device, UserFavoritePlace,
    TrailCheckpoint, HikeCheckpointProgress,
    SocialPost, PostComment, PostLike,
    OfflineMapAsset,
)
from backend.auth_service import generate_token, verify_token, send_magic_link, verify_magic_link
from backend.places_service import search_places, get_place_details, get_nearby_places, get_trail_details, search_trails
from backend.hikes_service import (
    create_hike_session, start_hike, pause_hike, end_hike,
    upload_route_points, upload_sensor_batch, get_hike_history, get_hike_details
)
from backend.media_service import get_signed_upload_url, register_uploaded_media, get_hike_media
from backend.insights_service import start_analysis, get_insight_status, get_insight_report
from backend.achievements_service import compute_achievements, get_user_achievements, get_all_achievements
from backend.devices_service import register_device, update_device_status, get_user_devices, remove_device
from backend.export_service import export_hike_data
from backend.journal_service import create_journal_entry, get_journal_entries, update_journal_entry, delete_journal_entry
from backend.narrative_service import generate_hike_narrative
from backend.enhancement_service import start_enhancement_job, get_enhancement_job_status, cancel_enhancement_job, get_media_enhancement_jobs
from backend.stats_service import get_user_stats, get_hike_stats
from backend.sync_service import sync_offline_data, get_sync_status
from backend.search_service import search_hikes, search_places as search_places_service
from backend.storage import save_local_file, get_local_file, get_local_file_path
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.responses import PlainTextResponse
import pathlib
from backend.realtime_processor import RealtimeProcessor
from backend.google_maps_service import get_google_maps_service
from pydantic import BaseModel as PydanticBaseModel
from typing import Optional
import uuid
from datetime import datetime
from google import genai
from google.genai import types
from backend.schemas import MediaResponse, HikeResponse, JournalEntryResponse

# --- ATLAS SYSTEM CONFIG ---
ATLAS_SYSTEM_INSTRUCTION = (
    "You are Atlas, a continuous environmental intelligence system. "
    "You do not behave like a chatbot. "
    "You observe incoming multimodal signals across time and space and maintain an evolving internal understanding of the environment. "
    "You reason across location, time, terrain, motion, vision, audio, satellite imagery. "
    "You connect observations gradually. You surface insights only when confidence is sufficient. "
    "You prefer insight over data. You speak calmly and clearly. You avoid technical language unless explicitly requested. "
    "You acknowledge uncertainty when present. You do not overwhelm the user. "
    "You act as a quiet companion that helps people understand the places they visit."
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EcoAtlas")


def _safe_filename(name: str) -> str:
    import re
    s = (name or "offline-map").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "offline-map"


def _select_best_nps_park_code(place_name: str, parks: list) -> tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Select best park match from NPS API /parks results using a 0-100 fullName match score.
    Returns (parkCode, fullName, score). If best score < 50, returns (None, None, None).
    """
    try:
        from backend.nps_matcher import select_best_nps_park

        sel = select_best_nps_park(place_name, parks, min_score=50)
        if not sel:
            return None, None, None
        return sel.park_code, sel.full_name, sel.score
    except Exception:
        return None, None, None


async def _resolve_official_pdf_url_for_place(
    place: "Place",
    *,
    park_code: Optional[str],
    db: Session,
    full_name: Optional[str] = None,
) -> Optional[str]:
    """
    Resolve a best-effort official printable PDF URL for a place.
    Uses curated URLs, seeded sources, then NPS scraping when a valid parkCode exists.
    """
    from backend.offline_maps_service import (
        resolve_curated_assets,
        resolve_seed_assets,
        resolve_scraped_assets,
    )

    # 1) curated
    candidates = resolve_curated_assets(place.name)

    # 2) seed + scrape (only if we have a valid NPS park code)
    nps_code = (park_code or "").strip().lower() if park_code else None
    if nps_code:
        candidates.extend(resolve_seed_assets(nps_code))
        candidates.extend(resolve_scraped_assets(nps_code, db, full_name=full_name or place.name))

    for c in candidates:
        url = (c.get("url") or "").strip()
        if not url:
            continue
        if ".pdf" in url.lower():
            return url
    return None

# Initialize Gemini client lazily (only when needed, not at module level)
# This prevents import errors when API_KEY is not set
def get_genai_client():
    """Get Gemini client, creating it if needed"""
    api_key = os.environ.get("API_KEY")
    if not api_key:
        logger.warning("API_KEY not set - Gemini features will be unavailable")
        return None
    try:
        return genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini client: {e}")
        return None

# Lazy client initialization - only create when actually needed
_client = None
def get_client():
    """Lazy client getter - use this instead of direct client access"""
    global _client
    if _client is None:
        _client = get_genai_client()
    return _client

# For backward compatibility, try to initialize but don't fail if API_KEY is missing
try:
    _client = get_genai_client()
except Exception as e:
    logger.debug(f"Could not initialize Gemini client at module load: {e}")
    _client = None

# Create a client property that can be accessed but won't break imports
client = _client

# --- DATA MODELS ---
class SensorPacket(BaseModel):
    device_id: str
    heart_rate: Optional[float] = None
    pressure: Optional[float] = None
    altitude: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: int

class Agent:
    def __init__(self, name: str, role: str, goal: str, backstory: str, model_name: str = "gemini-3-pro-preview", tools: List[Any] = None):
        self.name = name
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.model_name = model_name
        self.tools = tools

    async def execute(self, task_description: str, context: str = "", media_parts: List[Any] = None, response_schema: Any = None) -> Any:
        logger.info(f"Atlas // Agent {self.name} processing task...")
        
        # Combine base instruction with specific role
        agent_instruction = f"{ATLAS_SYSTEM_INSTRUCTION}\n\nSpecific Identity: {self.role}.\nGoal: {self.goal}\nBackstory: {self.backstory}\n"
        if response_schema:
            agent_instruction += "CRITICAL: Return raw JSON. No markdown formatting."

        prompt = f"TASK:\n{task_description}\n\nCONTEXT:\n{context}"
        contents = [prompt]
        if media_parts:
            contents.extend(media_parts)

        config = types.GenerateContentConfig(
            system_instruction=agent_instruction,
            tools=self.tools,
            response_mime_type="application/json" if response_schema else "text/plain",
            response_schema=response_schema if response_schema else None,
            thinking_config=types.ThinkingConfig(thinking_budget=16000) if "pro" in self.model_name else None
        )

        try:
            api_client = genai.Client(api_key=os.environ.get("API_KEY"), http_options={'api_version': 'v1alpha'})
            response = await asyncio.to_thread(
                api_client.models.generate_content,
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            if response_schema:
                text = response.text.strip()
                if text.startswith("```json"): text = text[7:]
                if text.endswith("```"): text = text[:-3]
                return json.loads(text.strip())
            return response.text
        except Exception as e:
            logger.error(f"Agent {self.name} failed: {str(e)}")
            raise e

# --- AGENT REGISTRY ---
class EcoAtlasAgents:
    @property
    def telemetry(self) -> Agent:
        return Agent(
            "Telemetry", 
            "Sensor Processing Specialist", 
            "Identify meaningful environmental or movement events from passive sensor data.", 
            "A technician focused on decoding the rhythm of the trail through data.",
            "gemini-3-flash-preview"
        )

    @property
    def observer(self) -> Agent:
        return Agent(
            "Observer", 
            "Perception Specialist", 
            "Infer environmental characteristics from visual data without identifying objects or people.", 
            "Expert field biologist focused on subtle ecological shifts and visual patterns."
        )

    @property
    def listener(self) -> Agent:
        return Agent(
            "Listener",
            "Acoustic Specialist",
            "Infer environmental soundscape characteristics from ambient audio.",
            "A soundscape ecologist who understands the subtle language of natural frequencies.",
            "gemini-2.5-flash-native-audio-preview-12-2025"
        )
    
    @property
    def fusionist(self) -> Agent:
        return Agent(
            "Fusionist",
            "Perspective Integration Specialist",
            "Compare large-scale environmental patterns with on-ground observations.",
            "A specialized cartographer who bridges the gap between high-altitude orbital imagery and ground-level field observations.",
            "gemini-3-pro-preview"
        )

    @property
    def spatial(self) -> Agent:
        return Agent("Spatial", "Geospatial Grounding Specialist", "Verify landmarks and terrain features.", "Master cartographer with deep knowledge of global trails.", "gemini-2.5-flash", tools=[types.Tool(google_maps=types.GoogleMaps())])

    @property
    def historian(self) -> Agent:
        return Agent(
            "Historian", 
            "Temporal Specialist", 
            "Identify long-term environmental patterns by comparing current observations with historical records.", 
            "A patient archivist of the natural world, noticing the slow drift of seasons and the gradual reshaping of landscapes.",
            "gemini-3-pro-preview"
        )

    @property
    def bard(self) -> Agent:
        return Agent(
            "Bard", 
            "Narrative Architect", 
            "Create a coherent environmental narrative synthesizing all multimodal inputs.", 
            "Nature poet who translates complex ecological signals into reflective, calm human insight.",
            "gemini-3-pro-preview"
        )

# --- ORCHESTRATOR ---
class EcoAtlasCrew:
    def __init__(self, history: List[Dict[str, Any]]):
        self.history = history
        self.agents = EcoAtlasAgents()

    async def run_mission(self, image_b64_list: List[str], mime_type: str, park_name: str, sensor_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        media_parts = [types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime_type) for b64 in image_b64_list]
        
        # Step 0: Telemetry
        telemetry_events = await self.agents.telemetry.execute(
            "TASK: Process passive sensor data\nGOAL: Identify meaningful movement/environmental events.",
            context=f"Raw Sensor Stream: {json.dumps(sensor_data)}",
            response_schema=TELEMETRY_SCHEMA
        )

        # Step 1: Perception
        perception = await self.agents.observer.execute(
            "TASK: Visual environmental reasoning\nGOAL: Infer environmental characteristics from visual data. REASON ACROSS TIME.",
            context=f"Park: {park_name}. Telemetry Context: {json.dumps(telemetry_events)}",
            media_parts=media_parts,
            response_schema=PERCEPTION_SCHEMA
        )

        # Step 2: Acoustic
        acoustic = await self.agents.listener.execute(
            "TASK: Ambient environmental audio analysis\nGOAL: Infer environmental soundscape characteristics.",
            context=f"Location: {park_name}.",
            media_parts=media_parts,
            response_schema=ACOUSTIC_SCHEMA
        )

        # Step 3: Perspective Fusion
        fusion = await self.agents.fusionist.execute(
            "TASK: Satellite and ground perspective fusion\nGOAL: Compare large-scale patterns with ground observations.",
            context=f"Location: {park_name}. Ground Perception: {json.dumps(perception)}",
            media_parts=media_parts,
            response_schema=FUSION_SCHEMA
        )

        # Step 4: Spatial Grounding
        spatial = await self.agents.spatial.execute(f"Ground signals in reality: {json.dumps(perception)}, {json.dumps(acoustic)}, and orbital fusion: {json.dumps(fusion)}")

        # Step 5: Historical Comparison (Historian)
        temporal = await self.agents.historian.execute(
            "TASK: Temporal environmental comparison\n"
            "INPUTS: current observations, historical visit data, seasonal context\n"
            "GOAL: Identify long-term environmental patterns.\n"
            "INSTRUCTIONS:\n"
            "- Compare gently.\n"
            "- Avoid strong conclusions.\n"
            "- Highlight gradual trends.\n"
            "- Note uncertainty clearly.\n"
            "OUTPUT FORMAT: Short narrative comparison using language like: 'Compared to previous visits...' or 'This area appears slightly different than before...'", 
            context=f"History: {json.dumps(self.history)}\n"
                    f"Current Signals: {json.dumps(perception)}\n"
                    f"Orbital Perspective: {json.dumps(fusion)}\n"
                    f"Park: {park_name}",
            response_schema=TEMPORAL_SCHEMA
        )

        # Step 6: Final Narrative Synthesis (Bard)
        narrative = await self.agents.bard.execute(
            "TASK: Environmental synthesis\n"
            "INPUTS: motion timeline, visual observations, audio observations, elevation profile, satellite comparison, temporal deltas\n"
            "GOAL: Create a coherent environmental narrative.\n"
            "TONE: Reflective and calm.",
            context=f"Motion: {json.dumps(telemetry_events)}\n"
                    f"Visual: {json.dumps(perception)}\n"
                    f"Audio: {json.dumps(acoustic)}\n"
                    f"Fusion: {json.dumps(fusion)}\n"
                    f"Temporal Narrative: {json.dumps(temporal)}\n"
                    f"Spatial Context: {spatial}",
            response_schema=NARRATIVE_SCHEMA
        )

        return {
            "telemetry": telemetry_events,
            "perception": perception, 
            "acoustic": acoustic,
            "fusion": fusion,
            "spatial": spatial, 
            "temporal": temporal, 
            "narrative": narrative
        }

# --- SCHEMAS ---
TELEMETRY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "events": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "timestamp": {"type": "NUMBER"},
                    "type": {"type": "STRING"},
                    "description": {"type": "STRING"}
                },
                "required": ["timestamp", "type", "description"]
            }
        }
    },
    "required": ["events"]
}

PERCEPTION_SCHEMA = {
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
                },
                "required": ["inference", "confidence"]
            }
        }
    },
    "required": ["visual_patterns", "temporal_changes", "inferences"]
}

ACOUSTIC_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "richness": {"type": "STRING", "enum": ["low", "moderate", "high"]},
        "confidence_notes": {"type": "STRING"}
    },
    "required": ["summary", "richness", "confidence_notes"]
}

FUSION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "consistent_observations": {"type": "ARRAY", "items": {"type": "STRING"}},
        "divergent_observations": {"type": "ARRAY", "items": {"type": "STRING"}},
        "unclear_areas": {"type": "ARRAY", "items": {"type": "STRING"}}
    },
    "required": ["consistent_observations", "divergent_observations", "unclear_areas"]
}

TEMPORAL_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "comparison_narrative": {"type": "STRING", "description": "Short narrative comparison following specific phrasing rules."}
    },
    "required": ["comparison_narrative"]
}

NARRATIVE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "consistent": {"type": "STRING"},
        "different": {"type": "STRING"},
        "changing": {"type": "STRING"},
        "uncertain": {"type": "STRING"}
    },
    "required": ["consistent", "different", "changing", "uncertain"]
}

app = FastAPI(title="EcoAtlas API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Authentication
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user from JWT token"""
    if not credentials:
        return None
    payload = verify_token(credentials.credentials)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()

# Root endpoint
@app.get("/")
async def root():
    return {"message": "EcoAtlas API", "version": "2.0.0", "status": "running"}

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    # Initialize Redis (will fallback to in-memory if not available)
    if redis_client.use_redis:
        logger.info("Redis connected - using Redis for message queuing")
    else:
        logger.info("Redis not available - using in-memory storage")
    logger.info("EcoAtlas backend started")

# Initialize real-time processor
realtime_processor = RealtimeProcessor(api_key=os.environ.get("API_KEY"))

@app.post("/api/v1/synthesis")
async def run_synthesis(
    images: List[UploadFile] = File(...), 
    park_name: str = Form(...), 
    history_json: str = Form("[]"),
    sensor_json: str = Form("[]")
):
    try:
        image_b64_list = []
        mime_type = "image/jpeg"
        for img in images:
            content = await img.read()
            image_b64_list.append(base64.b64encode(content).decode('utf-8'))
            mime_type = img.content_type
            
        history = json.loads(history_json)
        sensors = json.loads(sensor_json)
        crew = EcoAtlasCrew(history)
        result = await crew.run_mission(image_b64_list, mime_type, park_name, sensors)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Synthesis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sensors/heartbeat")
async def sensor_heartbeat(packet: SensorPacket):
    return {"status": "received"}

# ===== NEW PRODUCTION ENDPOINTS =====

# WebSocket endpoint for EcoDroid device streaming
@app.websocket("/ws/ecodroid/{device_id}")
async def ecodroid_websocket(
    websocket: WebSocket,
    device_id: str,
    session_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time EcoDroid device streaming"""
    await handle_ecodroid_stream(websocket, device_id, session_id, db)

# Session Management
class CreateSessionRequest(BaseModel):
    park_name: str
    park_id: str
    trail_id: str
    user_id: str
    device_id: Optional[str] = None

@app.post("/api/v1/sessions")
async def create_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db)
):
    """Create a new hike session"""
    # Defensive check: ensure required fields are present
    if not request.trail_id or not request.park_id or not request.park_name:
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: trail_id, park_id, and park_name are required"
        )
    
    session_id = str(uuid.uuid4())
    session = HikeSession(
        id=session_id,
        user_id=request.user_id,
        park_name=request.park_name,
        device_id=request.device_id,
        status='active'
    )
    db.add(session)
    db.commit()
    
    # Log session creation
    logger.info(f"Created hike session {session_id} for user {request.user_id} on trail {request.trail_id}")
    
    return {"session_id": session_id, "status": "created"}

@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get session details"""
    session = db.query(HikeSession).filter(HikeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "park_name": session.park_name,
        "status": session.status,
        "start_time": session.start_time.isoformat() if session.start_time else None,
        "device_id": session.device_id
    }

class EndSessionRequest(BaseModel):
    distance_miles: float
    duration_minutes: int
    route_path: Optional[List[Dict[str, Any]]] = None

@app.post("/api/v1/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    db: Session = Depends(get_db)
):
    """End an active session"""
    session = db.query(HikeSession).filter(HikeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = 'completed'
    session.end_time = datetime.utcnow()
    
    # Log session end with hike data
    logger.info(f"Session {session_id} ended: {request.distance_miles} miles, {request.duration_minutes} minutes")
    
    db.commit()
    return {"status": "completed", "session_id": session_id}

# Device Management
@app.post("/api/v1/devices/ecodroid")
async def register_ecodroid_device(
    device_id: str,
    device_name: Optional[str] = None,
    firmware_version: Optional[str] = None,
    sensor_config: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """Register or update EcoDroid device"""
    device = db.query(EcoDroidDevice).filter(EcoDroidDevice.id == device_id).first()
    if device:
        device.status = 'online'
        device.last_seen = datetime.utcnow()
        if device_name:
            device.device_name = device_name
        if firmware_version:
            device.firmware_version = firmware_version
        if sensor_config:
            device.sensor_config = sensor_config
    else:
        device = EcoDroidDevice(
            id=device_id,
            user_id="default_user",  # Should come from auth
            device_name=device_name or f"EcoDroid-{device_id[:8]}",
            status='online',
            last_seen=datetime.utcnow(),
            firmware_version=firmware_version,
            sensor_config=sensor_config or {}
        )
        db.add(device)
    db.commit()
    return {"device_id": device_id, "status": "registered"}

@app.get("/api/v1/devices/ecodroid/{device_id}")
async def get_ecodroid_device(device_id: str, db: Session = Depends(get_db)):
    """Get EcoDroid device status"""
    device = db.query(EcoDroidDevice).filter(EcoDroidDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return {
        "id": device.id,
        "status": device.status,
        "battery_level": device.battery_level,
        "last_seen": device.last_seen.isoformat() if device.last_seen else None,
        "sensor_config": device.sensor_config
    }

# Wearable Integration
@app.post("/api/v1/wearables/alert")
async def send_wearable_alert(
    user_id: str,
    alert_type: str,
    message: str,
    vibration: Optional[str] = "gentle",
    device_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Queue alert for wearable device"""
    alert = WearableAlert(
        id=str(uuid.uuid4()),
        user_id=user_id,
        device_id=device_id,
        alert_type=alert_type,
        message=message,
        vibration=vibration,
        status='pending'
    )
    db.add(alert)
    db.commit()
    
    # In production, publish to Redis queue for mobile app to pick up
    return {"alert_id": alert.id, "status": "queued"}

@app.get("/api/v1/wearables/alerts/{user_id}")
async def get_pending_alerts(user_id: str, db: Session = Depends(get_db)):
    """Get pending alerts for user"""
    alerts = db.query(WearableAlert).filter(
        WearableAlert.user_id == user_id,
        WearableAlert.status == 'pending'
    ).all()
    return [{
        "id": alert.id,
        "type": alert.alert_type,
        "message": alert.message,
        "vibration": alert.vibration,
        "created_at": alert.created_at.isoformat()
    } for alert in alerts]

# Real-time Observations
@app.get("/api/v1/sessions/{session_id}/observations")
async def get_session_observations(
    session_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get real-time observations for a session"""
    observations = db.query(RealtimeObservation).filter(
        RealtimeObservation.session_id == session_id
    ).order_by(RealtimeObservation.timestamp.desc()).limit(limit).all()
    
    return [{
        "id": obs.id,
        "type": obs.observation_type,
        "timestamp": obs.timestamp.isoformat(),
        "location": obs.location,
        "ai_analysis": obs.ai_analysis,
        "confidence": obs.confidence
    } for obs in observations]

@app.get("/api/v1/sessions/{session_id}/context")
async def get_session_context(session_id: str):
    """Get current context for a session"""
    context = realtime_processor.get_session_context(session_id)
    return context

@app.get("/api/v1/sessions/{session_id}/record")
async def get_session_record(session_id: str, db: Session = Depends(get_db)):
    """Get environmental record for a completed session"""
    session = db.query(HikeSession).filter(HikeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get the environmental record if it exists
    record = db.query(EnvironmentalRecord).filter(
        EnvironmentalRecord.session_id == session_id
    ).first()
    
    if not record:
        # Return session data as fallback
        return {
            "park_name": session.park_name,
            "timestamp": session.start_time.isoformat() if session.start_time else None,
            "status": session.status,
            "summary": "Environmental record not yet generated",
            "tags": [],
            "multimodal_evidence": []
        }
    
    # Convert record to dict
    return {
        "id": record.id,
        "park_name": record.park_name,
        "timestamp": record.timestamp.isoformat() if record.timestamp else None,
        "location": record.location,
        "confidence": record.confidence,
        "summary": record.summary,
        "multimodal_evidence": record.multimodal_evidence or [],
        "tags": record.tags or [],
        "observation_events": record.observation_events,
        "acoustic_analysis": record.acoustic_analysis,
        "fusion_analysis": record.fusion_analysis,
        "field_narrative": record.field_narrative,
        "spatial_insight": record.spatial_insight,
        "temporal_delta": record.temporal_delta,
        "visual_artifact": record.visual_artifact,
        "experience_synthesis": record.experience_synthesis
    }

# ============================================
# Gemini AI Companion Endpoints
# Intelligent hiking companion that knows everything
# ============================================

COMPANION_SYSTEM_INSTRUCTION = (
    "You are an intelligent hiking companion named Atlas. You are a knowledgeable, friendly, and helpful guide "
    "who knows everything about nature, parks, trails, wildlife, geology, botany, and outdoor safety. "
    "You help hikers understand their surroundings, stay safe, and appreciate the natural world. "
    "You speak in a calm, conversational tone. You are curious, observant, and share fascinating insights. "
    "You notice details others might miss. You connect observations to broader ecological patterns. "
    "You are proactive - you offer helpful suggestions without being asked. You prioritize safety. "
    "You make nature accessible and interesting. You help people feel more connected to the places they explore."
)

class CompanionRequest(BaseModel):
    observation: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    image: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class CompanionQuestionRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None
    conversationHistory: Optional[List[Dict[str, Any]]] = None

class CompanionSuggestionRequest(BaseModel):
    context: Dict[str, Any]
    conversationHistory: Optional[List[Dict[str, Any]]] = None

@app.post("/api/v1/companion/insight")
async def get_companion_insight(request: CompanionRequest):
    """Get intelligent real-time insight about an observation"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_insight
        
        api_key = os.environ.get("API_KEY")
        park_name = request.context.get("parkName", "this area") if request.context else "this area"
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                # Build context string
                context_str = ""
                if request.context:
                    context_str += f"Location: {park_name}. "
                    if request.context.get("location"):
                        loc = request.context["location"]
                        context_str += f"Coordinates: {loc.get('lat')}, {loc.get('lng')}. "
                    if request.context.get("timeOfDay"):
                        context_str += f"Time: {request.context['timeOfDay']}. "
                    if request.context.get("season"):
                        context_str += f"Season: {request.context['season']}. "
                
                # Prepare media if image provided
                media_parts = []
                if request.image:
                    media_parts.append(types.Part.from_bytes(
                        data=base64.b64decode(request.image),
                        mime_type="image/jpeg"
                    ))
                
                # Use Observer agent for visual insights, or Bard for general insights
                task = f"Provide a brief, insightful observation about: {request.observation or 'the current surroundings'}. "
                task += "Be specific, interesting, and help the hiker understand what they're seeing. "
                task += "Connect it to the broader ecosystem if relevant. Keep it conversational and engaging."
                
                if request.image:
                    insight = await agents.observer.execute(task, context_str, media_parts)
                else:
                    insight = await agents.bard.execute(task, context_str)
                
                # Determine priority and category
                priority = "medium"
                category = None
                if any(word in insight.lower() for word in ["danger", "safety", "warning", "caution", "unsafe"]):
                    priority = "high"
                    category = "safety"
                elif any(word in insight.lower() for word in ["animal", "wildlife", "bird", "mammal"]):
                    category = "wildlife"
                elif any(word in insight.lower() for word in ["rock", "geology", "formation", "mineral"]):
                    category = "geology"
                elif any(word in insight.lower() for word in ["plant", "tree", "flower", "vegetation", "botany"]):
                    category = "botany"
                
                return {
                    "insight": insight,
                    "priority": priority,
                    "category": category,
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "location": request.location
                    }
                }
            except Exception as api_error:
                error_str = str(api_error)
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback insight")
                    fallback_insight = get_fallback_insight(request.observation, park_name)
                    return {
                        "insight": fallback_insight,
                        "priority": "medium",
                        "category": None,
                        "metadata": {
                            "timestamp": datetime.utcnow().isoformat(),
                            "location": request.location
                        }
                    }
                raise
        else:
            # No API key, use fallback
            fallback_insight = get_fallback_insight(request.observation, park_name)
            return {
                "insight": fallback_insight,
                "priority": "medium",
                "category": None,
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "location": request.location
                }
            }
    except Exception as e:
        logger.error(f"Companion insight error: {str(e)}")
        # Always return fallback instead of error
        from backend.companion_fallbacks import get_fallback_insight
        park_name = request.context.get("parkName", "this area") if request.context else "this area"
        fallback_insight = get_fallback_insight(request.observation, park_name)
        return {
            "insight": fallback_insight,
            "priority": "medium",
            "category": None,
            "metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "location": request.location
            }
        }

@app.post("/api/v1/companion/ask")
async def ask_companion(request: CompanionQuestionRequest):
    """Ask the companion a question"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_answer
        
        api_key = os.environ.get("API_KEY")
        park_name = request.context.get("parkName", "this area") if request.context else "this area"
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                # Build context
                context_str = ""
                if request.context:
                    context_str += f"We are in {park_name}. "
                    if request.context.get("location"):
                        loc = request.context["location"]
                        context_str += f"Current location: {loc.get('lat')}, {loc.get('lng')}. "
                
                # Include conversation history
                if request.conversationHistory:
                    recent_context = "\n".join([
                        f"Previous: {msg.get('content', '')[:100]}" 
                        for msg in request.conversationHistory[-3:]
                    ])
                    context_str += f"\nRecent conversation:\n{recent_context}\n"
                
                task = f"Answer this question from a hiker: {request.question}\n\n"
                task += "Be helpful, accurate, and engaging. If you don't know something, say so. "
                task += "Connect your answer to the current location and context when relevant."
                
                answer = await agents.bard.execute(
                    task,
                    context_str,
                    response_schema=None
                )
                
                return {"answer": answer}
            except Exception as api_error:
                error_str = str(api_error)
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback answer")
                    return {"answer": get_fallback_answer(request.question, park_name)}
                raise
        else:
            # No API key, use fallback
            return {"answer": get_fallback_answer(request.question, park_name)}
    except Exception as e:
        logger.error(f"Companion ask error: {str(e)}")
        # Always return fallback instead of error
        from backend.companion_fallbacks import get_fallback_answer
        park_name = request.context.get("parkName", "this area") if request.context else "this area"
        return {"answer": get_fallback_answer(request.question, park_name)}

@app.post("/api/v1/companion/suggest")
async def get_companion_suggestion(request: CompanionSuggestionRequest):
    """Get proactive suggestion from companion"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_suggestion
        
        api_key = os.environ.get("API_KEY")
        context = request.context
        park_name = context.get("parkName", "this area")
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                time_of_day = context.get("timeOfDay", "daytime")
                season = context.get("season", "current season")
                
                context_str = f"We are hiking in {park_name} during {time_of_day} in {season}. "
                if context.get("location"):
                    loc = context["location"]
                    context_str += f"Location: {loc.get('lat')}, {loc.get('lng')}. "
                if context.get("weather"):
                    context_str += f"Weather: {context['weather']}. "
                if context.get("recentObservations"):
                    context_str += f"Recent observations: {', '.join([str(o)[:50] for o in context['recentObservations'][:3]])}. "
                
                task = "Provide a helpful, proactive suggestion for the hiker. "
                task += "This could be about: what to look for, safety tips, interesting features nearby, "
                task += "best times to see wildlife, trail conditions, or anything else that would enhance their experience. "
                task += "Be specific and relevant to the current context. Keep it brief (1-2 sentences). "
                task += "Only suggest if you have something genuinely useful to say."
                
                suggestion = await agents.bard.execute(task, context_str)
                
                # Only return if suggestion is meaningful
                if len(suggestion.strip()) > 20:
                    priority = "low"
                    category = None
                    if any(word in suggestion.lower() for word in ["safety", "danger", "caution", "warning"]):
                        priority = "medium"
                        category = "safety"
                    
                    return {
                        "suggestion": suggestion,
                        "priority": priority,
                        "category": category
                    }
            except Exception as api_error:
                error_str = str(api_error)
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback suggestion")
                    fallback = get_fallback_suggestion(context)
                    if fallback:
                        return {
                            "suggestion": fallback,
                            "priority": "low",
                            "category": None
                        }
        
        # Use fallback
        fallback = get_fallback_suggestion(context)
        if fallback:
            return {
                "suggestion": fallback,
                "priority": "low",
                "category": None
            }
        
        return {"suggestion": None}
    except Exception as e:
        logger.error(f"Companion suggestion error: {str(e)}")
        # Try fallback
        try:
            from backend.companion_fallbacks import get_fallback_suggestion
            fallback = get_fallback_suggestion(request.context)
            if fallback:
                return {
                    "suggestion": fallback,
                    "priority": "low",
                    "category": None
                }
        except:
            pass
        return {"suggestion": None}

@app.post("/api/v1/companion/educate")
async def get_educational_info(request: Dict[str, Any]):
    """Get educational information about a topic"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_answer
        
        api_key = os.environ.get("API_KEY")
        topic = request.get("topic", "")
        category = request.get("category", "general")
        context = request.get("context", {})
        park_name = context.get("parkName", "this area")
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                context_str = f"We are in {park_name}. "
                
                task = f"Provide educational information about: {topic} "
                task += f"(category: {category}). "
                task += "Make it interesting and accessible. Explain why it matters in this ecosystem. "
                task += "Keep it engaging but informative (2-3 sentences)."
                
                info = await agents.bard.execute(task, context_str)
                
                return {"info": info}
            except Exception as api_error:
                error_str = str(api_error)
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback educational info")
                    return {"info": get_fallback_answer(f"Tell me about {topic}", park_name)}
                raise
        else:
            # No API key, use fallback
            return {"info": get_fallback_answer(f"Tell me about {topic}", park_name)}
    except Exception as e:
        logger.error(f"Companion educate error: {str(e)}")
        # Always return fallback instead of error
        from backend.companion_fallbacks import get_fallback_answer
        topic = request.get("topic", "")
        park_name = request.get("context", {}).get("parkName", "this area")
        return {"info": get_fallback_answer(f"Tell me about {topic}", park_name)}

@app.post("/api/v1/companion/safety")
async def check_safety(request: Dict[str, Any]):
    """Check safety conditions and provide alerts"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_safety_alert
        
        api_key = os.environ.get("API_KEY")
        context = request.get("context", {})
        park_name = context.get("parkName", "this area")
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                weather = context.get("weather", {})
                location = context.get("location", {})
                time_of_day = context.get("timeOfDay", "daytime")
                
                context_str = f"Location: {park_name}. Time: {time_of_day}. "
                if weather:
                    context_str += f"Weather conditions: {weather}. "
                if location:
                    context_str += f"Coordinates: {location.get('lat')}, {location.get('lng')}. "
                
                task = "Assess current safety conditions for hiking. "
                task += "Look for: weather hazards, trail conditions, wildlife activity, time-of-day concerns, "
                task += "or any other safety factors relevant to this location and context. "
                task += "Only provide an alert if there is a genuine safety concern. "
                task += "If conditions are safe, return null. If there's a concern, provide a clear, actionable alert."
                
                alert = await agents.bard.execute(task, context_str)
                
                if alert and len(alert.strip()) > 10 and "null" not in alert.lower() and "no concern" not in alert.lower():
                    priority = "high" if any(word in alert.lower() for word in ["danger", "immediate", "urgent", "severe"]) else "medium"
                    return {
                        "alert": alert,
                        "priority": priority
                    }
            except Exception as api_error:
                error_str = str(api_error)
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback safety check")
                    fallback_alert = get_fallback_safety_alert(context)
                    if fallback_alert:
                        return {"alert": fallback_alert, "priority": "medium"}
        
        # Use fallback
        fallback_alert = get_fallback_safety_alert(context)
        if fallback_alert:
            return {"alert": fallback_alert, "priority": "medium"}
        
        return {"alert": None}
    except Exception as e:
        logger.error(f"Companion safety error: {str(e)}")
        # Try fallback
        try:
            from backend.companion_fallbacks import get_fallback_safety_alert
            fallback_alert = get_fallback_safety_alert(request.get("context", {}))
            if fallback_alert:
                return {"alert": fallback_alert, "priority": "medium"}
        except:
            pass
        return {"alert": None}

@app.post("/api/v1/companion/park-info")
async def get_park_info(request: Dict[str, Any]):
    """Get comprehensive information about a park"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_park_info
        
        park_name = request.get("parkName", "")
        api_key = os.environ.get("API_KEY")
        
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                
                task = f"Provide a warm, welcoming introduction to {park_name}. "
                task += "Include: what makes this park special, key features, notable wildlife or geology, "
                task += "best times to visit, and what hikers should know. "
                task += "Make it engaging and informative (3-4 sentences). "
                task += "Speak as a knowledgeable companion who loves this place."
                
                info = await agents.bard.execute(task, f"Park: {park_name}")
                
                return {"info": info}
            except Exception as api_error:
                error_str = str(api_error)
                # Check if it's an API key error
                if "403" in error_str or "PERMISSION_DENIED" in error_str or "API key" in error_str.lower():
                    logger.warning(f"API key issue, using fallback for {park_name}")
                    return {"info": get_fallback_park_info(park_name)}
                raise
        else:
            # No API key, use fallback
            return {"info": get_fallback_park_info(park_name)}
    except Exception as e:
        logger.error(f"Companion park-info error: {str(e)}")
        # Always return fallback instead of error
        from backend.companion_fallbacks import get_fallback_park_info
        park_name = request.get("parkName", "this park")
        return {"info": get_fallback_park_info(park_name)}

@app.get("/api/v1/parks/{park_id}/rules-alerts")
async def get_park_rules_alerts(park_id: str):
    """Get park rules, regulations, and current alerts"""
    try:
        from backend.agents import EcoAtlasAgents
        from backend.companion_fallbacks import get_fallback_park_info
        
        # Try to get park name from parks data
        # For now, use a generic approach
        api_key = os.environ.get("API_KEY")
        
        # Generate rules and alerts based on park type
        rules = [
            "Stay on designated trails",
            "Pack out all trash",
            "No campfires outside designated areas",
            "Respect wildlife - maintain distance",
            "Check weather conditions before hiking",
            "Carry sufficient water and supplies",
            "Inform someone of your hiking plans",
            "Follow Leave No Trace principles"
        ]
        
        alerts = []
        
        # Try to get real-time alerts from companion API if available
        if api_key:
            try:
                agents = EcoAtlasAgents(api_key=api_key)
                # Get safety alerts for the park using the safety endpoint logic
                safety_result = await agents.bard.execute(
                    f"Check for any current safety alerts, closures, or important notices for {park_id}. "
                    "Be concise - list only active alerts. If none, say 'No current alerts.'",
                    f"Park: {park_id}"
                )
                
                # Parse alerts from response
                if safety_result and "no current alerts" not in safety_result.lower():
                    alerts.append(safety_result)
            except Exception as e:
                logger.warning(f"Could not fetch real-time alerts: {e}")
        
        return {
            "park_id": park_id,
            "rules": rules,
            "alerts": alerts if alerts else ["✅ No current alerts"],
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching park rules/alerts: {e}")
        # Return default rules
        return {
            "park_id": park_id,
            "rules": [
                "Stay on designated trails",
                "Pack out all trash",
                "No campfires outside designated areas",
                "Respect wildlife - maintain distance"
            ],
            "alerts": ["✅ No current alerts"],
            "last_updated": datetime.utcnow().isoformat()
        }

# ============================================
# Google Maps API Endpoints
# ============================================

@app.get("/api/v1/maps/geocode")
async def geocode_address(address: str = Query(..., description="Address to geocode")):
    """Geocode an address to coordinates"""
    try:
        service = get_google_maps_service()
        result = await service.geocode(address)
        return result
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maps/reverse-geocode")
async def reverse_geocode(lat: float = Query(..., description="Latitude"), lng: float = Query(..., description="Longitude")):
    """Reverse geocode coordinates to address"""
    try:
        service = get_google_maps_service()
        result = await service.reverse_geocode(lat, lng)
        return result
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maps/places/search")
async def google_maps_search_places(
    query: str = Query(..., description="Search query"),
    lat: Optional[float] = Query(None, description="Latitude for location bias"),
    lng: Optional[float] = Query(None, description="Longitude for location bias"),
    radius: Optional[int] = Query(None, description="Search radius in meters"),
    type: Optional[str] = Query(None, description="Place type filter")
):
    """Search for places via Google Maps API directly"""
    try:
        service = get_google_maps_service()
        location = None
        if lat is not None and lng is not None:
            location = {"lat": lat, "lng": lng}
        result = await service.search_places(query, location=location, radius=radius, type=type)
        return result
    except Exception as e:
        logger.error(f"Places search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maps/places/{place_id}")
async def get_google_place_details(place_id: str):
    """Get detailed information about a place from Google Maps"""
    try:
        service = get_google_maps_service()
        result = await service.get_place_details(place_id)
        return result
    except Exception as e:
        logger.error(f"Place details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maps/places/nearby")
async def nearby_search(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(1000, description="Search radius in meters (max 50000)"),
    type: Optional[str] = Query(None, description="Place type filter"),
    keyword: Optional[str] = Query(None, description="Keyword search")
):
    """Search for places near a location"""
    try:
        service = get_google_maps_service()
        result = await service.nearby_search(
            location={"lat": lat, "lng": lng},
            radius=radius,
            type=type,
            keyword=keyword
        )
        return result
    except Exception as e:
        logger.error(f"Nearby search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maps/directions")
async def get_directions(
    origin: str = Query(..., description="Origin address or 'lat,lng'"),
    destination: str = Query(..., description="Destination address or 'lat,lng'"),
    mode: str = Query("walking", description="Travel mode: driving, walking, bicycling, transit"),
    waypoints: Optional[str] = Query(None, description="Waypoints separated by |")
):
    """Get directions between two points"""
    try:
        service = get_google_maps_service()
        waypoints_list = waypoints.split("|") if waypoints else None
        result = await service.get_directions(origin, destination, mode=mode, waypoints=waypoints_list)
        return result
    except Exception as e:
        logger.error(f"Directions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/maps/distance-matrix")
async def get_distance_matrix(request: Dict[str, Any]):
    """Get distance and duration matrix between multiple origins and destinations"""
    try:
        service = get_google_maps_service()
        origins = request.get("origins", [])
        destinations = request.get("destinations", [])
        mode = request.get("mode", "walking")
        
        if not origins or not destinations:
            raise HTTPException(status_code=400, detail="origins and destinations are required")
        
        result = await service.get_distance_matrix(origins, destinations, mode=mode)
        return result
    except Exception as e:
        logger.error(f"Distance matrix error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# NEW API ROUTES - Full Feature Set
# ============================================

# Authentication Routes
class MagicLinkRequest(BaseModel):
    email: str

@app.post("/api/v1/auth/magic-link")
async def request_magic_link(request: MagicLinkRequest, db: Session = Depends(get_db)):
    """Request magic link"""
    success = send_magic_link(request.email, db)
    if success:
        return {"message": "Magic link sent (check logs for dev mode)"}
    raise HTTPException(status_code=500, detail="Failed to send magic link")

@app.get("/api/v1/auth/verify")
async def verify_magic_link_token(token: str = Query(...), db: Session = Depends(get_db)):
    """Verify magic link token"""
    try:
        user = verify_magic_link(token, db)
        if not user:
            logger.warning(f"Magic link verification failed for token: {token[:10]}...")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        jwt_token = generate_token(user.id, user.email)
        return {"token": jwt_token, "user": {"id": user.id, "email": user.email, "name": user.name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying magic link token: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during token verification")

# Places Routes
@app.get("/api/v1/places/search")
async def search_places_endpoint(query: str = Query(...), limit: int = 20, db: Session = Depends(get_db)):
    """Search places"""
    logger.info(f"Places search endpoint called with query: '{query}', limit: {limit}")
    results = await search_places(query, db, limit)
    
    # CRITICAL FIX: Ensure results is always a list
    if not isinstance(results, list):
        logger.error(f"search_places returned non-list: {type(results)}")
        # If it's a dict with 'places' key (Google Maps response), extract it
        if isinstance(results, dict):
            if 'places' in results:
                logger.warning("Extracting 'places' from dict response")
                results = results.get('places', [])
            elif 'success' in results and results.get('success'):
                # It's the full Google Maps response, extract places
                results = results.get('places', [])
            else:
                logger.error(f"Unknown dict format: {list(results.keys())}")
                results = []
        else:
            results = []
    
    logger.info(f"Places search endpoint returning {len(results)} results (type: {type(results)})")
    if results and len(results) > 0:
        logger.info(f"First result sample: {results[0]}")
    
    return {"places": results}

@app.get("/api/v1/places/nearby")
async def get_nearby_places_endpoint(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(30, description="Search radius (miles or meters, auto-detected)"),
    limit: int = Query(10, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """Get nearby places - radius auto-converts miles to meters if needed"""
    # Auto-detect if radius is in miles (≤500) and convert to meters
    radius_meters = radius
    if radius <= 500:
        # Assume miles, convert to meters
        radius_meters = int(radius * 1609.34)
        logger.info(f"Converted radius {radius} miles → {radius_meters} meters")
    else:
        logger.info(f"Using radius {radius_meters} meters")
    
    # Ensure sane bounds
    if radius_meters < 1000:
        radius_meters = 16000  # Default: 10 miles
        logger.warning(f"Radius too small, using default: {radius_meters} meters")
    
    logger.info(f"Nearby places search: lat={lat}, lng={lng}, radius_meters={radius_meters}")
    results = await get_nearby_places(lat, lng, radius_meters, db)
    return {"places": results}

@app.get("/api/v1/places/{place_id}")
async def get_place_details_endpoint(place_id: str, db: Session = Depends(get_db)):
    """Get place details - tries database, then Google Maps, with graceful fallback"""
    result = await get_place_details(place_id, db)
    if not result:
        # If not found, try to get from recent search results (stored in memory/Redis)
        # This is a fallback for when Google Maps Place Details API fails
        logger.warning(f"Place {place_id} not found in database or Google Maps")
        
        # Try to find in database one more time (in case it was just saved)
        place = db.query(Place).filter(Place.id == place_id).first()
        if place:
            trails = db.query(Trail).filter(Trail.place_id == place_id).all()
            metadata = place.meta_data or {}
            return {
                "id": place.id,
                "name": place.name,
                "place_type": place.place_type,
                "location": place.location,
                "description": place.description,
                "metadata": metadata,
                "photos": metadata.get("photos", []),
                "types": metadata.get("types", []),
                "rating": metadata.get("rating"),
                "user_ratings_total": metadata.get("user_ratings_total"),
                "trails": [{
                    "id": t.id,
                    "name": t.name,
                    "difficulty": t.difficulty,
                    "distance_miles": t.distance_miles,
                    "elevation_gain_feet": t.elevation_gain_feet,
                    "estimated_duration_minutes": t.estimated_duration_minutes,
                    "description": t.description
                } for t in trails]
            }
        
        raise HTTPException(status_code=404, detail="Place not found")
    return result

@app.get("/api/v1/places/{place_id}/photo")
async def get_place_photo(place_id: str, photo_reference: str = Query(...), max_width: int = Query(800, ge=100, le=1600)):
    """Get Google Maps photo URL for a place"""
    maps_service = get_google_maps_service()
    if not maps_service.api_key:
        raise HTTPException(status_code=503, detail="Google Maps API key not configured")
    
    # Return the photo URL with API key
    photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photo_reference={photo_reference}&key={maps_service.api_key}"
    return {"url": photo_url}

@app.get("/api/v1/places/{place_id}/weather")
async def get_place_weather(place_id: str, db: Session = Depends(get_db)):
    """Get current weather for a place"""
    from backend.weather_service import get_weather_service
    
    # Get place location
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        # Try to get from Google Maps
        place_data = await get_place_details(place_id, db)
        if not place_data or not place_data.get("location"):
            raise HTTPException(status_code=404, detail="Place not found")
        location = place_data.get("location")
    else:
        location = place.location
    
    if not location or not isinstance(location, dict):
        raise HTTPException(status_code=400, detail="Place location not available")
    
    lat = location.get("lat")
    lng = location.get("lng")
    
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Invalid location coordinates")
    
    weather_service = get_weather_service()
    weather = await weather_service.get_current_weather(lat, lng)
    
    if weather.get("error"):
        raise HTTPException(status_code=503, detail=weather.get("message", "Weather service unavailable"))
    
    return weather

@app.get("/api/v1/places/{place_id}/alerts")
async def get_place_alerts(place_id: str, db: Session = Depends(get_db)):
    """Get National Park Service alerts for a place"""
    from backend.nps_service import get_nps_service
    
    # Get place name
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        place_data = await get_place_details(place_id, db)
        if not place_data:
            raise HTTPException(status_code=404, detail="Place not found")
        place_name = place_data.get("name", "")
    else:
        place_name = place.name
    
    # Try to find park code from NPS
    nps_service = get_nps_service()
    parks = await nps_service.search_parks(place_name, limit=8)
    from backend.nps_matcher import select_best_nps_park

    sel = select_best_nps_park(place_name, parks, min_score=50)
    if sel:
        alerts = await nps_service.get_park_alerts(sel.park_code)
        return {"alerts": alerts, "park_code": sel.park_code, "park_full_name": sel.full_name, "score": sel.score}
    
    return {"alerts": [], "park_code": None}

@app.get("/api/v1/places/{place_id}/trails")
async def get_place_trails(place_id: str, db: Session = Depends(get_db)):
    """
    Get all trails for a place.
    
    Provider hierarchy:
    1. Database (cached trails)
    2. Gemini AI generation (if API_KEY configured)
    3. Google Places fallback (search for nearby trailheads)
    
    Response format:
    {
        "trails": Trail[],
        "source": "database" | "gemini_generated" | "google_places_fallback",
        "meta": { place_id, place_name, lat, lng, provider_used, reason_for_fallback }
    }
    """
    from backend.trails_generation_service import generate_trails_for_place
    
    # Structured logging context
    log_ctx = {"place_id": place_id, "place_name": None, "lat": None, "lng": None}
    
    # ===== STEP 1: Resolve place =====
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        # Auto-resolve+save place (prevents frequent 404s for Google place IDs)
        try:
            from backend.places_service import get_place_details as resolve_place_details
            await resolve_place_details(place_id, db)
        except Exception as e:
            logger.warning(f"[trails] Failed to resolve place details for {place_id}: {e}")

        place = db.query(Place).filter(Place.id == place_id).first()

    if not place:
        logger.warning(f"[trails] Place not found: {place_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Place not found: {place_id}"
        )
    
    log_ctx["place_name"] = place.name
    
    # Extract coordinates
    lat, lng = None, None
    if place.location:
        if isinstance(place.location, dict):
            lat = place.location.get("lat") or place.location.get("latitude")
            lng = place.location.get("lng") or place.location.get("longitude")
    log_ctx["lat"] = lat
    log_ctx["lng"] = lng
    
    logger.info(f"[trails] Fetching trails for: {place.name} ({place_id}), lat={lat}, lng={lng}")
    
    # ===== STEP 2: Check database (PRIMARY) =====
    trails = db.query(Trail).filter(Trail.place_id == place_id).all()
    
    if trails:
        logger.info(f"[trails] Found {len(trails)} trails in database for {place.name}")
        return {
            "trails": [{
                "id": t.id,
                "name": t.name or "Unnamed Trail",
                "difficulty": t.difficulty,
                "distance_miles": t.distance_miles,
                "elevation_gain_feet": t.elevation_gain_feet,
                "estimated_duration_minutes": t.estimated_duration_minutes,
                "description": t.description,
                "meta_data": t.meta_data,
                # Trail location should come from the trail's own metadata when available.
                # Fallback to place center only if we truly don't know the trail location.
                "lat": (
                    (t.meta_data or {}).get("trailhead_lat")
                    or (t.meta_data or {}).get("lat")
                    or (t.meta_data or {}).get("latitude")
                    or lat
                ),
                "lng": (
                    (t.meta_data or {}).get("trailhead_lng")
                    or (t.meta_data or {}).get("lng")
                    or (t.meta_data or {}).get("longitude")
                    or lng
                ),
                # Optional bounds if we have them (used by clients to zoom-to-trail)
                "bounding_box": (
                    (t.meta_data or {}).get("bounding_box")
                    or (t.meta_data or {}).get("bounds")
                    or (t.meta_data or {}).get("bbox")
                ),
            } for t in trails],
            "source": "database",
            "meta": {**log_ctx, "count": len(trails), "provider_used": "database"}
        }
    
    # ===== STEP 3: Try Gemini AI generation =====
    api_key = os.getenv("API_KEY")
    if api_key:
        try:
            logger.info(f"[trails] No DB trails, generating with Gemini AI for {place.name}")
            generated_trails = await generate_trails_for_place(place, api_key, db)
            if generated_trails and len(generated_trails) > 0:
                logger.info(f"[trails] Gemini generated {len(generated_trails)} trails for {place.name}")
                return {
                    "trails": generated_trails,
                    "source": "gemini_generated",
                    "meta": {**log_ctx, "count": len(generated_trails), "provider_used": "gemini"}
                }
            else:
                logger.warning(f"[trails] Gemini returned empty for {place.name}")
        except Exception as e:
            logger.error(f"[trails] Gemini generation failed for {place.name}: {e}", exc_info=True)
    else:
        logger.warning(f"[trails] API_KEY not configured, skipping Gemini generation")
    
    # ===== STEP 4: Google Places fallback (trailhead search) =====
    if lat and lng:
        logger.info(f"[trails] Trying Google Places fallback for {place.name}")
        maps_service = get_google_maps_service()
        
        if maps_service.api_key:
            fallback_trails = []
            
            # Try multiple searches with increasing radius
            search_configs = [
                {"keyword": "trailhead", "radius": 30000},
                {"keyword": "hiking trail", "radius": 30000},
                {"keyword": "trail", "radius": 50000},
            ]
            
            for config in search_configs:
                if fallback_trails:
                    break  # Stop if we found results
                    
                try:
                    result = await maps_service.nearby_search(
                        location={"lat": lat, "lng": lng},
                        radius=config["radius"],
                        keyword=config["keyword"]
                    )
                    
                    if result.get("success") and result.get("places"):
                        for p in result["places"][:10]:  # Limit to 10 trailheads
                            fallback_trails.append({
                                "id": p.get("place_id"),
                                "name": p.get("name") or "Unnamed Trailhead",
                                "difficulty": None,  # Unknown
                                "distance_miles": None,
                                "elevation_gain_feet": None,
                                "estimated_duration_minutes": None,
                                "description": p.get("vicinity") or "",
                                "lat": p.get("lat"),
                                "lng": p.get("lng"),
                                "rating": p.get("rating"),
                                "user_ratings_total": p.get("user_ratings_total"),
                                "meta_data": {
                                    "source": "google_places_fallback",
                                    "types": p.get("types", []),
                                    "is_trailhead": True,
                                    "search_keyword": config["keyword"],
                                    "search_radius": config["radius"]
                                }
                            })
                        logger.info(f"[trails] Google Places found {len(fallback_trails)} trailheads with keyword '{config['keyword']}'")
                except Exception as e:
                    logger.error(f"[trails] Google Places search failed: {e}")
            
            if fallback_trails:
                return {
                    "trails": fallback_trails,
                    "source": "google_places_fallback",
                    "meta": {
                        **log_ctx, 
                        "count": len(fallback_trails), 
                        "provider_used": "google_places",
                        "reason_for_fallback": "primary_providers_empty"
                    }
                }
            else:
                logger.warning(f"[trails] Google Places returned no trailheads for {place.name}")
        else:
            logger.warning(f"[trails] GOOGLE_MAPS_API_KEY not configured, skipping fallback")
    else:
        logger.warning(f"[trails] No coordinates for {place.name}, cannot use Google Places fallback")
    
    # ===== STEP 5: Return empty with explanation =====
    logger.warning(f"[trails] All providers returned empty for {place.name}")
    return {
        "trails": [],
        "source": "none",
        "meta": {
            **log_ctx, 
            "count": 0, 
            "provider_used": "none",
            "reason_for_fallback": "all_providers_failed",
            "api_key_configured": bool(api_key),
            "google_maps_key_configured": bool(get_google_maps_service().api_key),
            "has_coordinates": bool(lat and lng)
        }
    }

# Favorites/Likes endpoints
@app.post("/api/v1/places/{place_id}/favorite")
async def favorite_place(
    place_id: str,
    planned_visit_date: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a place to user's favorites"""
    from backend.favorites_service import add_favorite_place
    from datetime import datetime as dt
    
    visit_date = None
    if planned_visit_date:
        try:
            visit_date = dt.fromisoformat(planned_visit_date.replace('Z', '+00:00'))
        except:
            pass
    
    result = add_favorite_place(user.id, place_id, visit_date, db)
    if result:
        return result
    raise HTTPException(status_code=400, detail="Failed to add favorite")

@app.delete("/api/v1/places/{place_id}/favorite")
async def unfavorite_place(
    place_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a place from user's favorites"""
    from backend.favorites_service import remove_favorite_place
    
    if remove_favorite_place(user.id, place_id, db):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Favorite not found")

@app.get("/api/v1/places/{place_id}/favorite")
async def check_favorite(
    place_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a place is favorited"""
    from backend.favorites_service import is_favorite
    
    return {"is_favorite": is_favorite(user.id, place_id, db)}

@app.get("/api/v1/favorites")
async def get_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user's favorite places"""
    from backend.favorites_service import get_user_favorites
    
    return {"favorites": get_user_favorites(user.id, db)}

# Trip Planning endpoints
@app.post("/api/v1/places/{place_id}/plan-trip")
async def plan_trip(
    place_id: str,
    visit_date: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a trip plan for a place"""
    from backend.trip_planning_service import generate_trip_plan, save_trip_plan_to_journal
    
    # Get place details
    place_data = await get_place_details(place_id, db)
    if not place_data:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get weather if available
    try:
        from backend.weather_service import get_weather_service
        weather_service = get_weather_service()
        if place_data.get("location"):
            loc = place_data["location"]
            weather = await weather_service.get_current_weather(loc.get("lat"), loc.get("lng"))
            place_data["weather"] = weather
    except:
        pass
    
    # Generate trip plan
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    trip_plan = await generate_trip_plan(
        place_data.get("name", "Unknown Place"),
        visit_date,
        place_data,
        api_key
    )
    
    if not trip_plan.get("success"):
        raise HTTPException(status_code=500, detail="Failed to generate trip plan")
    
    # Save to journal
    journal_entry = save_trip_plan_to_journal(
        user.id,
        place_id,
        place_data.get("name", "Unknown Place"),
        visit_date,
        trip_plan,
        db
    )
    
    return {
        "trip_plan": trip_plan,
        "journal_entry_id": journal_entry.id
    }

# Trail Map endpoints
@app.get("/api/v1/trails/{trail_id}/map")
async def get_trail_map(
    trail_id: str,
    db: Session = Depends(get_db),
    prefer_official: bool = Query(True, description="Prefer official park maps"),
    bypass_cache: bool = Query(False, description="Bypass cached map data")
):
    """
    Get trail map - prioritizes cached → official park maps → AI-generated.
    Successful generations are cached for 24 hours.
    """
    from backend.trail_map_service import generate_trail_map
    from backend.official_map_service import OfficialMapService
    from backend.redis_client import redis_client
    
    CACHE_TTL = 86400  # 24 hours
    cache_key = f"trail_map:{trail_id}"
    
    # Check cache first (unless bypassed)
    if not bypass_cache:
        cached = redis_client.get(cache_key)
        if cached and isinstance(cached, dict) and cached.get("success"):
            logger.info(f"Returning cached trail map for {trail_id}")
            cached["from_cache"] = True
            return cached
    
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    # Check if trail has a valid place_id
    if not trail.place_id or trail.place_id == 'undefined':
        logger.warning(f"Trail {trail_id} has no valid place_id, cannot generate map")
        raise HTTPException(
            status_code=400, 
            detail="Trail is not associated with a valid place. Cannot generate map."
        )
    
    place = db.query(Place).filter(Place.id == trail.place_id).first()
    if not place:
        logger.warning(f"Place {trail.place_id} not found for trail {trail_id}")
        raise HTTPException(status_code=404, detail="Place not found for this trail")
    
    # Try to fetch official map first
    if prefer_official:
        try:
            logger.info(f"Attempting to fetch official map for {place.name} - {trail.name}")
            # NOTE: fetch_nps_map expects only a park/place name. Passing trail.name here
            # caused a runtime error and prevented any official-map fallback.
            official_map = OfficialMapService().fetch_nps_map(place.name)
            
            if official_map and official_map.get('success'):
                logger.info(f"Found official map: {official_map['map_url']}")
                result = {
                    "success": True,
                    "source": "official",
                    "map_url": official_map['map_url'],
                    "map_type": official_map['map_type'],
                    "title": official_map.get('title', f"{trail.name} Map"),
                    "park_code": official_map.get('park_code'),
                    "downloadable": True,
                    "message": f"Official {official_map['source']} map available for download"
                }
                # Cache the official map result
                redis_client.set(cache_key, result, ttl=CACHE_TTL)
                return result
        except Exception as e:
            logger.warning(f"Failed to fetch official map: {e}, falling back to AI generation")
    
    # Fallback to AI-generated map
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="No official map found and AI service not configured. Please set API_KEY environment variable."
        )
    
    try:
        logger.info("Generating AI-based trail map as fallback")
        map_data = await generate_trail_map(trail, place, api_key)
        
        if not map_data.get("success"):
            error_msg = map_data.get("error", "Unknown error")
            logger.error(f"Trail map generation failed: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate trail map: {error_msg}"
            )
        
        map_data["source"] = "ai_generated"
        # Cache successful AI-generated map
        redis_client.set(cache_key, map_data, ttl=CACHE_TTL)
        return map_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in trail map endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating trail map: {str(e)}"
        )

# Offline Maps endpoints
class OfflineMapRequest(BaseModel):
    placeId: str
    trailId: Optional[str] = None

@app.post("/api/v1/maps/offline")
async def download_offline_map(
    request: OfflineMapRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download offline map data for a place/trail.
    Returns regionBBox and status for offline caching.
    
    Note: Full offline tiles via Google Maps are not supported on web.
    This endpoint provides essential data for offline-lite mode.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    place = db.query(Place).filter(Place.id == request.placeId).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Extract location bounds
    location = place.location
    lat = None
    lng = None
    
    if isinstance(location, dict):
        lat = location.get("lat") or location.get("latitude")
        lng = location.get("lng") or location.get("longitude")
    
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Place has no valid location data")
    
    # Calculate region bounding box (approximately 10km radius)
    delta = 0.09  # ~10km in degrees
    region_bbox = {
        "north": lat + delta,
        "south": lat - delta,
        "east": lng + delta,
        "west": lng - delta,
    }
    
    # Get trail info if provided
    trail_data = None
    if request.trailId:
        trail = db.query(Trail).filter(Trail.id == request.trailId).first()
        if trail:
            trail_data = {
                "id": trail.id,
                "name": trail.name,
                "difficulty": trail.difficulty,
                "distance_miles": trail.distance_miles,
                "elevation_gain_feet": trail.elevation_gain_feet,
            }
    
    return {
        "status": "ready",
        "placeId": request.placeId,
        "placeName": place.name,
        "regionBBox": region_bbox,
        "centerLat": lat,
        "centerLng": lng,
        "trail": trail_data,
        "offlineLiteSupported": True,
        "fullTilesSupported": False,  # Web limitation
        "message": "Offline-lite mode: essential data cached. Full map tiles require mobile app."
    }

@app.get("/api/v1/maps/offline/{place_id}/status")
async def get_offline_map_status(
    place_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if offline map is available for a place"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        return {"status": "not_found", "available": False}
    
    # In a real implementation, this would check for cached tiles
    # For now, we return that offline-lite is always available
    return {
        "status": "available",
        "available": True,
        "offlineLiteSupported": True,
        "fullTilesSupported": False,
        "placeId": place_id,
        "placeName": place.name
    }

# Companion endpoints
@app.post("/api/v1/companion/identify")
async def identify_discovery(
    image: UploadFile = File(...),
    location: Optional[str] = Form(None),
    trail_context: Optional[str] = Form(None),
    user: User = Depends(get_current_user)
):
    """Identify what user is seeing from an image (simpler endpoint for discovery mode)"""
    from backend.companion_service import get_companion_service
    import json
    
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    image_data = await image.read()
    loc = None
    if location:
        try:
            loc = json.loads(location)
        except:
            pass
    
    companion = get_companion_service(api_key)
    result = await companion.identify_from_image(image_data, loc, trail_context)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to identify image")
    
    return result

@app.post("/api/v1/companion/identify-image")
async def identify_image(
    image: UploadFile = File(...),
    location: Optional[str] = Query(None),
    trail_context: Optional[str] = Query(None),
    user: User = Depends(get_current_user)
):
    """Identify what user is seeing from an image"""
    from backend.companion_service import get_companion_service
    import json
    
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    image_data = await image.read()
    loc = None
    if location:
        try:
            loc = json.loads(location)
        except:
            pass
    
    companion = get_companion_service(api_key)
    result = await companion.identify_from_image(image_data, loc, trail_context)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to identify image")
    
    return result

@app.post("/api/v1/companion/identify-audio")
async def identify_audio(
    audio: UploadFile = File(...),
    location: Optional[str] = Query(None),
    trail_context: Optional[str] = Query(None),
    user: User = Depends(get_current_user)
):
    """Identify sounds from audio recording"""
    from backend.companion_service import get_companion_service
    import json
    
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    audio_data = await audio.read()
    loc = None
    if location:
        try:
            loc = json.loads(location)
        except:
            pass
    
    companion = get_companion_service(api_key)
    result = await companion.identify_from_audio(audio_data, loc, trail_context)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to identify audio")
    
    return result

@app.get("/api/v1/trails/{trail_id}/vegetation")
async def get_trail_vegetation(
    trail_id: str,
    db: Session = Depends(get_db)
):
    """Get vegetation and habitat information for a trail"""
    from backend.companion_service import get_companion_service
    
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    place = db.query(Place).filter(Place.id == trail.place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    companion = get_companion_service(api_key)
    loc = place.location if isinstance(place.location, dict) else None
    result = await companion.get_trail_vegetation_info(trail.name, place.name, loc)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to get vegetation info")
    
    return result

@app.post("/api/v1/companion/suggest-action")
async def suggest_next_action(
    current_location: str = Query(...),
    trail_progress: float = Query(...),
    time_of_day: str = Query(...),
    trail_context: Optional[str] = Query(None),
    user: User = Depends(get_current_user)
):
    """Get suggestion for next best action"""
    from backend.companion_service import get_companion_service
    import json
    
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        loc = json.loads(current_location)
    except:
        raise HTTPException(status_code=400, detail="Invalid location format")
    
    companion = get_companion_service(api_key)
    result = await companion.suggest_next_action(
        loc,
        trail_progress,
        time_of_day,
        [],  # Recent observations - could be enhanced
        trail_context
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to generate suggestion")
    
    return result

@app.get("/api/v1/trails/search")
async def search_trails_endpoint(query: str = Query(...), limit: int = 20, db: Session = Depends(get_db)):
    """Search trails"""
    results = await search_trails(query, db, limit)
    return {"trails": results}

@app.get("/api/v1/trails/{trail_id}")
async def get_trail_details_endpoint(trail_id: str, db: Session = Depends(get_db)):
    """Get trail details"""
    result = await get_trail_details(trail_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Trail not found")
    return result

# Hikes Routes
@app.post("/api/v1/hikes")
async def create_hike(
    trail_id: Optional[str] = None,
    place_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new hike session"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = create_hike_session(user.id, trail_id, place_id, db)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create hike")
    return result

@app.post("/api/v1/hikes/{hike_id}/start")
async def start_hike_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if start_hike(hike_id, db):
        return {"status": "started"}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.post("/api/v1/hikes/{hike_id}/pause")
async def pause_hike_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause a hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if pause_hike(hike_id, db):
        return {"status": "paused"}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.post("/api/v1/hikes/{hike_id}/end")
async def end_hike_endpoint(
    hike_id: str,
    distance_miles: Optional[float] = None,
    duration_minutes: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if end_hike(hike_id, distance_miles, duration_minutes, db):
        # Compute achievements
        compute_achievements(user.id, hike_id, db)
        return {"status": "completed"}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.post("/api/v1/hikes/{hike_id}/generate-summary")
async def generate_hike_summary_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive hike summary using Gemini Vision"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from backend.hike_summary_service import generate_hike_summary
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await generate_hike_summary(hike_id, db, api_key)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate summary"))
    
    return result

@app.post("/api/v1/hikes/{hike_id}/generate-narrative")
async def generate_hike_narrative_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI journal narrative for a completed hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Check feature flag
    feature_enabled = os.environ.get("FEATURE_AI_JOURNAL_NARRATIVE", "false").lower() == "true"
    if not feature_enabled:
        raise HTTPException(status_code=403, detail="AI journal narrative feature is not enabled")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await generate_hike_narrative(hike_id, db, api_key)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate narrative"))
    
    return result

@app.post("/api/v1/hikes/{hike_id}/route")
async def upload_route_points_endpoint(
    hike_id: str,
    points: List[Dict[str, Any]],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload route points"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if upload_route_points(hike_id, points, db):
        return {"status": "uploaded", "count": len(points)}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.post("/api/v1/hikes/{hike_id}/sensors")
async def upload_sensor_batch_endpoint(
    hike_id: str,
    batch: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload sensor batch"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if upload_sensor_batch(hike_id, batch, db):
        return {"status": "uploaded"}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.get("/api/v1/hikes")
async def get_hikes_endpoint(
    user: User = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get user's hike history"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"hikes": get_hike_history(user.id, limit, db, status)}

@app.get("/api/v1/hikes/active")
async def get_active_hike_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current active hike for the user (if any)"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    active_hike = db.query(Hike).filter(
        Hike.user_id == user.id,
        Hike.status == "active"
    ).order_by(Hike.start_time.desc()).first()
    
    if not active_hike:
        raise HTTPException(status_code=404, detail="No active hike found")
    
    logger.info(f"Retrieved active hike {active_hike.id} for user {user.id}")
    return {
        "id": active_hike.id,
        "status": active_hike.status,
        "start_time": active_hike.start_time.isoformat() if active_hike.start_time else None,
        "trail_id": active_hike.trail_id,
        "place_id": active_hike.place_id,
        "trail": active_hike.trail,
        "discoveries": active_hike.discoveries or [],
        "media": active_hike.media or []
    }

@app.get("/api/v1/hikes/{hike_id}")
async def get_hike_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hike details"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_hike_details(hike_id, user.id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Hike not found")
    return result

class HikeUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    distance_miles: Optional[float] = None
    duration_minutes: Optional[int] = None
    end_time: Optional[str] = None
    elevation_gain_feet: Optional[float] = None

class JournalSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None

@app.patch("/api/v1/hikes/{hike_id}")
async def update_hike_endpoint(
    hike_id: str,
    update_data: HikeUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update hike (e.g., rename, update metadata)"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Update allowed fields
    if update_data.name is not None:
        hike.name = update_data.name
    if update_data.status is not None:
        hike.status = update_data.status
    if update_data.distance_miles is not None:
        hike.distance_miles = update_data.distance_miles
    if update_data.duration_minutes is not None:
        hike.duration_minutes = update_data.duration_minutes
    if update_data.end_time is not None:
        from datetime import datetime
        hike.end_time = datetime.fromisoformat(update_data.end_time.replace('Z', '+00:00'))
    if update_data.elevation_gain_feet is not None:
        hike.elevation_gain_feet = update_data.elevation_gain_feet
    
    hike.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(hike)
    
    return get_hike_details(hike_id, user.id, db)

# Media Routes
@app.post("/api/v1/hikes/{hike_id}/media/upload-url")
async def get_upload_url_endpoint(
    hike_id: str,
    content_type: str,
    category: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get signed upload URL"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_signed_upload_url(user.id, hike_id, content_type, category, db)
    if not result:
        raise HTTPException(status_code=404, detail="Hike not found")
    return result

@app.post("/api/v1/media/upload/{key:path}")
async def upload_media_file(
    key: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload media file to local storage"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    data = await file.read()
    if save_local_file(key, data):
        return {"success": True, "key": key}
    raise HTTPException(status_code=500, detail="Failed to save file")

@app.get("/api/v1/media/{key:path}")
async def get_media_file(key: str):
    """Get media file from local storage"""
    file_path = get_local_file_path(key)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))

@app.post("/api/v1/media/{media_id}/register")
async def register_media_endpoint(
    media_id: str,
    size_bytes: int,
    metadata: Optional[Dict[str, Any]] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register uploaded media"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = register_uploaded_media(media_id, user.id, size_bytes, metadata, db)
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"id": result.id, "url": result.url}


@app.post("/api/v1/media/{media_id}/3d")
async def start_media_3d_endpoint(
    media_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a photo-to-3D job for a media item (DEV stub)."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from backend.photo_3d_service import start_photo_3d_job
    result = start_photo_3d_job(media_id, user.id, db)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to start 3D job"))
    return result


@app.get("/api/v1/3d-jobs/{job_id}")
async def get_3d_job_status_endpoint(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of a 3D job (DEV stub)."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from backend.photo_3d_service import get_photo_3d_job
    job = get_photo_3d_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Access control: ensure job belongs to the current user via hike ownership
    media_id = job.get("media_id")
    media = db.query(Media).filter(Media.id == media_id).first() if media_id else None
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")

    return job


@app.get("/api/v1/3d-jobs/{job_id}/model.obj")
async def get_3d_job_model_obj(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download placeholder OBJ for a completed 3D job (DEV stub)."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from backend.photo_3d_service import get_photo_3d_job, get_placeholder_obj
    job = get_photo_3d_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Access control via hike ownership
    media_id = job.get("media_id")
    media = db.query(Media).filter(Media.id == media_id).first() if media_id else None
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")

    if job.get("status") != "completed":
        raise HTTPException(status_code=409, detail=f"Job not completed (status={job.get('status')})")

    return PlainTextResponse(get_placeholder_obj(), media_type="text/plain")

@app.get("/api/v1/hikes/{hike_id}/media")
async def get_hike_media_endpoint(
    hike_id: str,
    type: Optional[str] = None,
    category: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hike media"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"media": get_hike_media(hike_id, user.id, type, category, db)}

@app.post("/api/v1/hikes/{hike_id}/media")
async def upload_hike_media_endpoint(
    hike_id: str,
    file: UploadFile = File(...),
    type: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload media directly to a hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify hike exists and belongs to user
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Save file locally
    import uuid
    file_key = f"hikes/{hike_id}/{uuid.uuid4()}_{file.filename}"
    file_data = await file.read()
    file_size = len(file_data)
    
    if not save_local_file(file_key, file_data):
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Create media record
    from backend.models import Media
    media = Media(
        id=str(uuid.uuid4()),
        hike_id=hike_id,
        type=type,
        storage_key=file_key,
        url=f"/api/v1/media/{file_key}",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=file_size
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    
    # Return full media object with created_at using Pydantic schema
    return MediaResponse(
        id=media.id,
        hike_id=media.hike_id,
        segment_id=media.segment_id,
        type=media.type,
        category=media.category,
        storage_key=media.storage_key,
        url=media.url,
        mime_type=media.mime_type,
        size_bytes=media.size_bytes,
        width=media.width,
        height=media.height,
        duration_ms=media.duration_ms,
        location=media.location,
        meta_data=media.meta_data,
        synced_at=media.synced_at,
        created_at=media.created_at
    )

@app.post("/api/v1/media/{media_id}/enhance")
async def start_media_enhancement_endpoint(
    media_id: str,
    options: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start enhancement job for a media item (opt-in)"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify media belongs to user's hike
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await start_enhancement_job(media_id, options, api_key, db)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to start enhancement"))
    
    return result

@app.get("/api/v1/media/{media_id}/enhancement-jobs")
async def get_media_enhancement_jobs_endpoint(
    media_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get enhancement jobs for a media item"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify media belongs to user's hike
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")
    
    jobs = get_media_enhancement_jobs(media_id)
    return {"jobs": jobs}

@app.get("/api/v1/enhancement-jobs/{job_id}")
async def get_enhancement_job_status_endpoint(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of an enhancement job"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    job = get_enhancement_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify job belongs to user's media
    media = db.query(Media).filter(Media.id == job.get("media_id")).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return job

@app.post("/api/v1/enhancement-jobs/{job_id}/cancel")
async def cancel_enhancement_job_endpoint(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an enhancement job"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    job = get_enhancement_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify job belongs to user's media
    media = db.query(Media).filter(Media.id == job.get("media_id")).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    hike = db.query(Hike).filter(Hike.id == media.hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = cancel_enhancement_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")
    
    return {"success": True, "status": "cancelled"}

# Insights Routes
@app.post("/api/v1/hikes/{hike_id}/insights/start")
async def start_insights_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start hike analysis"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if start_analysis(hike_id, db):
        return {"status": "started"}
    raise HTTPException(status_code=404, detail="Hike not found")

@app.get("/api/v1/hikes/{hike_id}/insights/status")
async def get_insights_status_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get insight status"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_insight_status(hike_id, db)
    if not result:
        return {"status": "pending"}
    return result

@app.get("/api/v1/hikes/{hike_id}/insights/report")
async def get_insights_report_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get insight report"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_insight_report(hike_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return result

# Achievements Routes
@app.get("/api/v1/achievements")
async def get_achievements_endpoint(db: Session = Depends(get_db)):
    """Get all achievements"""
    return {"achievements": get_all_achievements(db)}

@app.get("/api/v1/achievements/user")
async def get_user_achievements_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user achievements"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"achievements": get_user_achievements(user.id, db)}

@app.get("/api/v1/achievements/mine")
async def get_my_achievements_endpoint(
    category: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's achievements (alias for /achievements/user)"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    achievements = get_user_achievements(user.id, db)
    # Filter by category if provided
    if category:
        achievements = [a for a in achievements if a.get("category") == category]
    # Limit results
    achievements = achievements[:limit]
    return {"achievements": achievements}

@app.get("/api/v1/achievements/park-badges")
async def get_park_badges_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's park badges with official NPS imagery.
    Returns both unlocked and available park achievements.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from backend.achievements_service import get_user_achievements, get_park_badge_info
    
    user_achievements = get_user_achievements(user.id, db)
    
    # Separate park achievements from other achievements
    park_badges = []
    other_achievements = []
    
    for ua in user_achievements:
        ach = ua.get("achievement", {})
        cat = ach.get("category", "")
        if cat in ("national_park", "state_park", "park_explorer"):
            park_badges.append(ua)
        else:
            other_achievements.append(ua)
    
    # Enrich park badges with NPS image data
    enriched_badges = []
    for badge in park_badges:
        ach = badge.get("achievement", {})
        park_name = ach.get("name", "").replace(" Explorer", "")
        
        # Try to get NPS badge info
        try:
            nps_info = await get_park_badge_info(park_name)
        except Exception:
            nps_info = {"badge_image": None, "all_images": []}
        
        enriched_badges.append({
            **badge,
            "badge_image": nps_info.get("badge_image"),
            "badge_caption": nps_info.get("badge_caption"),
            "park_url": nps_info.get("url"),
            "park_designation": nps_info.get("designation"),
            "park_states": nps_info.get("states"),
            "all_images": nps_info.get("all_images", [])[:3],
        })
    
    # Get all available park achievements (locked ones)
    all_achievements = db.query(Achievement).filter(
        Achievement.category.in_(["national_park", "state_park", "park_explorer"])
    ).all()
    
    unlocked_ids = {b["achievement"]["id"] for b in park_badges}
    locked_parks = []
    for ach in all_achievements:
        if ach.id not in unlocked_ids:
            locked_parks.append({
                "id": ach.id,
                "code": ach.code,
                "name": ach.name,
                "description": ach.description,
                "icon": ach.icon,
                "category": ach.category,
                "locked": True,
            })
    
    return {
        "unlocked": enriched_badges,
        "locked": locked_parks,
        "total_parks_visited": len(enriched_badges),
        "stats": {
            "national_parks": len([b for b in enriched_badges if b.get("achievement", {}).get("category") == "national_park"]),
            "state_parks": len([b for b in enriched_badges if b.get("achievement", {}).get("category") == "state_park"]),
        }
    }

# Devices Routes
@app.post("/api/v1/devices")
async def register_device_endpoint(
    device_type: str,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
    token: Optional[str] = None,
    capabilities: Optional[Dict[str, Any]] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register device"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = register_device(user.id, device_type, device_id, device_name, token, capabilities, db)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to register device")
    return result

@app.post("/api/v1/devices/{device_id}/status")
async def update_device_status_endpoint(
    device_id: str,
    status: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update device status"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if update_device_status(device_id, user.id, status, db):
        return {"status": "updated"}
    raise HTTPException(status_code=404, detail="Device not found")

@app.get("/api/v1/devices")
async def get_devices_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user devices"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"devices": get_user_devices(user.id, db)}

@app.delete("/api/v1/devices/{device_id}")
async def remove_device_endpoint(
    device_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove device"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if remove_device(device_id, user.id, db):
        return {"status": "removed"}
    raise HTTPException(status_code=404, detail="Device not found")

# Export Routes
@app.get("/api/v1/hikes/{hike_id}/export")
async def export_hike_endpoint(
    hike_id: str,
    format: str = "json",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export hike data"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    data = export_hike_data(hike_id, user.id, format, db)
    if not data:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    content_type = "application/json" if format == "json" else "text/csv"
    from fastapi.responses import Response
    return Response(content=data, media_type=content_type)

# Journal Routes
@app.post("/api/v1/journal")
async def create_journal_endpoint(
    title: str,
    content: str,
    hike_id: Optional[str] = None,
    entry_type: str = "reflection",
    metadata: Optional[Dict[str, Any]] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create journal entry"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = create_journal_entry(user.id, title, content, hike_id, entry_type, metadata, db)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create entry")
    return result

@app.get("/api/v1/journal")
async def get_journal_endpoint(
    hike_id: Optional[str] = None,
    entry_type: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get journal entries"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"entries": get_journal_entries(user.id, hike_id, entry_type, limit, db)}

@app.put("/api/v1/journal/{entry_id}")
async def update_journal_endpoint(
    entry_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update journal entry"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = update_journal_entry(entry_id, user.id, title, content, metadata, db)
    if not result:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result

@app.delete("/api/v1/journal/{entry_id}")
async def delete_journal_endpoint(
    entry_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete journal entry"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if delete_journal_entry(entry_id, user.id, db):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Entry not found")

# Stats Routes
@app.get("/api/v1/stats")
async def get_stats_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user stats"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_user_stats(user.id, db)

@app.get("/api/v1/profile/stats")
async def get_profile_stats_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive user profile statistics with achievements and park badges"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from backend.achievements_service import get_user_stats as get_achievement_stats
    return get_achievement_stats(user.id, db)

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics for explore page"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from backend.stats_service import get_dashboard_stats
    return get_dashboard_stats(user.id, db)

@app.get("/api/v1/hikes/{hike_id}/stats")
async def get_hike_stats_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hike stats"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_hike_stats(hike_id, user.id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Hike not found")
    return result

# Sync Routes
@app.post("/api/v1/hikes/{hike_id}/sync")
async def sync_hike_endpoint(
    hike_id: str,
    route_points: Optional[List[Dict[str, Any]]] = None,
    sensor_batches: Optional[List[Dict[str, Any]]] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync offline data"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return sync_offline_data(hike_id, user.id, route_points, sensor_batches, db)

@app.get("/api/v1/hikes/{hike_id}/sync/status")
async def get_sync_status_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sync status"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_sync_status(hike_id, user.id, db)

# Search Routes
@app.get("/api/v1/search/hikes")
async def search_hikes_endpoint(
    query: str = Query(...),
    user: User = Depends(get_current_user),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Search hikes"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"hikes": search_hikes(query, user.id, limit, db)}

@app.get("/api/v1/search/places")
async def search_places_search_endpoint(
    query: str = Query(...),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Search places"""
    return {"places": search_places_service(query, limit, db)}

# AI Services Routes
from backend.ai_services import (
    enhance_photo_nano_banana,
    generate_trail_video_veo,
    generate_hike_story,
    organize_photos_intelligently,
    get_predictive_insights,
    search_journal_natural_language
)

@app.post("/api/v1/ai/enhance-photo")
async def enhance_photo_endpoint(
    image: UploadFile = File(...),
    options: str = Form("{}"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enhance photo using Nano Banana Pro"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    image_data = await image.read()
    options_dict = json.loads(options)
    api_key = os.environ.get("API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await enhance_photo_nano_banana(image_data, options_dict, api_key)
    return result

@app.post("/api/v1/hikes/{hike_id}/generate-video")
async def generate_video_endpoint(
    hike_id: str,
    options: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate trail recap video using Veo"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await generate_trail_video_veo(hike_id, options, db, api_key)
    return result

class StoryGenerationRequest(BaseModel):
    style: str = "narrative"

@app.post("/api/v1/hikes/{hike_id}/generate-story")
async def generate_story_endpoint(
    hike_id: str,
    request: StoryGenerationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI story for hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    style = request.style
    """Generate AI story for hike"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await generate_hike_story(hike_id, style, db, api_key)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate story"))
    return result

@app.post("/api/v1/hikes/{hike_id}/organize-photos")
async def organize_photos_endpoint(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Organize photos into smart albums"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await organize_photos_intelligently(hike_id, db, api_key)
    return result

@app.get("/api/v1/users/{user_id}/insights")
async def get_insights_endpoint(
    user_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get predictive insights for user"""
    if not user or user.id != user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await get_predictive_insights(user_id, db, api_key)
    return result

@app.post("/api/v1/journal/search")
async def search_journal_endpoint(
    request: JournalSearchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Natural language search through journal"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    query = request.query
    filters = request.filters
    """Natural language search through journal"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_key = os.environ.get("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    result = await search_journal_natural_language(query, user.id, filters or {}, db, api_key)
    return result

# ======================================
# HIKE MODE - DISCOVERY SYSTEM ENDPOINTS
# ======================================

class DiscoveryNode(PydanticBaseModel):
    id: str
    hikeId: str
    trailId: str
    title: str
    category: str
    lat: float
    lng: float
    shortFact: str
    longDescription: Optional[str] = None
    imageUrl: Optional[str] = None
    rarity: str = "common"
    xp: int = 20
    source: str = "curated"

class DiscoveryCaptureRequest(PydanticBaseModel):
    node_id: str
    category: str
    note: Optional[str] = None
    confidence: int = 80
    lat: Optional[float] = None
    lng: Optional[float] = None

class HikeCompleteRequest(PydanticBaseModel):
    distance_meters: float = 0
    duration_seconds: int = 0
    elevation_gain_meters: float = 0
    captures: int = 0
    route_points: Optional[List[Dict[str, Any]]] = None

@app.post("/api/v1/hikes/{hike_id}/discoveries/bootstrap")
async def bootstrap_discoveries(
    hike_id: str,
    db: Session = Depends(get_db)
):
    """
    Bootstrap discovery nodes for a hike.
    Uses deterministic data sources (NPS POIs, Google Places, curated data).
    No Gemini dependency.
    """
    logger.info(f"[Discoveries] Bootstrapping for hike {hike_id}")
    
    # Get hike details
    hike = db.query(Hike).filter(Hike.id == hike_id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    trail_id = hike.trail_id
    place_id = hike.place_id
    
    # Get trail and place data
    trail = db.query(Trail).filter(Trail.id == trail_id).first() if trail_id else None
    place = db.query(Place).filter(Place.id == place_id).first() if place_id else None
    
    # Get coordinates
    base_lat: Optional[float] = None
    base_lng: Optional[float] = None
    
    if trail and trail.meta_data:
        meta = trail.meta_data if isinstance(trail.meta_data, dict) else {}
        # Prefer explicit trailhead coordinates
        if meta.get("trailhead_lat") is not None:
            base_lat = float(meta["trailhead_lat"])
        elif meta.get("lat") is not None:
            base_lat = float(meta["lat"])
        if meta.get("trailhead_lng") is not None:
            base_lng = float(meta["trailhead_lng"])
        elif meta.get("lng") is not None:
            base_lng = float(meta["lng"])
    elif place and place.location:
        loc = place.location if isinstance(place.location, dict) else {}
        if loc.get("lat") is not None:
            base_lat = float(loc["lat"])
        if loc.get("lng") is not None:
            base_lng = float(loc["lng"])

    if base_lat is None or base_lng is None:
        raise HTTPException(status_code=400, detail="Unable to load trail location. Please try again.")
    
    # Generate discovery nodes
    nodes = generate_discovery_nodes(hike_id, trail_id or "", place, base_lat, base_lng)
    
    return {
        "success": True,
        "hike_id": hike_id,
        "nodes": nodes,
        "count": len(nodes)
    }

def generate_discovery_nodes(hike_id: str, trail_id: str, place: Optional[Place], base_lat: float, base_lng: float) -> List[Dict]:
    """Generate deterministic discovery nodes for a trail"""
    import random
    import hashlib
    
    # Use trail_id for seeded random to be deterministic
    seed = int(hashlib.md5(trail_id.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    
    place_name = place.name if place else "Trail"
    
    # Discovery templates by category
    templates = {
        "wildlife": [
            {"title": "Deer Crossing", "fact": "White-tailed deer are most active at dawn and dusk. Look for tracks in soft soil."},
            {"title": "Bird Sanctuary", "fact": "Over 50 bird species have been spotted here including red-tailed hawks and blue jays."},
            {"title": "Squirrel Cache", "fact": "Gray squirrels bury thousands of acorns each fall and can remember most hiding spots."},
        ],
        "plant": [
            {"title": "Ancient Oak Grove", "fact": "These coast live oaks are over 200 years old and support entire ecosystems."},
            {"title": "Wildflower Meadow", "fact": "California poppies bloom brightest in spring when daytime temperatures reach 60-70°F."},
            {"title": "Fern Canyon", "fact": "Sword ferns are among the oldest plant families, dating back 300 million years."},
            {"title": "Redwood Stand", "fact": "Coastal redwoods can live over 2,000 years and grow taller than 350 feet."},
        ],
        "geology": [
            {"title": "Serpentine Outcrop", "fact": "This blue-green rock formed deep in the Earth and supports unique plant communities."},
            {"title": "Glacial Boulder", "fact": "This erratic was deposited by glaciers during the last ice age, 15,000 years ago."},
            {"title": "Fossil Bed", "fact": "Marine fossils here indicate this area was once beneath an ancient sea."},
        ],
        "landmark": [
            {"title": "Historic Trail Marker", "fact": "This stone marker was placed by the Civilian Conservation Corps in the 1930s."},
            {"title": "Scenic Overlook", "fact": "On clear days, visibility from this point can exceed 50 miles."},
            {"title": "Old Growth Forest", "fact": "Less than 5% of original old-growth forests remain in California."},
        ],
        "history": [
            {"title": "Native American Site", "fact": "This area was inhabited by indigenous peoples for thousands of years."},
            {"title": "Pioneer Homestead", "fact": "Early settlers established farms here in the 1850s during the Gold Rush era."},
            {"title": "Railroad Grade", "fact": "This flat section follows an old logging railroad built in the early 1900s."},
        ],
        "water": [
            {"title": "Spring Source", "fact": "This natural spring flows year-round, fed by underground aquifers."},
            {"title": "Seasonal Creek", "fact": "This creek supports spawning salmon in winter months."},
            {"title": "Waterfall Vista", "fact": "The waterfall is most impressive after winter rains."},
        ],
        "viewpoint": [
            {"title": "Summit View", "fact": "The highest point on this trail offers 360-degree panoramic views."},
            {"title": "Valley Overlook", "fact": "From here you can see the entire watershed that feeds the local streams."},
        ],
    }
    
    rarities = ["common", "common", "common", "uncommon", "uncommon", "rare"]
    xp_by_rarity = {"common": 20, "uncommon": 35, "rare": 50}
    
    nodes = []
    categories = list(templates.keys())
    
    # Generate 8-12 nodes
    num_nodes = rng.randint(8, 12)
    
    for i in range(num_nodes):
        category = categories[i % len(categories)]
        template_list = templates[category]
        template = rng.choice(template_list)
        rarity = rng.choice(rarities)
        
        # Distribute nodes along a simulated trail path
        t = i / (num_nodes - 1) if num_nodes > 1 else 0.5
        # Create a winding path
        offset_lat = (t * 0.02) + rng.uniform(-0.002, 0.002)
        offset_lng = (rng.uniform(-0.01, 0.01)) + (t * 0.01)
        
        node = {
            "id": f"{hike_id}-node-{i}",
            "hikeId": hike_id,
            "trailId": trail_id,
            "title": template["title"],
            "category": category,
            "lat": base_lat + offset_lat,
            "lng": base_lng + offset_lng,
            "shortFact": template["fact"],
            "rarity": rarity,
            "xp": xp_by_rarity[rarity],
            "source": "curated",
        }
        nodes.append(node)
    
    return nodes

@app.get("/api/v1/hikes/{hike_id}/discoveries")
async def get_hike_discoveries(
    hike_id: str,
    db: Session = Depends(get_db)
):
    """Get discoveries for a hike with capture status"""
    hike = db.query(Hike).filter(Hike.id == hike_id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Get all discoveries for this hike from meta_data or regenerate
    meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
    nodes = meta.get("discovery_nodes", [])
    captures = meta.get("discovery_captures", [])
    
    return {
        "hike_id": hike_id,
        "nodes": nodes,
        "captures": captures,
        "progress": {
            "total": len(nodes),
            "captured": len(captures),
        }
    }

@app.post("/api/v1/hikes/{hike_id}/discoveries/capture")
async def capture_discovery(
    hike_id: str,
    node_id: str = Form(...),
    category: str = Form(...),
    note: Optional[str] = Form(None),
    confidence: int = Form(80),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Capture a discovery during a hike"""
    logger.info(f"[Discoveries] Capturing node {node_id} for hike {hike_id}")
    
    hike = db.query(Hike).filter(Hike.id == hike_id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Handle photo upload
    photo_url = None
    if photo:
        try:
            contents = await photo.read()
            filename = f"captures/{hike_id}/{node_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
            save_local_file(filename, contents)
            photo_url = f"/uploads/{filename}"
        except Exception as e:
            logger.warning(f"Failed to save capture photo: {e}")
    
    # Create capture record
    capture = {
        "id": f"capture-{hike_id}-{node_id}-{datetime.utcnow().timestamp()}",
        "nodeId": node_id,
        "hikeId": hike_id,
        "userId": str(hike.user_id) if hike.user_id else "anonymous",
        "capturedAt": datetime.utcnow().isoformat(),
        "category": category,
        "note": note,
        "confidence": confidence,
        "location": {"lat": lat, "lng": lng} if lat and lng else None,
        "photoUrl": photo_url,
    }
    
    # Update hike meta_data
    meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
    captures = meta.get("discovery_captures", [])
    captures.append(capture)
    meta["discovery_captures"] = captures
    hike.meta_data = meta
    
    db.commit()
    
    # Check for badges
    badges = check_discovery_badges(hike_id, captures, db)
    
    return {
        "success": True,
        "capture": capture,
        "badges": badges,
        "total_captures": len(captures)
    }

def check_discovery_badges(hike_id: str, captures: List[Dict], db: Session) -> List[Dict]:
    """Check if any badges should be awarded"""
    badges = []
    
    # First capture badge
    if len(captures) == 1:
        badges.append({
            "id": f"badge-first-{hike_id}",
            "type": "first_capture",
            "name": "First Discovery",
            "description": "Made your first discovery!",
            "icon": "⭐",
            "xp": 50,
            "earnedAt": datetime.utcnow().isoformat()
        })
    
    # Triple capture badge
    if len(captures) == 3:
        badges.append({
            "id": f"badge-triple-{hike_id}",
            "type": "triple_capture",
            "name": "Triple Threat",
            "description": "Captured 3 discoveries in one hike",
            "icon": "🎯",
            "xp": 100,
            "earnedAt": datetime.utcnow().isoformat()
        })
    
    # Category master badge
    category_counts: Dict[str, int] = {}
    for c in captures:
        cat = c.get("category", "unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    for cat, count in category_counts.items():
        if count == 3:
            badges.append({
                "id": f"badge-category-{cat}-{hike_id}",
                "type": "category_master",
                "name": f"{cat.title()} Expert",
                "description": f"Captured 3 {cat} discoveries",
                "icon": "🏆",
                "xp": 150,
                "earnedAt": datetime.utcnow().isoformat()
            })
    
    return badges

@app.post("/api/v1/hikes/{hike_id}/complete")
async def complete_hike(
    hike_id: str,
    request: HikeCompleteRequest,
    db: Session = Depends(get_db)
):
    """Complete a hike and award final badges"""
    logger.info(f"[Hike] Completing hike {hike_id}")
    
    hike = db.query(Hike).filter(Hike.id == hike_id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Update hike stats
    meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
    meta["distance_meters"] = request.distance_meters
    meta["duration_seconds"] = request.duration_seconds
    meta["elevation_gain_meters"] = request.elevation_gain_meters
    meta["captures_count"] = request.captures
    meta["completed_at"] = datetime.utcnow().isoformat()
    
    if request.route_points:
        meta["route_points"] = request.route_points
    
    hike.meta_data = meta
    hike.end_time = datetime.utcnow()
    
    # Award completion badges
    badges = []
    badges.append({
        "id": f"badge-complete-{hike_id}",
        "type": "hike_complete",
        "name": "Trail Blazer",
        "description": "Completed a hike",
        "icon": "🥾",
        "xp": 75,
        "earnedAt": datetime.utcnow().isoformat()
    })
    
    # Distance milestone
    if request.distance_meters >= 8046:  # 5 miles
        badges.append({
            "id": f"badge-distance-{hike_id}",
            "type": "distance_milestone",
            "name": "Distance Champion",
            "description": "Hiked more than 5 miles",
            "icon": "🏃",
            "xp": 100,
            "earnedAt": datetime.utcnow().isoformat()
        })
    
    # Store badges
    meta["earned_badges"] = meta.get("earned_badges", []) + badges
    hike.meta_data = meta
    
    # Check for park badge
    park_badge = None
    place = db.query(Place).filter(Place.id == hike.place_id).first() if hike.place_id else None
    if place:
        park_badge = {
            "id": f"park-badge-{place.id}",
            "parkId": place.id,
            "parkName": place.name,
            "badgeAssetUrl": "",
            "unlockedAt": datetime.utcnow().isoformat()
        }
        meta["park_badge"] = park_badge
        hike.meta_data = meta
    
    db.commit()
    
    return {
        "success": True,
        "hike_id": hike_id,
        "badges": badges,
        "park_badge": park_badge,
    }

@app.get("/api/v1/hikes/{hike_id}/summary")
async def get_hike_summary(
    hike_id: str,
    db: Session = Depends(get_db)
):
    """Get hike summary for end screen"""
    hike = db.query(Hike).filter(Hike.id == hike_id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    trail = db.query(Trail).filter(Trail.id == hike.trail_id).first() if hike.trail_id else None
    place = db.query(Place).filter(Place.id == hike.place_id).first() if hike.place_id else None
    
    meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
    captures = meta.get("discovery_captures", [])
    nodes = meta.get("discovery_nodes", [])
    badges = meta.get("earned_badges", [])
    park_badge = meta.get("park_badge")
    
    # Calculate total XP
    total_xp = sum(b.get("xp", 0) for b in badges)
    for c in captures:
        # Find matching node to get XP
        node_id = c.get("nodeId")
        for n in nodes:
            if n.get("id") == node_id:
                total_xp += n.get("xp", 20)
                break
    
    return {
        "hikeId": hike_id,
        "trailName": trail.name if trail else "Trail",
        "parkName": place.name if place else "Park",
        "startTime": hike.start_time.isoformat() if hike.start_time else None,
        "endTime": hike.end_time.isoformat() if hike.end_time else meta.get("completed_at"),
        "durationSeconds": meta.get("duration_seconds", 0),
        "distanceMeters": meta.get("distance_meters", 0),
        "elevationGainMeters": meta.get("elevation_gain_meters", 0),
        "avgPaceMinPerKm": None,
        "discoveryCount": len(nodes),
        "captureCount": len(captures),
        "totalXp": total_xp,
        "newBadges": badges,
        "parkBadge": park_badge,
    }

@app.get("/api/v1/profile/badges")
async def get_user_badges(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all badges earned by user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get all hikes for user
    hikes = db.query(Hike).filter(Hike.user_id == user.id).all()
    
    all_badges = []
    park_badges = []
    
    for hike in hikes:
        meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
        badges = meta.get("earned_badges", [])
        all_badges.extend(badges)
        
        park_badge = meta.get("park_badge")
        if park_badge:
            park_badges.append(park_badge)
    
    # Deduplicate park badges
    unique_park_badges = {b["parkId"]: b for b in park_badges}.values()
    
    return {
        "badges": all_badges,
        "parkBadges": list(unique_park_badges),
        "totalCount": len(all_badges) + len(list(unique_park_badges)),
    }

# ======================================
# OFFLINE MAP PACK ENDPOINTS
# ======================================

@app.get("/api/v1/parks/{park_id}/official-map")
async def get_park_official_map(
    park_id: str,
    db: Session = Depends(get_db)
):
    """
    Get official park map (PDF) URL.
    For NPS parks, fetches from NPS website.
    """
    from backend.official_map_service import OfficialMapService
    
    place = db.query(Place).filter(Place.id == park_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Park not found")
    
    # Extract optional hints for better scraping/fallbacks
    meta = place.meta_data if isinstance(place.meta_data, dict) else {}
    website_url = meta.get("website") or meta.get("url") or meta.get("website_url")
    loc = place.location if isinstance(place.location, dict) else {}
    lat = loc.get("lat") or loc.get("latitude")
    lng = loc.get("lng") or loc.get("longitude")

    try:
        asset = OfficialMapService().fetch_official_map_asset(
            place.name,
            website_url=website_url,
            lat=lat,
            lng=lng,
        )
        if asset and asset.get("success") and asset.get("map_url"):
            # Backwards compatible response: keep pdfUrl but also return mapUrl + assetType.
            return {
                "success": True,
                "pdfUrl": asset.get("map_url"),
                "mapUrl": asset.get("map_url"),
                "assetType": asset.get("asset_type"),  # 'pdf' | 'image'
                "sourceName": asset.get("source", "Offline Map"),
                "mapType": asset.get("map_type", "overview"),
                "method": asset.get("method"),
                "lastFetchedAt": asset.get("fetched_at") or datetime.utcnow().isoformat(),
                "parkName": asset.get("place_name") or place.name,
            }
    except Exception as e:
        logger.warning(f"Failed to fetch offline map asset for {place.name}: {e}")

    return {
        "success": False,
        "pdfUrl": None,
        "mapUrl": None,
        "assetType": None,
        "sourceName": None,
        "message": "No offline map asset available for this park",
    }


# ======================================
# OFFLINE PDF MAP PACKS (PER PARK)
# ======================================

@app.get("/api/v1/parks/{park_id}/offline-maps")
async def list_offline_maps_for_park(
    park_id: str,
    db: Session = Depends(get_db),
):
    """
    List offline map assets for a park (status + metadata).
    """
    place = db.query(Place).filter(Place.id == park_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Park not found")

    assets = (
        db.query(OfflineMapAsset)
        .filter(OfflineMapAsset.park_id == park_id)
        .order_by(OfflineMapAsset.created_at.desc())
        .all()
    )
    from backend.offline_maps_service import serialize_asset
    return {
        "success": True,
        "parkId": park_id,
        "parkName": place.name,
        "assets": [serialize_asset(a) for a in assets],
    }


@app.post("/api/v1/parks/{park_id}/offline-maps/download")
async def download_offline_maps_for_park_endpoint(
    park_id: str,
    db: Session = Depends(get_db),
):
    """
    Resolve + download official printable maps (PDF/JPG) for a park.
    Returns updated statuses.
    """
    from backend.offline_maps_service import download_offline_maps_for_park
    return await download_offline_maps_for_park(park_id, db)


@app.get("/api/v1/offline-maps/{asset_id}/file")
async def get_offline_map_file(
    asset_id: str,
    db: Session = Depends(get_db),
):
    """
    Stream the downloaded offline map file.
    """
    asset = db.query(OfflineMapAsset).filter(OfflineMapAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Offline map asset not found")
    if asset.status != "downloaded" or not asset.local_path:
        raise HTTPException(status_code=409, detail="Offline map not downloaded")

    file_path = pathlib.Path(asset.local_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Offline map file missing")

    media_type = "application/pdf" if asset.file_type == "pdf" else "application/octet-stream"
    return FileResponse(str(file_path), media_type=media_type, filename=file_path.name)


@app.get("/api/v1/places/{place_id}/offline-map/pdf")
async def download_place_offline_map_pdf(
    place_id: str,
    db: Session = Depends(get_db),
):
    """
    Download an official printable PDF map for a place.

    - Resolves an official PDF URL (NPS brochures/maps) when available
    - Fetches server-side (avoids browser CORS issues)
    - Streams bytes back to client with attachment headers
    """
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    # Derive parkCode per request from the NPS parks API response
    park_code: Optional[str] = None
    full_name: Optional[str] = None
    match_score: Optional[int] = None
    
    # Common park name to code mappings for major parks
    PARK_CODE_MAP = {
        "yellowstone": "yell",
        "yosemite": "yose",
        "grand canyon": "grca",
        "zion": "zion",
        "acadia": "acad",
        "glacier": "glac",
        "rocky mountain": "romo",
        "grand teton": "grte",
        "olympic": "olym",
        "joshua tree": "jotr",
        "death valley": "deva",
        "sequoia": "sequ",
        "kings canyon": "kica",
        "bryce canyon": "brca",
        "arches": "arch",
        "canyonlands": "cany",
        "capitol reef": "care",
        "mesa verde": "meve",
        "great smoky mountains": "grsm",
        "shenandoah": "shen",
        "everglades": "ever",
        "big bend": "bibe",
        "guadalupe mountains": "gumo",
        "carlsbad caverns": "cave",
        "hawaii volcanoes": "havo",
        "haleakala": "hale",
        "denali": "dena",
        "kenai fjords": "kefj",
        "redwood": "redw",
        "lassen volcanic": "lavo",
        "crater lake": "crla",
        "mount rainier": "mora",
        "north cascades": "noca",
        "badlands": "badl",
        "wind cave": "wica",
        "theodore roosevelt": "thro",
        "voyageurs": "voya",
        "isle royale": "isro",
        "mammoth cave": "maca",
        "hot springs": "hosp",
        "dry tortugas": "drto",
        "biscayne": "bisc",
        "congaree": "cong",
        "great sand dunes": "grsa",
        "black canyon": "blca",
        "petrified forest": "pefo",
        "saguaro": "sagu",
        "channel islands": "chis",
        "pinnacles": "pinn",
    }
    
    try:
        nps_api_key = os.environ.get("NPS_API_KEY")
        if nps_api_key and place.name:
            import requests
            
            # First try to derive park code from our local name mapping (faster, more reliable)
            place_name_lower = place.name.lower()
            derived_code = None
            for park_name, code in PARK_CODE_MAP.items():
                if park_name in place_name_lower:
                    derived_code = code
                    break
            
            if derived_code:
                # Verify the derived code is valid by checking NPS API
                try:
                    resp = requests.get(
                        "https://developer.nps.gov/api/v1/parks",
                        params={"parkCode": derived_code, "api_key": nps_api_key},
                        timeout=5,  # Shorter timeout for verification
                    )
                    if resp.status_code == 200:
                        parks = resp.json().get("data", []) or []
                        if parks:
                            park_code = derived_code
                            full_name = parks[0].get("fullName", place.name)
                            match_score = 100
                            logger.info(f"[OfflineMapPDF] placeId={place_id} derived parkCode='{park_code}' from local map")
                except Exception as e:
                    # NPS verification failed, but still use our derived code
                    park_code = derived_code
                    full_name = place.name
                    match_score = 90
                    logger.info(f"[OfflineMapPDF] placeId={place_id} using derived parkCode='{park_code}' (NPS verify failed: {e})")
            
            # Fallback to NPS search if local match didn't work
            if not park_code:
                try:
                    resp = requests.get(
                        "https://developer.nps.gov/api/v1/parks",
                        params={"q": place.name, "limit": 20, "api_key": nps_api_key},
                        timeout=10,
                    )
                    if resp.status_code == 200:
                        parks = resp.json().get("data", []) or []
                        park_code, full_name, match_score = _select_best_nps_park_code(place.name, parks)
                except Exception as e:
                    logger.info(f"[OfflineMapPDF] placeId={place_id} NPS API search failed: {e}")
                )
                if resp.status_code == 200:
                    parks = resp.json().get("data", []) or []
                    if parks:
                        park_code = derived_code
                        full_name = parks[0].get("fullName", place.name)
                        match_score = 100
            
            # Fallback to NPS search if direct match didn't work
            if not park_code:
                resp = requests.get(
                    "https://developer.nps.gov/api/v1/parks",
                    params={"q": place.name, "limit": 20, "api_key": nps_api_key},
                    timeout=10,
                )
                if resp.status_code == 200:
                    parks = resp.json().get("data", []) or []
                    park_code, full_name, match_score = _select_best_nps_park_code(place.name, parks)
    except Exception as e:
        logger.info(f"[OfflineMapPDF] placeId={place_id} nps_search_failed err={e}")

    logger.info(
        f"[OfflineMapPDF] placeId={place_id} selected parkCode={park_code!r} fullName={full_name!r} score={match_score!r}"
    )
    if not park_code:
        return JSONResponse(status_code=200, content={"available": False, "reason": "no_nps_match"})

    pdf_url = await _resolve_official_pdf_url_for_place(place, park_code=park_code, db=db, full_name=full_name)
    if not pdf_url or not isinstance(pdf_url, str) or not pdf_url.strip():
        return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

    from urllib.parse import urlparse

    safe_name = _safe_filename(place.name)
    filename = f"{safe_name}-offline-map.pdf"

    def _classify_upstream_url(u: str) -> str:
        u_l = (u or "").lower()
        if "style.json" in u_l:
            return "style.json"
        if "/glyphs/" in u_l or "glyph" in u_l:
            return "glyph"
        if "sprite" in u_l:
            return "sprite"
        if "/{z}/" in u_l or "/tiles/" in u_l or "/tile/" in u_l or any(x in u_l for x in ("/0/0/0", "/1/1/1")):
            return "tile"
        if u_l.endswith(".pdf") or ".pdf" in u_l:
            return "pdf"
        if u_l.endswith(".png") or u_l.endswith(".jpg") or u_l.endswith(".jpeg"):
            return "image"
        return "unknown"

    # Validate URL is http(s) and looks like a PDF link
    parsed = urlparse(pdf_url)
    if parsed.scheme not in ("http", "https"):
        logger.warning(f"[OfflineMapPDF] placeId={place_id} invalid_scheme url={pdf_url!r}")
        return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

    if "undefined" in pdf_url.lower() or "null" in pdf_url.lower():
        logger.warning(f"[OfflineMapPDF] placeId={place_id} invalid_url_contains_undefined url={pdf_url!r}")
        return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

    try:
        logger.info(
            f"[OfflineMapPDF] placeId={place_id} parkName={place.name!r} resolved_url={pdf_url} "
            f"url_type={_classify_upstream_url(pdf_url)}"
        )
        logger.info(f"[OfflineMapPDF] placeId={place_id} parkCode={park_code!r}")

        # DISCOVERY STEP: HEAD validate before attempting download
        head_method = "HEAD"
        head_status = None
        head_ct = None
        try:
            hr = requests.head(
                pdf_url,
                timeout=10,
                headers={"User-Agent": "EcoTrails/1.0"},
                allow_redirects=True,
            )
            head_status = hr.status_code
            head_ct = (hr.headers.get("content-type") or "").split(";")[0].strip().lower()
        except Exception as he:
            logger.warning(f"[OfflineMapPDF] placeId={place_id} head_failed url={pdf_url} err={he}")

        logger.info(
            f"[OfflineMapPDF] placeId={place_id} upstream_check method={head_method} status={head_status} content_type={head_ct!r}"
        )

        if head_status != 200 or (head_ct and "application/pdf" not in head_ct and ".pdf" not in pdf_url.lower()):
            # Do not attempt guessed/invalid assets; report unavailability cleanly
            return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

        method = "GET"
        r = requests.get(
            pdf_url,
            stream=True,
            timeout=20,
            headers={"User-Agent": "EcoTrails/1.0"},
            allow_redirects=True,
        )
        upstream_status = r.status_code
        content_type = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
        content_length = r.headers.get("content-length")

        logger.info(
            f"[OfflineMapPDF] placeId={place_id} upstream_status={upstream_status} "
            f"content_type={content_type!r} content_length={content_length!r}"
        )

        if upstream_status >= 400:
            # Read a small preview of the body for debugging (HTML error pages, etc.)
            preview = b""
            try:
                preview = next(r.iter_content(chunk_size=4096)) or b""
            except Exception:
                pass
            try:
                preview_txt = preview.decode("utf-8", errors="replace")
            except Exception:
                preview_txt = repr(preview[:200])
            logger.warning(
                f"[OfflineMapPDF] placeId={place_id} upstream_error method={method} url={pdf_url} "
                f"status={upstream_status} content_type={content_type!r} body_preview={preview_txt[:500]!r}"
            )
            return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

        if "application/pdf" not in content_type and ".pdf" not in pdf_url.lower():
            # Try to read a small preview for debugging
            preview = b""
            try:
                preview = next(r.iter_content(chunk_size=2048)) or b""
            except Exception:
                pass
            try:
                preview_txt = preview.decode("utf-8", errors="replace")
            except Exception:
                preview_txt = repr(preview[:200])
            logger.warning(
                f"[OfflineMapPDF] placeId={place_id} non_pdf_upstream method={method} url={pdf_url} "
                f"content_type={content_type!r} body_preview={preview_txt[:500]!r}"
            )
            return JSONResponse(status_code=200, content={"available": False, "reason": "no_pdf_found", "parkCode": park_code})

        def _iter_bytes():
            total = 0
            for chunk in r.iter_content(chunk_size=1024 * 128):
                if not chunk:
                    continue
                total += len(chunk)
                yield chunk
            logger.info(f"[OfflineMapPDF] placeId={place_id} streamed_bytes={total}")

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Offline-Map-Available": "true",
            "X-Offline-Map-ParkCode": (park_code or ""),
            "X-Offline-Map-Upstream-Url": pdf_url,
        }
        return StreamingResponse(_iter_bytes(), media_type="application/pdf", headers=headers)
    except Exception as e:
        logger.exception(f"[OfflineMapPDF] placeId={place_id} failed: {e}")
        return JSONResponse(status_code=200, content={"available": False, "reason": "download_failed", "parkCode": park_code})


# ======================================
# NPS.GOV SCRAPING (STATE + PARK DETAIL)
# ======================================

@app.get("/api/nps/state/{state_code}")
async def nps_browse_state(state_code: str, forceRefresh: bool = Query(False)):
    """
    Scrape https://www.nps.gov/state/{stateCode}/index.htm and return parks list.
    Cached for 24h unless forceRefresh=true.
    """
    from backend.redis_client import redis_client
    from backend.nps_scraper import scrape_state_parks

    sc = (state_code or "").strip().lower()
    cache_key = f"nps:state:{sc}"
    ttl = 24 * 60 * 60

    if not forceRefresh:
        cached = redis_client.get(cache_key)
        if cached:
            return {**cached, "from_cache": True}

    data = scrape_state_parks(sc)
    redis_client.set(cache_key, data, ttl=ttl)
    data["from_cache"] = False
    return data


@app.get("/api/nps/parks/{park_code}")
async def nps_park_detail(park_code: str, forceRefresh: bool = Query(False)):
    """
    Scrape NPS park pages and return a merged park detail object including mapAssets.
    Cached for 12h unless forceRefresh=true.
    """
    from backend.redis_client import redis_client
    from backend.nps_scraper import scrape_park_detail

    pc = (park_code or "").strip().lower()
    cache_key = f"nps:park:{pc}"
    ttl = 12 * 60 * 60

    if not forceRefresh:
        cached = redis_client.get(cache_key)
        if cached:
            return {**cached, "from_cache": True}

    data = scrape_park_detail(pc)
    redis_client.set(cache_key, data, ttl=ttl)
    data["from_cache"] = False
    return data


@app.get("/api/nps/parks/{park_code}/offline-map")
async def nps_park_offline_map(park_code: str, forceRefresh: bool = Query(False)):
    """
    Choose best PDF from discovered mapAssets and stream it back.
    If no PDF found, return 200 JSON {available:false, reason:'no_pdf_found'}.
    Cached mapAssets (via /api/nps/parks/{parkCode}) for 12h unless forceRefresh=true.
    """
    from backend.nps_scraper import pick_best_pdf

    detail = await nps_park_detail(park_code, forceRefresh=forceRefresh)
    assets = detail.get("mapAssets") or []
    pc = (park_code or "").strip().lower()
    pdf_url = pick_best_pdf(assets, pc)
    if not pdf_url:
        return {"available": False, "reason": "no_pdf_found", "parkCode": pc}

    import requests

    safe_name = _safe_filename(pc)
    filename = f"{safe_name}-offline-map.pdf"
    r = requests.get(pdf_url, stream=True, timeout=20, headers={"User-Agent": "EcoTrails/1.0"}, allow_redirects=True)
    if r.status_code != 200:
        return {"available": False, "reason": "no_pdf_found", "parkCode": pc}

    content_type = (r.headers.get("content-type") or "").lower()
    if "application/pdf" not in content_type:
        return {"available": False, "reason": "no_pdf_found", "parkCode": pc}

    def _iter_bytes():
        for chunk in r.iter_content(chunk_size=1024 * 128):
            if chunk:
                yield chunk

    headers = {"Content-Disposition": f'attachment; filename="{filename}"', "X-Upstream-Url": pdf_url}
    return StreamingResponse(_iter_bytes(), media_type="application/pdf", headers=headers)

@app.get("/api/v1/trails/{trail_id}/navigation")
async def get_trail_navigation(
    trail_id: str,
    db: Session = Depends(get_db)
):
    """
    Get navigation data for starting Google Maps directions to trailhead.
    Returns trailhead coordinates and pre-formatted Google Maps URL.
    """
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    # Get trailhead coordinates from meta_data
    meta = trail.meta_data if isinstance(trail.meta_data, dict) else {}
    trailhead_lat = meta.get('trailhead_lat') or meta.get('lat')
    trailhead_lng = meta.get('trailhead_lng') or meta.get('lng')
    
    # Fallback to place coordinates if trail doesn't have specific coordinates
    if not trailhead_lat and trail.place_id:
        place = db.query(Place).filter(Place.id == trail.place_id).first()
        if place and place.location:
            loc = place.location if isinstance(place.location, dict) else {}
            trailhead_lat = loc.get('lat')
            trailhead_lng = loc.get('lng')
    
    if not trailhead_lat or not trailhead_lng:
        raise HTTPException(status_code=404, detail="Trail coordinates not available")
    
    # Convert to float
    trailhead_lat = float(trailhead_lat)
    trailhead_lng = float(trailhead_lng)
    
    # Generate Google Maps URLs for different platforms
    google_maps_url = f"https://www.google.com/maps/dir/?api=1&destination={trailhead_lat},{trailhead_lng}&travelmode=driving"
    
    return {
        "trail_id": trail_id,
        "trail_name": trail.name,
        "trailhead": {
            "lat": trailhead_lat,
            "lng": trailhead_lng
        },
        "google_maps_url": google_maps_url,
        "parking_notes": meta.get('parking_info'),
        "access_notes": meta.get('access_info'),
        "distance_miles": trail.distance_miles,
        "difficulty": trail.difficulty
    }

@app.get("/api/v1/trails/{trail_id}/route")
async def get_trail_route(
    trail_id: str,
    db: Session = Depends(get_db)
):
    """
    Get trail route GeoJSON for offline map rendering.
    Generates a simulated route if no stored route exists.
    """
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    # Get trail coordinates from meta_data
    meta = trail.meta_data if isinstance(trail.meta_data, dict) else {}
    base_lat = meta.get('trailhead_lat') or meta.get('lat') or meta.get('latitude')
    base_lng = meta.get('trailhead_lng') or meta.get('lng') or meta.get('longitude')
    
    # Get place coordinates as fallback
    if trail.place_id:
        place = db.query(Place).filter(Place.id == trail.place_id).first()
        if place and place.location:
            loc = place.location if isinstance(place.location, dict) else {}
            if base_lat is None and loc.get('lat') is not None:
                base_lat = float(loc.get('lat'))
            if base_lng is None and loc.get('lng') is not None:
                base_lng = float(loc.get('lng'))

    if base_lat is None or base_lng is None:
        raise HTTPException(status_code=404, detail="Trail coordinates not available")
    
    # Generate a simulated trail route (in production, this would come from actual GPS data)
    import random
    import hashlib
    
    # Use trail_id as seed for consistent route generation
    seed = int(hashlib.md5(trail_id.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    
    # Generate route points based on trail distance
    distance_miles = trail.distance_miles or 2.0
    num_points = max(10, int(distance_miles * 20))  # ~20 points per mile
    
    coordinates = []
    current_lat = float(base_lat)
    current_lng = float(base_lng)
    
    for i in range(num_points):
        # Create a winding path
        t = i / (num_points - 1) if num_points > 1 else 0
        
        # Add some randomness but keep it realistic
        lat_offset = rng.uniform(-0.0002, 0.0002) + (t * 0.01 * rng.choice([-1, 1]))
        lng_offset = rng.uniform(-0.0002, 0.0002) + (t * 0.008 * rng.choice([-1, 1]))
        
        current_lat = base_lat + lat_offset
        current_lng = base_lng + lng_offset
        
        coordinates.append([current_lng, current_lat])  # GeoJSON is [lng, lat]
    
    # Calculate bounding box
    lats = [c[1] for c in coordinates]
    lngs = [c[0] for c in coordinates]
    
    route_geojson = {
        "type": "LineString",
        "coordinates": coordinates
    }
    
    return {
        "trailId": trail_id,
        "trailName": trail.name,
        "geojson": route_geojson,
        "bounds": {
            "north": max(lats),
            "south": min(lats),
            "east": max(lngs),
            "west": min(lngs)
        },
        "distance_miles": distance_miles,
        "generated": True  # Indicates this is a simulated route
    }

# ======================================
# ACTIVE HIKE MANAGEMENT
# ======================================

@app.get("/api/v1/hikes/active")
async def get_active_hike(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the user's currently active hike, if any"""
    if not user:
        return {"active_hike": None}
    
    # Find active hike for user
    active_hike = db.query(Hike).filter(
        Hike.user_id == user.id,
        Hike.status == 'active'
    ).order_by(Hike.start_time.desc()).first()
    
    if not active_hike:
        return {"active_hike": None}
    
    # Get trail and place info
    trail = db.query(Trail).filter(Trail.id == active_hike.trail_id).first() if active_hike.trail_id else None
    place = db.query(Place).filter(Place.id == active_hike.place_id).first() if active_hike.place_id else None
    
    return {
        "active_hike": {
            "id": active_hike.id,
            "trail_id": active_hike.trail_id,
            "trail_name": trail.name if trail else None,
            "place_id": active_hike.place_id,
            "place_name": place.name if place else None,
            "status": active_hike.status,
            "start_time": active_hike.start_time.isoformat() if active_hike.start_time else None,
            "meta_data": active_hike.meta_data
        }
    }

# ======================================
# VISION AI ENDPOINTS (Gemini Vision)
# ======================================

class VisionIdentifyRequest(BaseModel):
    image_data: str  # Base64 encoded image
    hike_id: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    context: Optional[str] = "hiking_trail_discovery"

@app.post("/api/v1/vision/identify")
async def identify_image(request: VisionIdentifyRequest):
    """
    Identify species/objects in an image using Gemini Vision AI.
    Used for live camera discovery during hikes.
    """
    from backend.vision_service import vision_service
    
    try:
        result = await vision_service.identify_image(
            image_data=request.image_data,
            location=request.location,
            context=request.context or "hiking_trail_discovery"
        )
        return result
    except Exception as e:
        logger.error(f"[Vision] Identification failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "identification": None
        }

class EnhancedVisionRequest(BaseModel):
    image_data: str
    hike_id: Optional[str] = None
    location: Optional[Dict[str, float]] = None

@app.post("/api/v1/vision/identify-enhanced")
async def vision_identify_enhanced(
    request: EnhancedVisionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced vision identification with multi-agent analysis.
    Uses Observer, Spatial, and Bard agents for comprehensive results.
    """
    from backend.vision_service import vision_service
    
    # Get hike context if provided
    hike_context = {}
    if request.hike_id:
        hike = db.query(Hike).filter(Hike.id == request.hike_id, Hike.user_id == user.id).first()
        if hike:
            hike_meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
            hike_context = {
                'duration_minutes': (datetime.utcnow() - hike.start_time).total_seconds() / 60 if hike.start_time else 0,
                'discoveries_so_far': len(hike_meta.get('discovery_captures', []))
            }
    
    try:
        result = await vision_service.identify_image_enhanced(
            image_data=request.image_data,
            location=request.location,
            hike_context=hike_context
        )
        return result
    except Exception as e:
        logger.error(f"[Vision] Enhanced identification failed: {e}")
        # Fallback to basic identification
        return await vision_service.identify_image(
            image_data=request.image_data,
            location=request.location,
            context="hiking_trail_discovery"
        )

class SpeciesHintsRequest(BaseModel):
    location: Dict[str, float]
    season: Optional[str] = None

@app.post("/api/v1/vision/species-hints")
async def get_species_hints(request: SpeciesHintsRequest):
    """
    Get species hints for a location - used for field guide and quests.
    """
    from backend.vision_service import vision_service
    
    try:
        hints = await vision_service.get_nearby_species_hints(request.location, request.season)
        return {
            "success": True,
            "hints": hints
        }
    except Exception as e:
        logger.error(f"[Vision] Species hints failed: {e}")
        # Return fallback data instead of empty
        return {
            "success": True,
            "hints": [
                {"name": "Oak Tree", "category": "plant", "likelihood": "high", "hint": "Look for lobed leaves", "xp": 20},
                {"name": "Songbird", "category": "bird", "likelihood": "high", "hint": "Listen for melodic calls", "xp": 25},
                {"name": "Wildflower", "category": "plant", "likelihood": "medium", "hint": "Check sunny clearings", "xp": 30},
                {"name": "Deer", "category": "animal", "likelihood": "medium", "hint": "Watch meadows at dawn/dusk", "xp": 45},
                {"name": "Hawk", "category": "bird", "likelihood": "low", "hint": "Scan the sky near ridges", "xp": 65},
            ]
        }

# ======================================
# DYNAMIC ACTIVITY GENERATION
# ======================================

from backend.activity_generation_service import activity_generation_service

@app.post("/api/v1/hikes/{hike_id}/generate-activities")
async def generate_contextual_activities(
    hike_id: str,
    request: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered activities based on current context
    """
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    location = request.get('location', {})
    context = request.get('context', {})
    
    # Enrich context with hike data
    context['hike_duration_minutes'] = (
        (datetime.utcnow() - hike.start_time).total_seconds() / 60
        if hike.start_time else 0
    )
    
    # Get recent discoveries from meta_data
    hike_meta = hike.meta_data if isinstance(hike.meta_data, dict) else {}
    recent_captures = hike_meta.get('discovery_captures', [])
    context['recent_discoveries'] = [
        cap.get('species_name', 'Unknown')
        for cap in recent_captures[-5:]  # Last 5 discoveries
        if isinstance(cap, dict)
    ]
    
    activities = await activity_generation_service.generate_contextual_activities(
        location, context
    )
    
    return {
        "success": True,
        "activities": activities,
        "generated_at": datetime.utcnow().isoformat()
    }

# ======================================
# CHECKPOINT ENDPOINTS
# ======================================

@app.get("/api/v1/trails/{trail_id}/checkpoints")
async def get_trail_checkpoints(
    trail_id: str,
    db: Session = Depends(get_db)
):
    """Get all checkpoints for a trail"""
    checkpoints = db.query(TrailCheckpoint).filter(
        TrailCheckpoint.trail_id == trail_id
    ).order_by(TrailCheckpoint.sequence_order).all()
    
    return {
        "trail_id": trail_id,
        "checkpoints": [
            {
                "id": cp.id,
                "name": cp.name,
                "description": cp.description,
                "sequence": cp.sequence_order,
                "location": cp.location,
                "distance_from_start_meters": cp.distance_from_start_meters,
                "elevation_feet": cp.elevation_feet,
                "activities": cp.activities or [],
                "photo_url": cp.photo_url,
                "difficulty_rating": cp.difficulty_rating,
                "estimated_time_minutes": cp.estimated_time_minutes
            }
            for cp in checkpoints
        ]
    }

@app.post("/api/v1/hikes/{hike_id}/checkpoints/{checkpoint_id}/reach")
async def reach_checkpoint(
    hike_id: str,
    checkpoint_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark checkpoint as reached"""
    # Verify hike exists and belongs to user
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Get or create progress record
    progress = db.query(HikeCheckpointProgress).filter(
        HikeCheckpointProgress.hike_id == hike_id,
        HikeCheckpointProgress.checkpoint_id == checkpoint_id
    ).first()
    
    if not progress:
        progress = HikeCheckpointProgress(
            id=str(uuid.uuid4()),
            hike_id=hike_id,
            checkpoint_id=checkpoint_id,
            reached_at=datetime.utcnow(),
            activities_completed=[],
            xp_earned=0,
            photos_taken=[]
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return {
        "success": True,
        "checkpoint_progress": {
            "checkpoint_id": checkpoint_id,
            "reached_at": progress.reached_at.isoformat() if progress.reached_at else None,
            "activities_completed": progress.activities_completed or [],
            "xp_earned": progress.xp_earned
        }
    }

@app.post("/api/v1/hikes/{hike_id}/checkpoints/{checkpoint_id}/complete-activity")
async def complete_checkpoint_activity(
    hike_id: str,
    checkpoint_id: str,
    request: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark checkpoint activity as completed"""
    activity_id = request.get('activity_id')
    proof = request.get('proof', {})  # Photo URL, answer, etc.
    
    if not activity_id:
        raise HTTPException(status_code=400, detail="activity_id required")
    
    # Verify hike exists and belongs to user
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    # Get or create progress record
    progress = db.query(HikeCheckpointProgress).filter(
        HikeCheckpointProgress.hike_id == hike_id,
        HikeCheckpointProgress.checkpoint_id == checkpoint_id
    ).first()
    
    if not progress:
        progress = HikeCheckpointProgress(
            id=str(uuid.uuid4()),
            hike_id=hike_id,
            checkpoint_id=checkpoint_id,
            reached_at=datetime.utcnow(),
            activities_completed=[],
            xp_earned=0,
            photos_taken=[]
        )
        db.add(progress)
    
    # Add completed activity
    completed = progress.activities_completed or []
    if activity_id not in completed:
        completed.append(activity_id)
        progress.activities_completed = completed
        
        # Award XP
        checkpoint = db.query(TrailCheckpoint).get(checkpoint_id)
        if checkpoint and checkpoint.activities:
            activity = next((a for a in checkpoint.activities if a.get('id') == activity_id), None)
            if activity:
                progress.xp_earned += activity.get('xp', 0)
        
        # Store photo if provided
        if proof.get('photo_url'):
            photos = progress.photos_taken or []
            photos.append(proof['photo_url'])
            progress.photos_taken = photos
        
        progress.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(progress)
    
    return {
        "success": True,
        "checkpoint_progress": {
            "checkpoint_id": checkpoint_id,
            "activities_completed": progress.activities_completed,
            "xp_earned": progress.xp_earned
        }
    }

@app.get("/api/v1/hikes/{hike_id}/checkpoint-progress")
async def get_hike_checkpoint_progress(
    hike_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all checkpoint progress for a hike"""
    # Verify hike exists and belongs to user
    hike = db.query(Hike).filter(Hike.id == hike_id, Hike.user_id == user.id).first()
    if not hike:
        raise HTTPException(status_code=404, detail="Hike not found")
    
    progress_records = db.query(HikeCheckpointProgress).filter(
        HikeCheckpointProgress.hike_id == hike_id
    ).all()
    
    return {
        "hike_id": hike_id,
        "progress": [
            {
                "checkpoint_id": p.checkpoint_id,
                "reached_at": p.reached_at.isoformat() if p.reached_at else None,
                "activities_completed": p.activities_completed or [],
                "xp_earned": p.xp_earned,
                "photos_taken": p.photos_taken or []
            }
            for p in progress_records
        ],
        "total_xp": sum(p.xp_earned for p in progress_records),
        "total_checkpoints_reached": len(progress_records)
    }

# ======================================
# SOCIAL / COMMUNITY ENDPOINTS
# ======================================

class CreatePostRequest(BaseModel):
    content: str
    post_type: str = "experience"  # experience, discovery, plan, tip, photo
    hike_id: Optional[str] = None
    place_id: Optional[str] = None
    media_urls: Optional[List[str]] = None
    location: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class CreateCommentRequest(BaseModel):
    content: str

@app.get("/api/v1/community/feed")
async def get_community_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    post_type: Optional[str] = Query(None),
    place_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get the community feed"""
    from backend.social_service import get_feed
    posts = get_feed(db, limit=limit, offset=offset, post_type=post_type, place_id=place_id)
    return {"posts": posts, "count": len(posts)}

@app.post("/api/v1/community/posts")
async def create_community_post(
    request: CreatePostRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new community post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    from backend.social_service import create_post
    post = create_post(
        db,
        user_id=user.id,
        content=request.content,
        post_type=request.post_type,
        hike_id=request.hike_id,
        place_id=request.place_id,
        media_urls=request.media_urls,
        location=request.location,
        tags=request.tags,
    )
    return {"post_id": post.id, "created_at": post.created_at.isoformat()}

@app.get("/api/v1/community/posts/{post_id}")
async def get_community_post(
    post_id: str,
    db: Session = Depends(get_db),
):
    """Get a single post with comments"""
    from backend.social_service import get_post
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@app.post("/api/v1/community/posts/{post_id}/comments")
async def add_post_comment(
    post_id: str,
    request: CreateCommentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to a post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    from backend.social_service import add_comment
    comment = add_comment(db, post_id=post_id, user_id=user.id, content=request.content)
    return {
        "comment_id": comment.id,
        "created_at": comment.created_at.isoformat(),
    }

@app.post("/api/v1/community/posts/{post_id}/like")
async def toggle_post_like(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle like on a post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    from backend.social_service import toggle_like
    result = toggle_like(db, post_id=post_id, user_id=user.id)
    return result

@app.get("/api/v1/community/posts/{post_id}/liked")
async def check_post_liked(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if user has liked a post"""
    if not user:
        return {"liked": False}
    from backend.social_service import check_liked
    return {"liked": check_liked(db, post_id=post_id, user_id=user.id)}

@app.delete("/api/v1/community/posts/{post_id}")
async def delete_community_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a post (author only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    from backend.social_service import delete_post
    success = delete_post(db, post_id=post_id, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found or you are not the author")
    return {"deleted": True}

@app.get("/api/v1/community/users/{user_id}/posts")
async def get_user_community_posts(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get posts by a specific user"""
    from backend.social_service import get_user_posts
    posts = get_user_posts(db, user_id=user_id, limit=limit, offset=offset)
    return {"posts": posts, "count": len(posts)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
