# EcoTrails - Environmental Intelligence Platform

A full-stack application for tracking hikes, analyzing environmental data, and generating AI-powered insights.

## Project Structure

```
EcoTrails/
├── backend/          # Python FastAPI backend
│   ├── models.py    # SQLAlchemy database models
│   ├── *.py         # Service modules
│   └── ...
├── apps/
│   ├── mobile/      # React Native Expo mobile app
│   └── web/         # Next.js web app
├── main.py          # FastAPI application entry point
└── requirements.txt # Python dependencies
```

## Backend (Python/FastAPI)

### Setup

1. Create a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables (create `.env` file):
```env
API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_minimum_32_characters
MAGIC_LINK_SECRET=your_magic_link_secret_minimum_32_characters
DATABASE_URL=sqlite:///./ecoatlas.db  # or PostgreSQL URL
REDIS_URL=redis://localhost:6379  # Optional
STORAGE_TYPE=local
STORAGE_PATH=./uploads
BASE_URL=http://localhost:8000
```

4. Initialize database:
```bash
python -c "from backend.database import init_db; init_db()"
```

5. Run the server:
```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

## Mobile App (React Native Expo)

### Setup

1. Navigate to mobile app:
```bash
cd apps/mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the app:
```bash
npx expo start
```

## Web App (Next.js)

### Setup

1. Navigate to web app:
```bash
cd apps/web
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

The web app will be available at `http://localhost:3000`

## Features

- **Authentication**: Magic link email authentication with JWT
- **Hike Tracking**: Create, start, pause, and end hikes with GPS tracking
- **Media Management**: Upload photos, videos, and audio with local storage
- **AI Analysis**: 10-step Gemini pipeline for post-hike insights
- **Achievements**: Unlock achievements based on hiking milestones
- **Journal**: Create and manage journal entries
- **Device Integration**: Connect wearable devices (Apple Watch, Garmin, Fitbit)
- **Export**: Export hike data as JSON or CSV
- **Offline Support**: Sync offline data when connection is restored

## API Endpoints

See `http://localhost:8000/docs` for full API documentation.

Key endpoints:
- `POST /api/v1/auth/magic-link` - Request magic link
- `GET /api/v1/auth/verify` - Verify magic link token
- `POST /api/v1/hikes` - Create hike
- `POST /api/v1/hikes/{id}/insights/start` - Start analysis
- `GET /api/v1/hikes/{id}/insights/report` - Get insights report

## Database

The backend uses SQLAlchemy with support for:
- SQLite (development, default)
- PostgreSQL (production)

Database models are defined in `backend/models.py`.

## Storage

Media files are stored locally in the `./uploads` directory (configurable via `STORAGE_PATH`).

No S3 bucket required for development.
