# Discover Mode - Mobile Implementation Notes

## Overview

The "Discover Mode" is a gamified hiking experience that reveals points of interest (discoveries) as users approach them during a hike. This document explains the mobile-specific implementation details.

## Architecture

### Types (`src/types/`)

- **discovery.ts**: Core discovery types including `Discovery`, `CapturedDiscovery`, `DiscoveryType`, and constants for icons/colors
- **badge.ts**: Badge system types including `Badge`, `BadgeAward`, `BadgeType`, `BadgeLevel`, `BadgeRarity`

### Services (`src/services/`)

- **discoveryService.ts**: Handles fetching discoveries from API or generating mock data for development
- **visionService.ts**: **NEW** - Gemini Vision API integration for real-time species identification

### Components (`src/components/discovery/`)

| Component | Purpose |
|-----------|---------|
| `TrailSelectSheet.tsx` | Bottom sheet for trail selection on park detail screen |
| `DiscoveryMarker.tsx` | Map marker for discoveries with reveal animation |
| `DiscoveryCard.tsx` | Bottom card when a discovery is tapped |
| `CaptureModal.tsx` | Modal for capturing discoveries with photo |
| `BadgeToast.tsx` | Animated toast for badge awards |
| `HikeSummaryModal.tsx` | Post-hike summary with discoveries and badges |
| `LiveCameraDiscovery.tsx` | **NEW** - Pokemon Go-style camera AI identification |
| `DiscoveryQuest.tsx` | **NEW** - Gamified quest tracker for trail completion |

### Stores (`src/store/`)

- **useDiscoveryStore.ts**: Zustand store for discovery state, captures, and badges
- **useHikeStore.ts**: Existing hike tracking store

### Utilities (`src/utils/`)

- **geoUtils.ts**: Haversine distance, proximity checks, coordinate helpers
- **formatting.ts**: Safe number formatting for distances, times, elevations

## How Discoveries Work

### 1. Discovery Generation

Currently uses **mock data** for development. The `discoveryService.ts` generates random discoveries based on trail ID with:

- Seeded random for consistent results per trail
- Weighted discovery types (plants, wildlife, etc.)
- Variable rarity (common → legendary)

### 2. Proximity Detection

Uses `haversineDistanceMeters()` from `geoUtils.ts` to calculate real-world distance between user and discovery.

Default reveal radius: **150 meters** (configurable per discovery via `revealRadiusMeters`)

### 3. Reveal Flow

1. User's location updates via `expo-location`
2. `updateDiscoveryDistances()` recalculates all distances
3. Discoveries within reveal radius are marked `isRevealed: true`
4. `DiscoveryMarker` animates in when newly revealed
5. Haptic feedback (`expo-haptics`) triggers on reveal

### 4. Capture Flow

1. User taps a revealed discovery → `DiscoveryCard` slides up
2. User taps "Capture" → `CaptureModal` opens
3. User can optionally take/select photo and add notes
4. On submit → `captureDiscovery()` is called
5. Badge is awarded (if applicable) → `BadgeToast` appears
6. Discovery marked as captured

## Testing in Development

### Enable Mock Data

In `src/services/discoveryService.ts`:
```typescript
const USE_MOCK_DISCOVERIES = true; // Set to true for mock data
```

### Simulating Location

On iOS Simulator:
1. Features → Location → Custom Location
2. Use coordinates near your mock discovery locations

On Android Emulator:
1. Extended controls (three dots)
2. Location tab
3. Set latitude/longitude

### Quick Test Coordinates

Default mock discoveries are generated around SF (37.7749, -122.4194). Adjust your simulator location accordingly.

## Key Files to Modify

### To Add New Discovery Types

1. Add type to `DiscoveryType` in `src/types/discovery.ts`
2. Add icon to `DISCOVERY_ICONS`
3. Add color to `DISCOVERY_COLORS`
4. Add templates to `DISCOVERY_TEMPLATES` in `discoveryService.ts`
5. Add badge mapping in `getBadgeTypeForDiscovery()`

