# EcoAtlas Project Overview

## Project Structure

This is a **full-stack environmental intelligence application** that combines:
- **Frontend**: React + TypeScript + Vite (runs on port 3000)
- **Backend**: FastAPI (Python) (runs on port 8000)

## Architecture

### Frontend (React/TypeScript)
- **Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Port**: 3000
- **Main Entry**: `index.tsx` → `App.tsx`
- **Key Features**:
  - Environmental data visualization
  - Media ingestion and analysis
  - Trail briefings and reports
  - Multi-agent AI orchestration UI

### Backend (FastAPI/Python)
- **Framework**: FastAPI 0.109.0
- **Server**: Uvicorn 0.27.0
- **Port**: 8000
- **Main File**: `backend.py`
- **Key Features**:
  - Multi-agent AI system (Telemetry, Observer, Listener, Fusionist, Spatial, Historian, Bard)
  - Environmental synthesis API
  - Sensor data processing
  - CORS enabled for all origins

## How to Run Both Servers

### Prerequisites
1. **Python 3.11+** with virtual environment
2. **Node.js** (for npm)
3. **Gemini API Key** (set as environment variable)

### Step 1: Set Up Environment Variables

Create a `.env.local` file in the `EcoTrails` directory:
```bash
GEMINI_API_KEY=your_api_key_here
```

For the backend, set the API key:
```bash
export API_KEY=your_api_key_here
```

### Step 2: Install Dependencies

**Backend (Python):**
```bash
cd EcoTrails
source .venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd EcoTrails
npm install
```

### Step 3: Run the Servers

You need to run **both servers simultaneously** in separate terminal windows:

#### Terminal 1 - Backend Server (FastAPI)
```bash
cd EcoTrails
source .venv/bin/activate
export API_KEY=your_api_key_here
python backend.py
```
**OR** using uvicorn directly:
```bash
cd EcoTrails
source .venv/bin/activate
export API_KEY=your_api_key_here
uvicorn backend:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at: `http://localhost:8000`

#### Terminal 2 - Frontend Server (Vite)
```bash
cd EcoTrails
npm run dev
```

The frontend will be available at: `http://localhost:3000`

### Step 4: Configure API Proxy (Important!)

The frontend makes API calls to `/api/v1/synthesis` (relative path). You need to configure Vite to proxy these requests to the backend.

**Update `vite.config.ts`** to add a proxy:

```typescript
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
          }
        }
      },
      // ... rest of config
    };
});
```

## API Endpoints

### Backend Endpoints (Port 8000)

1. **POST `/api/v1/synthesis`**
   - Processes environmental data synthesis
   - Accepts: images, park_name, history_json, sensor_json
   - Returns: Multi-agent analysis results

2. **POST `/api/v1/sensors/heartbeat`**
   - Receives sensor data packets
   - Accepts: SensorPacket JSON

## Project Files Overview

### Frontend Files
- `App.tsx` - Main application component with routing
- `index.tsx` - React entry point
- `vite.config.ts` - Vite configuration
- `package.json` - Node dependencies
- `geminiService.ts` - Frontend AI service calls
- `types.ts` - TypeScript type definitions
- `views/` - All view components (Dashboard, Analysis, Report, etc.)
- `components/` - Reusable components (Navigation, etc.)

### Backend Files
- `backend.py` - FastAPI application with multi-agent system
- `requirements.txt` - Python dependencies

## Key Features

1. **Multi-Agent AI System**: 
   - Telemetry (sensor processing)
   - Observer (visual analysis)
   - Listener (acoustic analysis)
   - Fusionist (satellite/ground fusion)
   - Spatial (geospatial grounding)
   - Historian (temporal comparison)
   - Bard (narrative synthesis)

2. **Environmental Intelligence**:
   - Real-time sensor data processing
   - Image analysis
   - Audio analysis
   - Historical pattern recognition
   - Narrative generation

3. **User Interface**:
   - Trail selection and briefings
   - Media ingestion
   - Real-time analysis progress
   - Environmental reports
   - Memory/journal system

## Troubleshooting

1. **CORS Issues**: Backend has CORS enabled for all origins, so this shouldn't be an issue.

2. **API Connection**: Make sure the Vite proxy is configured correctly, or update the frontend to use `http://localhost:8000/api/v1/synthesis` directly.

3. **API Key**: Ensure `API_KEY` environment variable is set for the backend, and `GEMINI_API_KEY` is in `.env.local` for the frontend.

4. **Port Conflicts**: If ports 3000 or 8000 are in use, change them in:
   - Frontend: `vite.config.ts` (port: 3000)
   - Backend: `backend.py` (port=8000) or uvicorn command
