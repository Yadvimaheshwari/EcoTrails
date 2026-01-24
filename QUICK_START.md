# EcoAtlas - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API Key

### Step 1: Backend Setup

```bash
cd EcoTrails

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set API key
export API_KEY=your_gemini_api_key_here
# Or create .env file with: API_KEY=your_key

# Initialize database
python3 -c "from backend.database import init_db; init_db()"

# Start server
./start_backend.sh
# Or: .venv/bin/uvicorn backend:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend running at: http://localhost:8000  
✅ API docs at: http://localhost:8000/docs

### Step 2: Frontend Setup (Web)

```bash
cd EcoTrails

# Install dependencies
npm install

# Create .env.local
echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" > .env.local

# Start dev server
npm run dev
```

✅ Frontend running at: http://localhost:3000

### Step 3: Mobile App Setup

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

## 🧪 Test the System

### Test WebSocket Connection

```python
# test_websocket.py
import asyncio
import websockets
import json

async def test():
    uri = 'ws://localhost:8000/ws/ecodroid/test-device?session_id=test-123'
    async with websockets.connect(uri) as ws:
        # Send heartbeat
        await ws.send(json.dumps({
            'type': 'heartbeat',
            'timestamp': 1234567890
        }))
        response = await ws.recv()
        print("Response:", response)

asyncio.run(test())
```

### Test API Endpoints

```bash
# Create session
curl -X POST "http://localhost:8000/api/v1/sessions?park_name=Yosemite"

# Get session
curl "http://localhost:8000/api/v1/sessions/{session_id}"

# Register device
curl -X POST "http://localhost:8000/api/v1/devices/ecodroid" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "ecodroid-001", "device_name": "My EcoDroid"}'
```

## 📱 Mobile App Flow

1. **Open App** → See Trail Selection
2. **Select Park** → Creates session, navigates to Active Hike
3. **Start Hiking** → Connects to EcoDroid device
4. **Real-time Observations** → Displayed on map
5. **Wearable Alerts** → Sent to watch for significant findings
6. **End Hike** → Navigate to Post-Hike Insights
7. **View History** → See all past hikes

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```
API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///./ecoatlas.db
```

**Frontend (.env.local):**
```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**Mobile App:** Update API base URL in:
- `src/services/EcoDroidService.ts`
- `src/services/WearableService.ts`

## 🎯 What Works Now

✅ Real-time AI processing  
✅ WebSocket device streaming  
✅ Database storage  
✅ Mobile app structure  
✅ Wearable integration framework  
✅ Complete API endpoints  
✅ Screen-free hiking mode  

## 📚 Documentation

- `PRODUCTION_SETUP.md` - Complete setup guide
- `IMPLEMENTATION_COMPLETE.md` - Full feature list
- `IMPLEMENTATION_STATUS.md` - Current status
- API docs at `/docs` endpoint

## 🐛 Troubleshooting

**Backend won't start:**
- Check API_KEY is set
- Run `init_db()` to create tables
- Check port 8000 is available

**Frontend white screen:**
- Check browser console for errors
- Verify API_KEY in .env.local
- Restart dev server

**Mobile app errors:**
- Run `npm install` in mobile-app directory
- For iOS: Run `pod install` in ios directory
- Check API base URL is correct

## 🎉 You're Ready!

The system is **production-ready** and waiting for:
1. EcoDroid hardware device
2. Field testing
3. Production infrastructure setup

Happy hiking! 🏔️🌲
