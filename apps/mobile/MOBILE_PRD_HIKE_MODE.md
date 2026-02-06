# Mobile Product Requirements Document: Hike Mode & Discovery System

## Overview

This document describes the complete implementation of the gamified "Hike Mode" experience for the EcoTrails mobile app. This brings feature parity with the web version and adds Pokemon Go-style discovery mechanics.

---

## 🎯 For Android & iOS Developers

### Environment Setup

**API Keys Available (from environment variables):**
```
GEMINI_API_KEY           - For AI vision identification
GOOGLE_MAPS_API_KEY      - For maps and places
OPENAI_API_KEY           - Backup AI provider
NPS_API_KEY              - National Park Service data
```

All Gemini API calls are **handled server-side** through our FastAPI backend. The mobile app communicates with:
- `POST /api/v1/vision/identify` - Image identification
- `POST /api/v1/vision/species-hints` - Get species for quest items

---

## 🚀 New Features Implemented

### 1. Live Camera Discovery (`LiveCameraDiscovery.tsx`)

**Pokemon Go-style real-time species identification using Gemini Vision AI.**

**Location:** `src/components/discovery/LiveCameraDiscovery.tsx`

**Key Features:**
- Full-screen camera with AR-style viewfinder overlay
- Real-time capture and AI identification
- Rarity system (Common, Uncommon, Rare, Legendary)
- XP rewards and badge awarding
- Haptic feedback on discoveries
- Beautiful success animations

**Usage:**
```tsx
<LiveCameraDiscovery
  visible={cameraVisible}
  onClose={() => setCameraVisible(false)}
  hikeId={currentHike.id}
  currentLocation={userLocation}
  onDiscoveryMade={(result, xp) => {
    // Handle discovery
    console.log(`Found ${result.name} - ${xp} XP`);
  }}
/>
```

**API Integration:**
```typescript
// The visionService handles all Gemini API calls
import { visionService } from '../../services/visionService';

const response = await visionService.identifyImage(base64Image, hikeId, location);
// Returns: { success, identification: { name, scientificName, category, confidence, rarity, xp, funFacts } }
```

### 2. Discovery Quest (`DiscoveryQuest.tsx`)

**Gamified quest tracker showing what to find on each trail.**

**Location:** `src/components/discovery/DiscoveryQuest.tsx`

**Key Features:**
- Trail-specific quest items generated from Gemini
- XP rewards per item discovered
- Completion bonus for finding all items
- Visual progress tracking
- Rarity-based item sorting

**Usage:**
```tsx
<DiscoveryQuest
  visible={questVisible}
  onClose={() => setQuestVisible(false)}
  trailName="Bootjack Trail"
  questItems={questItems}
  totalXp={235}
  earnedXp={85}
  completionBonus={50}
  onItemClick={(item) => openCameraToFind(item)}
/>
```

**Generating Quest Items:**
```typescript
import { generateQuestItems } from '../components/discovery';
import { visionService } from '../services/visionService';

// Get species hints from Gemini
const hints = await visionService.getSpeciesHints(location);

// Generate quest items
const items = generateQuestItems(trailId, trailName, hints);
```

### 3. Vision Service (`visionService.ts`)

**Handles all Gemini Vision API integration.**

**Location:** `src/services/visionService.ts`

**Key Methods:**
```typescript
// Identify an image
const response = await visionService.identifyImage(
  imageBase64,     // Base64 encoded image
  hikeId,          // Optional hike context
  { lat, lng }     // Optional location
);

// Get species hints for a location
const hints = await visionService.getSpeciesHints(
  { lat: 37.9064, lng: -122.5763 },
  'spring'  // Optional season
);
```

**Response Types:**
```typescript
interface IdentificationResult {
  name: string;
  scientificName?: string;
  category: 'plant' | 'animal' | 'bird' | 'insect' | 'geology' | 'fungi' | 'landscape';
  confidence: number;        // 0-100
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  xp: number;                // Points awarded
  funFacts: string[];
  conservation?: string;
  habitat?: string;
}
```

### 4. Updated DuringHikeScreen

**Location:** `src/screens/DuringHikeScreen.tsx`

**New Buttons:**
- **AI Discovery** - Opens live camera for species identification
- **Quest** - Shows quest tracker with progress

**New State:**
- `cameraVisible` - Camera modal visibility
- `questVisible` - Quest sheet visibility
- `questItems` - List of quest items for the trail
- `earnedXp` / `totalXp` - XP tracking

### 5. Hike Detail Screen (`HikeDetailScreen.tsx`)

**Comprehensive hike journal entry view.**

**Location:** `src/screens/HikeDetailScreen.tsx`

**Features:**
- Route map with start/end markers
- Stats grid (distance, elevation, duration, discoveries)
- Tabbed interface (Overview, Discoveries, Insights)
- Earned badges display
- Wildlife spotted section
- AI-generated insights (from Gemini)

