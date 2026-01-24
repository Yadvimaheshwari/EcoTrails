"""
Real-time AI processing pipeline for EcoDroid device streams
"""
import asyncio
import base64
import json
import logging
from collections import deque
from typing import Dict, Any, Optional, List
from datetime import datetime
from google import genai
from google.genai import types
from backend.agents import EcoAtlasAgents, ATLAS_SYSTEM_INSTRUCTION

logger = logging.getLogger("EcoAtlas.RealtimeProcessor")

# Real-time observation schemas
REALTIME_OBSERVATION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "observation": {"type": "STRING", "description": "Brief one-sentence environmental observation"},
        "detected_features": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Detected features: vegetation, water, terrain, etc."
        },
        "confidence": {"type": "STRING", "enum": ["Low", "Medium", "High"]}
    },
    "required": ["observation", "detected_features", "confidence"]
}

REALTIME_ACOUSTIC_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING", "description": "Brief soundscape description"},
        "detected_sounds": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Detected sounds: water, birds, wind, etc."
        },
        "proximity_estimate": {"type": "STRING", "description": "Estimated distance to sound sources"}
    },
    "required": ["summary", "detected_sounds"]
}


class RealtimeProcessor:
    """Processes real-time streams from EcoDroid device"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.agents = EcoAtlasAgents(api_key=api_key)
        self.api_key = api_key
        self.context_buffers: Dict[str, Dict[str, deque]] = {}  # session_id -> buffer
        
    def _get_buffer(self, session_id: str) -> Dict[str, deque]:
        """Get or create context buffer for session"""
        if session_id not in self.context_buffers:
            self.context_buffers[session_id] = {
                'recent_frames': deque(maxlen=30),  # Last 30 frames
                'recent_audio': deque(maxlen=10),   # Last 10 audio chunks
                'location_history': deque(maxlen=100),  # Last 100 GPS points
                'environmental_state': {}
            }
        return self.context_buffers[session_id]
    
    async def process_frame_stream(
        self, 
        session_id: str,
        frame_b64: str, 
        timestamp: int, 
        gps: Optional[Dict[str, float]] = None
    ) -> Optional[Dict[str, Any]]:
        """Process video frame in real-time (every 5 seconds)"""
        buffer = self._get_buffer(session_id)
        
        # Only process every 5 seconds to reduce load
        if timestamp % 5000 >= 100:
            return None
        
        try:
            # Decode frame
            frame_data = base64.b64decode(frame_b64)
            
            # Create media part
            media_part = types.Part.from_bytes(
                data=frame_data,
                mime_type="image/jpeg"
            )
            
            # Get location context
            location_context = ""
            if gps:
                location_context = f"Location: {gps.get('lat', 0)}, {gps.get('lng', 0)}, Altitude: {gps.get('altitude', 0)}m"
                buffer['location_history'].append(gps)
            
            # Process with Observer agent
            perception = await self.agents.observer.execute(
                "TASK: Real-time environmental observation\n"
                "GOAL: Identify current environment in one brief sentence.\n"
                "Focus on: vegetation types, water bodies, terrain characteristics.\n"
                "Be concise and observational.",
                context=location_context,
                media_parts=[media_part],
                response_schema=REALTIME_OBSERVATION_SCHEMA
            )
            
            # Store in buffer
            buffer['recent_frames'].append({
                'timestamp': timestamp,
                'observation': perception,
                'location': gps
            })
            
            # Update environmental state
            if perception.get('detected_features'):
                buffer['environmental_state']['current_features'] = perception['detected_features']
            
            logger.info(f"Real-time observation: {perception.get('observation', '')[:50]}")
            
            return {
                'type': 'environmental_observation',
                'observation': perception.get('observation', ''),
                'features': perception.get('detected_features', []),
                'confidence': perception.get('confidence', 'Medium'),
                'location': gps,
                'timestamp': timestamp
            }
            
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            return None
    
    async def process_audio_stream(
        self,
        session_id: str,
        audio_data: bytes,
        timestamp: int,
        gps: Optional[Dict[str, float]] = None
    ) -> Optional[Dict[str, Any]]:
        """Process audio chunk in real-time (every 10 seconds)"""
        buffer = self._get_buffer(session_id)
        
        # Only process every 10 seconds
        if timestamp % 10000 >= 100:
            return None
        
        try:
            # Create media part for audio
            media_part = types.Part.from_bytes(
                data=audio_data,
                mime_type="audio/webm"  # Adjust based on actual format
            )
            
            # Process with Listener agent
            acoustic = await self.agents.listener.execute(
                "TASK: Real-time soundscape analysis\n"
                "GOAL: Identify environmental sounds in brief description.\n"
                "Detect: water sounds, bird calls, wind patterns, animal sounds.\n"
                "Be concise.",
                context=f"Location: {gps if gps else 'unknown'}",
                media_parts=[media_part],
                response_schema=REALTIME_ACOUSTIC_SCHEMA
            )
            
            # Store in buffer
            buffer['recent_audio'].append({
                'timestamp': timestamp,
                'analysis': acoustic,
                'location': gps
            })
            
            # Check for water detection (important for alerts)
            summary_lower = acoustic.get('summary', '').lower()
            detected_sounds = acoustic.get('detected_sounds', [])
            
            water_detected = any(
                'water' in sound.lower() or 'stream' in sound.lower() or 'river' in sound.lower()
                for sound in detected_sounds
            ) or 'water' in summary_lower
            
            result = {
                'type': 'acoustic_observation',
                'summary': acoustic.get('summary', ''),
                'sounds': acoustic.get('detected_sounds', []),
                'proximity': acoustic.get('proximity_estimate', ''),
                'water_detected': water_detected,
                'location': gps,
                'timestamp': timestamp
            }
            
            # Trigger wearable alert if water detected
            if water_detected:
                result['alert'] = {
                    'type': 'environmental_feature',
                    'message': 'Water feature detected nearby',
                    'vibration': 'gentle',
                    'priority': 'medium'
                }
            
            logger.info(f"Real-time acoustic: {acoustic.get('summary', '')[:50]}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            return None
    
    async def process_telemetry_stream(
        self,
        session_id: str,
        telemetry: Dict[str, Any],
        timestamp: int
    ) -> Optional[Dict[str, Any]]:
        """Process sensor telemetry in real-time"""
        buffer = self._get_buffer(session_id)
        
        try:
            # Store location
            if 'lat' in telemetry and 'lng' in telemetry:
                gps_point = {
                    'lat': telemetry['lat'],
                    'lng': telemetry['lng'],
                    'altitude': telemetry.get('altitude', 0),
                    'timestamp': timestamp
                }
                buffer['location_history'].append(gps_point)
            
            # Process with Telemetry agent for significant events
            if len(buffer['location_history']) % 10 == 0:  # Every 10th point
                events = await self.agents.telemetry.execute(
                    "TASK: Identify significant movement or environmental events\n"
                    "GOAL: Detect elevation changes, pace changes, or environmental transitions.",
                    context=f"Recent telemetry: {json.dumps(list(buffer['location_history'])[-10:])}",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "events": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": {"type": "STRING"},
                                        "description": {"type": "STRING"},
                                        "severity": {"type": "STRING", "enum": ["low", "medium", "high"]}
                                    }
                                }
                            }
                        }
                    }
                )
                
                if events.get('events'):
                    return {
                        'type': 'telemetry_event',
                        'events': events['events'],
                        'telemetry': telemetry,
                        'timestamp': timestamp
                    }
            
            return {
                'type': 'telemetry_update',
                'telemetry': telemetry,
                'timestamp': timestamp
            }
            
        except Exception as e:
            logger.error(f"Error processing telemetry: {str(e)}")
            return None
    
    def get_session_context(self, session_id: str) -> Dict[str, Any]:
        """Get current context for a session"""
        buffer = self._get_buffer(session_id)
        return {
            'recent_observations': list(buffer['recent_frames'])[-5:],
            'recent_audio': list(buffer['recent_audio'])[-3:],
            'location_history': list(buffer['location_history'])[-20:],
            'environmental_state': buffer['environmental_state']
        }
    
    def clear_session(self, session_id: str):
        """Clear context buffer for completed session"""
        if session_id in self.context_buffers:
            del self.context_buffers[session_id]
