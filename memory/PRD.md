# EcoTrails - Hiking Companion App PRD

## Overview
EcoTrails is a comprehensive hiking companion app for national and state parks in the USA. It features real-time trail navigation, gamified wildlife/flora discovery (Pokemon GO style), AI-powered insights, health app integrations, and offline capabilities.

## Tech Stack
- **Frontend Web**: Next.js 14, React, TypeScript, Tailwind CSS, Leaflet Maps
- **Frontend Mobile**: React Native (Expo), React Navigation
- **Backend**: Python FastAPI, SQLAlchemy
- **Database**: SQLite (development), MongoDB ready
- **AI**: Google Gemini API for insights, image identification, species discovery
- **Maps**: Google Maps Places API, OpenStreetMap/OpenTopoMap tiles
- **Parks Data**: NPS (National Park Service) API

## Core Features

### 1. Park & Trail Discovery
- Search national/state parks via Google Maps Places API
- View park details: trails, weather, best season, permits, alerts
- Filter trails by difficulty (easy, moderate, hard, expert)
- View trail details: distance, elevation gain, estimated time

### 2. Offline Maps (PDF)
- Download official NPS park maps as PDFs
- Stored locally for offline access
- Supports 50+ major national parks

### 3. Live Hike Mode with Gamification
- Real-time GPS tracking
- Pre-defined trail route display (dashed orange line)
- User tracked path display (solid green line)
- Pokemon GO style discovery quests
- Wildlife/flora/fauna identification via camera
- XP points and badges for discoveries
- Species hints powered by Gemini AI

### 4. Journal & Trip Planning
- Plan trips with checklists
- Log completed hikes with photos
- Track discoveries and achievements
- View hiking stats and progress

### 5. Health App Integrations
- Apple Health connection
- Garmin Connect integration
- Strava integration
- Fitbit support

### 6. AI Companion
- Gemini-powered hiking insights
- Real-time trail conditions and tips
- Species identification from photos
- Voice narration support

## What's Been Implemented (Feb 2026)

### Session 1 Fixes
- ✅ Configured all API keys (Gemini, Google Maps, NPS, OpenWeather)
- ✅ Fixed backend server startup and .env loading
- ✅ Fixed guest user access to explore page
- ✅ Verified all core features working (98% test success)

### Session 2 Fixes
- ✅ Fixed offline map PDF download (parkCode matching issue)
  - Added direct park name to code mapping for major parks
  - Updated Yellowstone PDF URL to 2025 version
- ✅ Fixed trail route display in hike mode
  - Web: Added trailRoute state and Leaflet polyline rendering
  - Mobile: Added trail route fetch and react-native-maps Polyline
- ✅ Synced web changes to frontend deployment folder
- ✅ Mobile app already has feature parity (screens, services, gamification)

## Backlog / Future Enhancements

### P0 - Critical
- [ ] Full hike flow end-to-end test with GPS simulation
- [ ] Actual health app OAuth implementations

### P1 - Important
- [ ] Photo-to-3D conversion (currently stubbed)
- [ ] Video generation from photos (needs Sora integration)
- [ ] More park PDF URL updates (some NPS URLs changed)

### P2 - Nice to Have
- [ ] Social sharing of discoveries
- [ ] Community leaderboards
- [ ] Offline trail route caching
- [ ] Push notifications for nearby discoveries

## API Keys Required
- `API_KEY`: Google Gemini API key
- `GOOGLE_MAPS_API_KEY`: Google Maps Places API
- `NPS_API_KEY`: National Park Service API
- `OPENWEATHER_API_KEY`: OpenWeather API
- `JWT_SECRET`: Authentication secret
- SMTP credentials for magic link emails

## Key Files
- `/app/main.py` - Backend FastAPI application
- `/app/apps/web/src/app/explore/page.tsx` - Explore page
- `/app/apps/web/src/app/places/[id]/page.tsx` - Place details
- `/app/apps/web/src/app/hikes/[id]/live/page.tsx` - Live hike mode
- `/app/apps/web/src/components/hike-mode/HikeMapCanvas.tsx` - Map component
- `/app/apps/mobile/src/screens/DuringHikeScreen.tsx` - Mobile hike screen
- `/app/backend/official_map_service.py` - NPS map URLs

## User Personas
1. **Weekend Hiker** - Casual hikers looking for easy trails
2. **Adventure Seeker** - Experienced hikers wanting challenging trails
3. **Nature Enthusiast** - Users focused on wildlife/flora discovery
4. **Fitness Tracker** - Users integrating with health apps
