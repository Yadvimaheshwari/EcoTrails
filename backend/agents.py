"""
AI Agent definitions for EcoAtlas
"""
import os
import json
import logging
import asyncio
from typing import List, Any, Optional
from google import genai
from google.genai import types

logger = logging.getLogger("EcoAtlas.Agents")

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

class Agent:
    def __init__(self, name: str, role: str, goal: str, backstory: str, model_name: str = "gemini-3-pro-preview", tools: List[Any] = None, api_key: Optional[str] = None):
        self.name = name
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.model_name = model_name
        self.tools = tools
        self.api_key = api_key if api_key else os.environ.get("API_KEY")

    async def execute(self, task_description: str, context: str = "", media_parts: List[Any] = None, response_schema: Any = None) -> Any:
        logger.info(f"Atlas // Agent {self.name} processing task...")
        
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
            if not self.api_key:
                raise ValueError("API_KEY not set for Gemini client.")
            api_client = genai.Client(api_key=self.api_key)
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

class EcoAtlasAgents:
    """Registry of AI agents for environmental analysis"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    @property
    def telemetry(self) -> Agent:
        return Agent(
            "Telemetry", 
            "Sensor Processing Specialist", 
            "Identify meaningful environmental or movement events from passive sensor data.", 
            "A technician focused on decoding the rhythm of the trail through data.",
            "gemini-3-flash-preview",
            api_key=self.api_key
        )

    @property
    def observer(self) -> Agent:
        return Agent(
            "Observer", 
            "Perception Specialist", 
            "Infer environmental characteristics from visual data without identifying objects or people.", 
            "Expert field biologist focused on subtle ecological shifts and visual patterns.",
            api_key=self.api_key
        )

    @property
    def listener(self) -> Agent:
        return Agent(
            "Listener",
            "Acoustic Specialist",
            "Infer environmental soundscape characteristics from ambient audio.",
            "A soundscape ecologist who understands the subtle language of natural frequencies.",
            "gemini-2.5-flash-native-audio-preview-12-2025",
            api_key=self.api_key
        )
    
    @property
    def fusionist(self) -> Agent:
        return Agent(
            "Fusionist",
            "Perspective Integration Specialist",
            "Compare large-scale environmental patterns with on-ground observations.",
            "A specialized cartographer who bridges the gap between high-altitude orbital imagery and ground-level field observations.",
            "gemini-3-pro-preview",
            api_key=self.api_key
        )

    @property
    def spatial(self) -> Agent:
        return Agent(
            "Spatial", 
            "Geospatial Grounding Specialist", 
            "Verify landmarks and terrain features.", 
            "Master cartographer with deep knowledge of global trails.", 
            "gemini-2.5-flash", 
            tools=[types.Tool(google_maps=types.GoogleMaps())],
            api_key=self.api_key
        )

    @property
    def historian(self) -> Agent:
        return Agent(
            "Historian", 
            "Temporal Specialist", 
            "Identify long-term environmental patterns by comparing current observations with historical records.", 
            "A patient archivist of the natural world, noticing the slow drift of seasons and the gradual reshaping of landscapes.",
            "gemini-3-pro-preview",
            api_key=self.api_key
        )

    @property
    def bard(self) -> Agent:
        return Agent(
            "Bard", 
            "Narrative Architect", 
            "Create a coherent environmental narrative synthesizing all multimodal inputs.", 
            "Nature poet who translates complex ecological signals into reflective, calm human insight.",
            "gemini-3-pro-preview",
            api_key=self.api_key
        )