### To Add New Badge Types

1. Add type to `BadgeType` in `src/types/badge.ts`
2. Add definition to `BADGE_DEFINITIONS`

### To Change Reveal Radius

Default is in `src/types/discovery.ts`:
```typescript
export const DEFAULT_REVEAL_RADIUS_METERS = 150;
```

Per-discovery override via `revealRadiusMeters` property.

## Gemini Vision Integration (NEW)

### Using the Vision Service

The `visionService.ts` connects to our backend's Gemini Vision API for real-time species identification:

```typescript
import { visionService } from '../services/visionService';

// Identify an image
const result = await visionService.identifyImage(
  base64Image,           // Base64 encoded image data
  hikeId,               // Optional: current hike ID for context
  { lat: 37.9, lng: -122.5 }  // Optional: GPS location
);

if (result.success) {
  console.log(result.identification.name);        // "Western Scrub-Jay"
  console.log(result.identification.rarity);      // "common" | "uncommon" | "rare" | "legendary"
  console.log(result.identification.xp);          // 25
}
```

### API Keys

All Gemini API keys are stored in environment variables and handled **server-side**:
- `GEMINI_API_KEY` - Primary key
- The mobile app never sees the API key directly

### Fallback Mode

When the API is unavailable, the service returns realistic mock data for development/offline testing.

## Known Limitations

1. **Mock Data Only**: Discoveries are generated client-side; no backend persistence yet
2. **No Offline Cache**: Discoveries require network to load (or mock mode)
3. **Photo Storage**: Photos are stored locally via `expo-image-picker`, not uploaded
4. **Badge Persistence**: Uses AsyncStorage; may be lost on app reinstall
5. **No Social Features**: Badge sharing is placeholder only

## Future Improvements

- [ ] Backend API for discoveries (`GET /api/v1/trails/{id}/discoveries`)
- [ ] Photo upload to cloud storage
- [ ] User progress sync across devices
- [ ] Social sharing of badges and hike summaries
- [ ] AR mode for discoveries
- [ ] Offline discovery cache
- [ ] Push notifications for nearby rare discoveries

## Troubleshooting

### Discoveries Not Appearing

1. Check `USE_MOCK_DISCOVERIES` is `true`
2. Verify location permissions granted
3. Ensure user location is within reveal radius
4. Check console for discovery load errors

### Badge Toast Not Showing

1. Verify `showBadgeToast` state is being set
2. Check `BadgeToast` component is rendered
3. Look for animation issues in console

### Location Not Updating

1. Check `expo-location` permissions
2. Verify `Location.watchPositionAsync` is running
3. Test with manual location override in simulator

## Component Dependencies

```
DuringHikeScreen
├── MapView (react-native-maps)
│   ├── DiscoveryMarker (per revealed discovery)
│   └── Polyline (tracked route)
├── DiscoveryCard (when discovery selected)
├── CaptureModal (when capturing)
├── BadgeToast (when badge earned)
├── HikeSummaryModal (when hike ends)
├── LiveCameraDiscovery (NEW - AI camera mode)
│   └── Camera (expo-camera)
│   └── visionService (Gemini API)
└── DiscoveryQuest (NEW - quest tracker)
```

```
PlaceDetailScreen
├── MapView (park overview)
├── Wildlife section (NEW)
├── Activities section (NEW)
├── Trail list
└── TrailSelectSheet

JournalScreen
└── HikeDetailScreen (NEW - comprehensive hike view)
    ├── Route map
    ├── Stats grid
    ├── Tabs (Overview, Discoveries, Insights)
    └── Badge display
```

## Performance Notes

- `DiscoveryMarker` uses `tracksViewChanges={false}` on Android to prevent re-renders
- Distance calculations are debounced via location update intervals
- Animations use `useNativeDriver: true` for 60fps

---

*Last updated: February 2026*
