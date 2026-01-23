
import os
import json
import base64
import logging
import asyncio
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