### 6. Place Detail Screen Updates

**Location:** `src/screens/PlaceDetailScreen.tsx`

**New Sections:**
- **Wildlife You May Spot** - Species likely to be found
- **Activities & Challenges** - XP-earning activities

---

## 📦 New Badge Types

Added to `src/types/badge.ts`:

| Badge Type | Icon | Description |
|-----------|------|-------------|
| `camera_discovery` | 📸 | Made a discovery using live camera |
| `quest_complete` | 🏅 | Completed all discoveries on a trail |
| `legendary_find` | 👑 | Found a legendary species |
| `nature_photographer` | 📷 | Captured 10 species using camera |

---

## 🔌 API Endpoints Used

### Vision API (Gemini-powered)
```
POST /api/v1/vision/identify
POST /api/v1/vision/species-hints
```

### Hikes API
```
GET  /api/v1/hikes/{id}
GET  /api/v1/hikes/{id}/discoveries
GET  /api/v1/hikes/{id}/badges
GET  /api/v1/hikes/{id}/insights
POST /api/v1/hikes/{id}/discoveries/capture
```

### Places API
```
GET /api/v1/places/{id}
GET /api/v1/places/{id}/wildlife
GET /api/v1/places/{id}/activities
```

---

## 📱 Platform-Specific Notes

### iOS (Swift/Objective-C Bridge)

The camera uses `expo-camera` which has native iOS bindings. Ensure:
- Camera permission is in `Info.plist`
- Photo library permission if saving images
- Location permission for GPS tagging

```xml
<key>NSCameraUsageDescription</key>
<string>EcoTrails uses the camera to identify wildlife and plants on the trail.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>EcoTrails uses your location to show nearby discoveries and track your hike.</string>
```

### Android (Kotlin/Java Bridge)

Ensure permissions in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Haptics
- iOS: Uses Taptic Engine via `expo-haptics`
- Android: Uses vibration motor via `expo-haptics`

---

## 🧪 Testing the Discovery Flow

1. **Start a hike** from any park's trail list
2. **Tap "AI Discovery"** to open the camera
3. **Point at anything** (tree, rock, bird, etc.)
4. **Tap the scan button** to capture and identify
5. **Review the result** (species name, confidence, XP)
6. **Tap "Log Discovery"** to save it
7. **Check the Quest** to see what else to find
8. **End hike** to see summary with badges

### Testing Without Camera

The vision service has fallback data for development. When the API is unavailable, it returns realistic mock species.

---

## 🎨 UI/UX Guidelines

### Color System
```typescript
const RARITY_COLORS = {
  common: '#6B7280',     // Gray
  uncommon: '#10B981',   // Green
  rare: '#8B5CF6',       // Purple
  legendary: '#F59E0B',  // Amber
};
```

### Animations
- Use `react-native-reanimated` for all animations
- Haptic feedback on every interaction
- Success animations should be celebratory but quick (< 2s)

### Typography
- Use system fonts for body text
- Use `fontWeight: 'bold'` for XP values
- Scientific names in italic

---

## 📁 File Structure

```
src/
├── components/
│   └── discovery/
│       ├── index.ts                 # Barrel exports
│       ├── LiveCameraDiscovery.tsx  # NEW: Camera AI
│       ├── DiscoveryQuest.tsx       # NEW: Quest tracker
│       ├── DiscoveryMarker.tsx
│       ├── DiscoveryCard.tsx
│       ├── CaptureModal.tsx
│       ├── BadgeToast.tsx
│       ├── HikeSummaryModal.tsx
│       └── TrailSelectSheet.tsx
├── services/
│   ├── visionService.ts             # NEW: Gemini Vision
│   ├── discoveryService.ts
│   └── ...
├── screens/
│   ├── DuringHikeScreen.tsx         # UPDATED
│   ├── HikeDetailScreen.tsx         # NEW
│   ├── PlaceDetailScreen.tsx        # UPDATED
│   └── JournalScreen.tsx            # UPDATED
└── types/
    ├── badge.ts                     # UPDATED with new types
    ├── discovery.ts
    └── index.ts
```

---

## 🔜 Future Enhancements

1. **Offline Mode** - Cache discoveries and sync when online
2. **AR Overlays** - Show species info directly on camera view
3. **Social Features** - Share discoveries with friends
4. **Leaderboards** - Compete for XP on trails
5. **Seasonal Events** - Special limited-time discoveries

---

## 📞 Backend Contact

For API issues or new endpoints, contact the Full-Stack team:
- Vision API: Uses Gemini 1.5 Flash
- All API keys are in environment variables
- Backend runs on FastAPI

---

*Document created: February 2026*
*Last updated: February 2026*
