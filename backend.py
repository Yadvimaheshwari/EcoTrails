
import os
import json
import base64
import logging
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

import google.generativeai as genai

# --- CONFIGURATION ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EcoAtlas")

# The API key is assumed to be in the environment
genai.configure(api_key=os.environ.get("API_KEY"))

# --- DATA MODELS ---

class ConfidenceLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class UncertaintyMetadata(BaseModel):
    confidence: ConfidenceLevel
    uncertainty_explanation: str = Field(..., description="Why confidence is limited (e.g., lighting, noise).")
    improvement_suggestion: str = Field(..., description="How to get better data next time.")

class PerceptionResult(UncertaintyMetadata):
    environmental_signals: List[Dict[str, str]]
    patterns: List[str]

class AcousticResult(UncertaintyMetadata):
    soundscape_summary: str
    activity_levels: Dict[str, str]
    notable_changes: str

class TemporalResult(UncertaintyMetadata):
    detected_changes: List[Dict[str, Any]]
    seasonal_alignment: str
    historical_summary: str

class ExperienceResult(UncertaintyMetadata):
    trail_difficulty: str
    fatigue_zones: List[str]
    safety_notes: List[str]
    beginner_tips: List[str]

class NarrationResult(BaseModel):
    overview: str
    revelations: str
    changes: str
    future_notes: str

class VerificationResult(BaseModel):
    is_verified: bool
    audit_notes: str
    unresolved_questions: List[str]

# --- AGENT ABSTRACTION ---

class BaseEcoAgent:
    """Abstract Base for EcoAtlas Intelligence Modules."""
    def __init__(self, name: str, model_name: str, role: str):
        self.name = name
        self.model_name = model_name
        self.role = role
        self.system_instruction = ""

    def _get_model(self):
        return genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.system_instruction
        )

    async def execute(self, prompt: str, media: Optional[Dict] = None) -> Any:
        model = self._get_model()
        contents = [prompt]
        if media:
            contents.append({"mime_type": media["mime_type"], "data": media["data"]})
        
        # Using structured output where possible
        response = model.generate_content(
            contents,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)

# --- SPECIALIZED AGENTS ---

class ObserverAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Observer", "gemini-3-pro-preview", "Perception Specialist")
        self.system_instruction = (
            "You are the EcoAtlas Observer. Identify raw environmental signals. "
            "Never speculate. If a signal is blurry or ambiguous, label confidence as Low. "
            "Suggest how the hiker can provide better visual context next time."
        )

class ListenerAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Listener", "gemini-2.5-flash-native-audio-preview-12-2025", "Acoustic Specialist")
        self.system_instruction = (
            "You are the EcoAtlas Listener. Analyze ambient soundscapes. "
            "Distinguish between natural bio-activity and human noise. "
            "Qualified findings based on recording clarity."
        )

class HistorianAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Historian", "gemini-3-pro-preview", "Temporal Specialist")
        self.system_instruction = (
            "You are the EcoAtlas Historian. Detect changes by comparing current state to history. "
            "Clearly state if changes appear seasonal or represent true terrain shifts."
        )

class SynthesizerAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Synthesizer", "gemini-3-pro-preview", "Experience Analyst")
        self.system_instruction = (
            "You are the EcoAtlas Synthesizer. Map environmental data to human hiking effort. "
            "Incorporate fatigue, terrain difficulty, and beginner safety tips."
        )

class AuditorAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Auditor", "gemini-3-flash-preview", "Verification Specialist")
        self.system_instruction = (
            "You are the EcoAtlas Auditor. Cross-validate signals from all other agents. "
            "Flag any speculation that is being presented as fact. Force transparency."
        )

class BardAgent(BaseEcoAgent):
    def __init__(self):
        super().__init__("Bard", "gemini-3-pro-preview", "Narrative Architect")
        self.system_instruction = (
            "You are the EcoAtlas Bard. Translate verified insights into a warm, reflective narrative. "
            "Tone: Warm, reflective, nature-first, non-technical. Use plain language. "
            "Structure: 1. Overview of the walk. 2. Environmental revelations. 3. Changes since last time. 4. Next visit notes. "
            "Length: 150-250 words. Avoid scientific jargon."
        )

# --- ORCHESTRATOR (THE CREW) ---

class EcoAtlasCrew:
    """Coordinates Agent-to-Agent handoffs and final synthesis."""
    def __init__(self, history: List[Dict[str, Any]]):
        self.history = history
        self.observer = ObserverAgent()
        self.listener = ListenerAgent()
        self.historian = HistorianAgent()
        self.synthesizer = SynthesizerAgent()
        self.auditor = AuditorAgent()
        self.bard = BardAgent()

    async def analyze(self, image_data: bytes, audio_data: Optional[bytes] = None) -> Dict[str, Any]:
        # Process Visuals
        visual_media = {"mime_type": "image/jpeg", "data": image_data}
        perception = await self.observer.execute(
            "Identify the dominant environmental signals in this frame.", 
            visual_media
        )

        # Process Audio if available
        acoustic = None
        if audio_data:
            audio_media = {"mime_type": "audio/pcm;rate=16000", "data": audio_data}
            acoustic = await self.listener.execute(
                "Describe the soundscape. Identify birds, wind, and water.", 
                audio_media
            )

        # Temporal Check
        temporal = await self.historian.execute(
            f"Compare current state to history: {json.dumps(self.history)}. "
            f"Current signals: {json.dumps(perception)}",
            visual_media
        )

        # Human Experience Synthesis
        experience = await self.synthesizer.execute(
            f"Based on perception: {json.dumps(perception)} and sound: {json.dumps(acoustic)}, "
            "infer trail difficulty and safety notes."
        )

        # Audit for Truth
        verification = await self.auditor.execute(
            f"Cross-validate: {json.dumps({'p': perception, 'a': acoustic, 't': temporal})}"
        )

        # Final Storytelling
        narrative = await self.bard.execute(
            f"Tell the story of this walk using these verified facts: {json.dumps(verification)}"
        )

        return {
            "perception": perception,
            "acoustic": acoustic,
            "temporal": temporal,
            "experience": experience,
            "verification": verification,
            "narrative": narrative,
            "timestamp": "now",
        }

# --- FASTAPI APP ---

app = FastAPI(title="EcoAtlas Intelligence Core")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/api/v1/synthesis")
async def run_synthesis(
    image: UploadFile = File(...),
    audio: Optional[UploadFile] = File(None),
    history_json: str = Form("[]")
):
    try:
        image_bytes = await image.read()
        audio_bytes = await audio.read() if audio else None
        history = json.loads(history_json)

        crew = EcoAtlasCrew(history)
        results = await crew.analyze(image_bytes, audio_bytes)
        
        return {"status": "success", "data": results}
    except Exception as e:
        logger.error(f"Synthesis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Nature is complex; sensing failed.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
