# EcoAtlas Production Setup Guide

## Overview

EcoAtlas is now a production-ready environmental intelligence system with:
- Real-time hardware device integration (EcoDroid Mini)
- Mobile app (React Native)
- Wearable device support (Apple Watch, Wear OS)
- Cloud intelligence layer
- Multi-agent AI system

## Architecture

```
┌─────────────────┐
│  EcoDroid Mini  │ (Hardware: Camera, Mic, GPS, IMU, Sensors)
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│   Mobile App    │ (React Native: Navigation, UI, Device Bridge)
└────┬────────┬───┘
     │        │
     │        └──► Apple Watch / Wear OS (Alerts, Notifications)
     │
     ▼
┌─────────────────┐
│  Backend API    │ (FastAPI: WebSocket, REST, AI Processing)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloud Services  │ (Satellite Imagery, Environmental DB, Memory)
└─────────────────┘
```

## Quick Start

### 1. Backend Setup

```bash
cd EcoTrails

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Initialize database
python3 -c "from backend.database import init_db; init_db()"

# Start backend server
./start_backend.sh
# Or manually:
# .venv/bin/uvicorn backend:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- WebSocket: ws://localhost:8000/ws/ecodroid/{device_id}

### 2. Frontend Setup

```bash
cd EcoTrails

# Install dependencies
npm install

# Set up environment
# Create .env.local with:
# VITE_GEMINI_API_KEY=your_api_key_here

# Start dev server
npm run dev
```

Frontend will be available at: http://localhost:3000

### 3. Mobile App Setup

```bash
cd EcoTrails/mobile-app

# Install dependencies
npm install

# For iOS
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
```

## API Endpoints

### Session Management
- `POST /api/v1/sessions` - Create new hike session
- `GET /api/v1/sessions/{session_id}` - Get session details
- `POST /api/v1/sessions/{session_id}/end` - End session
- `GET /api/v1/sessions/{session_id}/observations` - Get real-time observations
- `GET /api/v1/sessions/{session_id}/context` - Get session context

### Device Management
- `POST /api/v1/devices/ecodroid` - Register EcoDroid device
- `GET /api/v1/devices/ecodroid/{device_id}` - Get device status

### Wearable Integration
- `POST /api/v1/wearables/alert` - Queue alert for wearable
- `GET /api/v1/wearables/alerts/{user_id}` - Get pending alerts

### Analysis
- `POST /api/v1/synthesis` - Post-hike environmental synthesis (existing)

### WebSocket
- `WS /ws/ecodroid/{device_id}?session_id={session_id}` - Real-time device streaming

## WebSocket Protocol

### Device → Backend Messages

**Video Frame:**
```json
{
  "type": "video_frame",
  "timestamp": 1234567890,
  "frame": "base64_encoded_image",
  "gps": {"lat": 37.7749, "lng": -122.4194, "altitude": 1240}
}
```

**Audio Chunk:**
```json
{
  "type": "audio_chunk",
  "timestamp": 1234567890,
  "audio": "base64_encoded_audio",
  "gps": {"lat": 37.7749, "lng": -122.4194}
}
```

**Telemetry:**
```json
{
  "type": "telemetry",
  "timestamp": 1234567890,
  "data": {
    "heart_rate": 72,
    "altitude": 1240,
    "pressure": 1013,
    "lat": 37.7749,
    "lng": -122.4194,
    "imu": {"acceleration": [0, 0, 9.8], "gyro": [0, 0, 0]},
    "temperature": 20,
    "airQuality": 85
  }
}
```

**Heartbeat:**
```json
{
  "type": "heartbeat",
  "timestamp": 1234567890
}
```

**Session End:**
```json
{
  "type": "session_end",
  "timestamp": 1234567890
}
```

### Backend → Client Messages

**Observation:**
```json
{
  "type": "observation",
  "data": {
    "type": "environmental_observation",
    "observation": "Walking through mixed conifer forest",
    "features": ["conifer_forest", "dense_vegetation"],
    "confidence": "High",
    "location": {"lat": 37.7749, "lng": -122.4194},
    "timestamp": 1234567890
  }
}
```

**Wearable Alert:**
```json
{
  "type": "wearable_alert",
  "data": {
    "type": "environmental_feature",
    "message": "Water feature detected nearby",
    "vibration": "gentle",
    "priority": "medium"
  }
}
```

## Database Schema

### Tables
- `hike_sessions` - Active and completed hike sessions
- `realtime_observations` - Real-time observations during hikes
- `environmental_records` - Final environmental analysis records
- `ecodroid_devices` - Registered EcoDroid hardware devices
- `wearable_devices` - Connected wearable devices
- `wearable_alerts` - Queued alerts for wearables

## Mobile App Services

### EcoDroidService
- `connect(deviceId, sessionId)` - Connect to device
- `sendVideoFrame(frameBase64, gps)` - Send video frame
- `sendAudioChunk(audioBase64, gps)` - Send audio chunk
- `sendTelemetry(telemetry)` - Send sensor data
- `onObservation(callback)` - Receive observations
- `endSession()` - End session and disconnect

### WearableService
- `initialize()` - Initialize wearable connection
- `sendAlert(alert)` - Send alert to wearable
- `sendVibration(pattern)` - Send vibration pattern
- `sendStatus(status)` - Send status update
- `onInteraction(callback)` - Handle wearable interactions

## Production Deployment

### Backend
1. Use PostgreSQL instead of SQLite
2. Set up Redis for message queuing
3. Use environment variables for all secrets
4. Set up proper logging and monitoring
5. Configure CORS for production domains
6. Use HTTPS/WSS for WebSocket connections

### Mobile App
1. Configure API base URL for production
2. Set up proper authentication
3. Implement device pairing flow
4. Add error handling and retry logic
5. Optimize for battery life
6. Test on real devices

### Infrastructure
1. Set up load balancer for backend
2. Configure auto-scaling
3. Set up database backups
4. Implement monitoring and alerting
5. Set up CDN for media files
6. Configure satellite imagery API access

## Testing

### Backend Testing
```bash
# Test WebSocket connection
python3 -c "
import asyncio
import websockets
import json

async def test():
    uri = 'ws://localhost:8000/ws/ecodroid/test-device?session_id=test-session'
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            'type': 'heartbeat',
            'timestamp': 1234567890
        }))
        response = await ws.recv()
        print(response)

asyncio.run(test())
"
```

### Mobile App Testing
- Test on iOS simulator/device
- Test on Android emulator/device
- Test WebSocket connection
- Test wearable integration
- Test location tracking
- Test camera/microphone access

## Troubleshooting

### Backend Issues
- **Import errors**: Make sure all dependencies are installed
- **Database errors**: Run `init_db()` to create tables
- **WebSocket errors**: Check API_KEY is set
- **Port conflicts**: Change port in uvicorn command

### Mobile App Issues
- **Connection errors**: Check API base URL
- **WebSocket errors**: Ensure backend is running
- **Wearable errors**: Check platform-specific setup
- **Build errors**: Run `npm install` and `pod install` (iOS)

## Next Steps

1. **Hardware Development**: Build EcoDroid Mini device
2. **Field Testing**: Test with real hardware in nature
3. **Performance Optimization**: Optimize AI processing pipeline
4. **User Testing**: Get feedback from hikers
5. **Production Deployment**: Deploy to cloud infrastructure

## Support

For issues or questions:
- Check `IMPLEMENTATION_STATUS.md` for current status
- Review API docs at `/docs` endpoint
- Check logs for error messages
- Review WebSocket protocol documentation
