
import os
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
    EcoDroidDevice, WearableDevice, WearableAlert
)
from backend.realtime_processor import RealtimeProcessor
from pydantic import BaseModel as PydanticBaseModel
from typing import Optional
import uuid
from datetime import datetime
from google import genai
from google.genai import types

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

client = genai.Client(api_key=os.environ.get("API_KEY"), http_options={'api_version': 'v1alpha'})

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
