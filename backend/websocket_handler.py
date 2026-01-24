"""
WebSocket handlers for real-time EcoDroid device communication
"""
import os
import json
import base64
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.realtime_processor import RealtimeProcessor
from backend.models import HikeSession, RealtimeObservation, EcoDroidDevice
from backend.redis_client import redis_client
from datetime import datetime
import uuid

logger = logging.getLogger("EcoAtlas.WebSocket")


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # session_id -> websocket
        self.device_connections: Dict[str, str] = {}  # device_id -> session_id
        api_key = os.environ.get("API_KEY")
        self.processor = RealtimeProcessor(api_key=api_key) if api_key else None
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")
    
    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")
    
    async def send_personal_message(self, message: Dict[str, Any], session_id: str):
        """Send message to specific session"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {str(e)}")
                self.disconnect(session_id)
    
    async def broadcast_observation(self, session_id: str, observation: Dict[str, Any]):
        """Broadcast observation to connected clients"""
        await self.send_personal_message({
            'type': 'observation',
            'data': observation
        }, session_id)
    
    async def send_wearable_alert(self, user_id: str, alert: Dict[str, Any]):
        """Send alert that should be forwarded to wearables"""
        # Queue alert in Redis for wearable devices
        queue_key = f"wearable_alerts:{user_id}"
        redis_client.push_queue(queue_key, alert)
        
        # Also send to active WebSocket connections
        # Find active sessions for user
        # In production, maintain user_id -> session_id mapping
        await self.send_personal_message({
            'type': 'wearable_alert',
            'data': alert
        }, user_id)  # Simplified - should use proper session lookup


manager = ConnectionManager()


async def handle_ecodroid_stream(
    websocket: WebSocket,
    device_id: str,
    session_id: str,
    db: Session
):
    """Handle WebSocket stream from EcoDroid device"""
    await manager.connect(websocket, session_id)
    
    # Update device status
    device = db.query(EcoDroidDevice).filter(EcoDroidDevice.id == device_id).first()
    if device:
        device.status = 'streaming'
        device.last_seen = datetime.utcnow()
        db.commit()
    
    # Get or create session
    session = db.query(HikeSession).filter(HikeSession.id == session_id).first()
    if not session:
        session = HikeSession(
            id=session_id,
            user_id="default_user",  # Should come from auth
            park_name="Unknown",
            device_id=device_id,
            status='active'
        )
        db.add(session)
        db.commit()
    
    try:
        while True:
            # Receive data from device
            data = await websocket.receive_json()
            
            message_type = data.get('type')
            timestamp = data.get('timestamp', int(datetime.utcnow().timestamp() * 1000))
            
            if message_type == 'video_frame':
                # Process video frame
                frame_b64 = data.get('frame')
                gps = data.get('gps')
                
                if frame_b64 and manager.processor:
                    observation_result = await manager.processor.process_frame_stream(
                        session_id=session_id,
                        frame_b64=frame_b64,
                        timestamp=timestamp,
                        gps=gps
                    )
                    
                    if observation_result:
                        # Save to database
                        obs = RealtimeObservation(
                            id=str(uuid.uuid4()),
                            session_id=session_id,
                            timestamp=datetime.fromtimestamp(timestamp / 1000),
                            observation_type='visual',
                            location=gps,
                            raw_data={'frame_size': len(frame_b64)},
                            ai_analysis=observation_result,
                            confidence=0.8 if observation_result.get('confidence') == 'High' else 0.5
                        )
                        db.add(obs)
                        db.commit()
                        
                        # Broadcast to connected clients
                        await manager.broadcast_observation(session_id, observation_result)
            
            elif message_type == 'audio_chunk':
                # Process audio chunk
                audio_b64 = data.get('audio')
                gps = data.get('gps')
                
                if audio_b64 and manager.processor:
                    audio_data = base64.b64decode(audio_b64)
                    acoustic_result = await manager.processor.process_audio_stream(
                        session_id=session_id,
                        audio_data=audio_data,
                        timestamp=timestamp,
                        gps=gps
                    )
                    
                    if acoustic_result:
                        # Save to database
                        obs = RealtimeObservation(
                            id=str(uuid.uuid4()),
                            session_id=session_id,
                            timestamp=datetime.fromtimestamp(timestamp / 1000),
                            observation_type='acoustic',
                            location=gps,
                            raw_data={'audio_size': len(audio_data)},
                            ai_analysis=acoustic_result,
                            confidence=0.7
                        )
                        db.add(obs)
                        db.commit()
                        
                        # Broadcast observation
                        await manager.broadcast_observation(session_id, acoustic_result)
                        
                        # Send wearable alert if water detected
                        if acoustic_result.get('water_detected') and acoustic_result.get('alert'):
                            await manager.send_wearable_alert(
                                session.user_id,
                                acoustic_result['alert']
                            )
            
            elif message_type == 'telemetry':
                # Process sensor telemetry
                telemetry_data = data.get('data', {})
                
                if manager.processor:
                    telemetry_result = await manager.processor.process_telemetry_stream(
                        session_id=session_id,
                        telemetry=telemetry_data,
                        timestamp=timestamp
                    )
                else:
                    telemetry_result = None
                
                if telemetry_result:
                    # Save to database
                    obs = RealtimeObservation(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        timestamp=datetime.fromtimestamp(timestamp / 1000),
                        observation_type='sensor',
                        location=telemetry_data.get('gps'),
                        raw_data=telemetry_data,
                        ai_analysis=telemetry_result,
                        confidence=0.6
                    )
                    db.add(obs)
                    db.commit()
                    
                    # Broadcast if significant event
                    if telemetry_result.get('type') == 'telemetry_event':
                        await manager.broadcast_observation(session_id, telemetry_result)
            
            elif message_type == 'heartbeat':
                # Device heartbeat - update last_seen
                if device:
                    device.last_seen = datetime.utcnow()
                    db.commit()
                
                # Send acknowledgment
                await websocket.send_json({'type': 'heartbeat_ack', 'timestamp': timestamp})
            
            elif message_type == 'session_end':
                # End of session
                session.status = 'completed'
                session.end_time = datetime.utcnow()
                db.commit()
                
                if device:
                    device.status = 'online'
                    db.commit()
                
                await websocket.send_json({'type': 'session_ended', 'session_id': session_id})
                break
                
    except WebSocketDisconnect:
        logger.info(f"Device {device_id} disconnected")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {str(e)}")
    finally:
        manager.disconnect(session_id)
        if device:
            device.status = 'online'
            db.commit()
        if manager.processor:
            manager.processor.clear_session(session_id)
