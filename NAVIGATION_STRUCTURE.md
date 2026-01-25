# EcoAtlas Navigation Structure

This document defines the complete navigation architecture for both mobile (React Native) and web (React) applications.

## Navigation Hierarchy

### Root Navigator (Stack)
- Main Tab Navigator (5 tabs)
- Modal Flows (Record Hike, Trail Details, Hike Details, etc.)

### Main Tab Navigator (Bottom Tabs)

1. **Explore** - Trail and park discovery
2. **Map** - Interactive map view
3. **Record Hike** - Start new hike recording
4. **Activity** - Hike history and statistics
5. **Profile** - User settings and account

---

## 1. Explore Tab

### Purpose
Discover parks, trails, and plan future hikes.

### Navigation Stack
```
Explore (Tab Root)
├── TrailList (Default Screen)
│   └── Shows list of parks/trails with search and filters
├── TrailDetail (Stack Screen)
│   └── Trail information, photos, reviews, difficulty
├── ParkDetail (Stack Screen)
│   └── Park information, trails within park, features
└── SavedTrails (Stack Screen)
    └── User's saved/favorited trails
```

### Deep Linking
- `ecoatlas://explore` - Opens Explore tab
- `ecoatlas://explore/trail/:trailId` - Opens specific trail detail
- `ecoatlas://explore/park/:parkId` - Opens specific park detail
- `ecoatlas://explore/saved` - Opens saved trails

### Key Features
- Search parks and trails
- Filter by state, type, difficulty
- View trail details (no auto-start)
- Save trails for later
- View park information

---

## 2. Map Tab

### Purpose
Visual map interface for exploring trails and parks geographically.

### Navigation Stack
```
Map (Tab Root)
├── MapView (Default Screen)
│   └── Interactive map with trail markers
├── TrailDetail (Modal)
│   └── Trail info from map marker
└── ParkDetail (Modal)
    └── Park info from map marker
```

### Deep Linking
- `ecoatlas://map` - Opens Map tab
- `ecoatlas://map/trail/:trailId` - Opens map centered on trail
- `ecoatlas://map/park/:parkId` - Opens map centered on park
- `ecoatlas://map?lat=:lat&lng=:lng` - Opens map at coordinates

### Key Features
- Interactive map with trail markers
- Filter trails by difficulty, distance
- View trail details from map
- Navigate to trail from map
- Current location display

---

## 3. Record Hike Tab

### Purpose
Start a new hike recording session.

### Navigation Stack
```
Record Hike (Tab Root)
├── RecordHikeHome (Default Screen)
│   └── Select trail to record, or start without trail
├── TrailSelection (Modal)
│   └── Select trail for recording
└── ActiveHike (Modal/Stack)
    └── Active hike recording screen
```

### Deep Linking
- `ecoatlas://record` - Opens Record Hike tab
- `ecoatlas://record/trail/:trailId` - Pre-selects trail for recording
- `ecoatlas://record/start/:trailId` - Starts recording immediately (requires confirmation)

### Key Features
- **NO AUTO-START**: User must explicitly start recording
- Select trail before starting (optional)
- Start recording without trail selection
- View active hike screen
- End hike and save

### Important: No Auto-Start
- The Record Hike tab should show a selection/start screen
- User must tap "Start Recording" button to begin
- Trail selection is optional but recommended

---

## 4. Activity Tab

### Purpose
View past hikes, statistics, and achievements.

### Navigation Stack
```
Activity (Tab Root)
├── ActivityList (Default Screen)
│   └── List of past hikes with filters
├── HikeDetail (Stack Screen)
│   └── Detailed view of a past hike
├── PostHikeInsights (Stack Screen)
│   └── Environmental analysis from completed hike
├── Replay3D (Stack Screen)
│   └── 3D replay of hike route
└── Statistics (Stack Screen)
    └── User statistics and achievements
```

### Deep Linking
- `ecoatlas://activity` - Opens Activity tab
- `ecoatlas://activity/hike/:hikeId` - Opens specific hike detail
- `ecoatlas://activity/insights/:hikeId` - Opens post-hike insights
- `ecoatlas://activity/replay/:hikeId` - Opens 3D replay

### Key Features
- List of completed hikes
- Filter by date, trail, park
- View hike details
- View environmental insights
- 3D route replay
- Statistics and achievements

---

## 5. Profile Tab

### Purpose
User account, settings, and preferences.

### Navigation Stack
```
Profile (Tab Root)
├── ProfileHome (Default Screen)
│   └── User info, settings menu
├── Settings (Stack Screen)
│   └── App settings and preferences
├── WearableDevices (Stack Screen)
│   └── Manage wearable connections
├── EcoDroidDevices (Stack Screen)
│   └── Manage EcoDroid devices
└── About (Stack Screen)
    └── App information and version
```

### Deep Linking
- `ecoatlas://profile` - Opens Profile tab
- `ecoatlas://profile/settings` - Opens settings
- `ecoatlas://profile/wearables` - Opens wearable devices
- `ecoatlas://profile/ecodroid` - Opens EcoDroid devices

### Key Features
- User profile information
- App settings
- Device management
- Account management
- About and help

---

## Modal Flows

### Trail Selection Modal
- Can be opened from Explore, Map, or Record Hike
- Allows selecting a trail
- Returns selected trail to calling screen

### Active Hike Modal
- Full-screen modal for active hike recording
- Can be dismissed to return to previous screen
- Shows recording controls and real-time data

### Trail Detail Modal
- Can be opened from Map markers
- Shows trail information
- Option to start recording from this trail

---

## Deep Linking Configuration

### Universal Links (Mobile)
```
ecoatlas://explore
ecoatlas://map
ecoatlas://record
ecoatlas://activity
ecoatlas://profile

ecoatlas://explore/trail/:trailId
ecoatlas://explore/park/:parkId
ecoatlas://map/trail/:trailId
ecoatlas://map/park/:parkId
ecoatlas://record/trail/:trailId
ecoatlas://activity/hike/:hikeId
ecoatlas://activity/insights/:hikeId
ecoatlas://activity/replay/:hikeId
```

### Web Routes
```
/explore
/explore/trail/:trailId
/explore/park/:parkId
/explore/saved

/map
/map/trail/:trailId
/map/park/:parkId

/record
/record/trail/:trailId

/activity
/activity/hike/:hikeId
/activity/insights/:hikeId
/activity/replay/:hikeId

/profile
/profile/settings
/profile/wearables
/profile/ecodroid
```

---

## Navigation State Management

### Mobile (React Navigation)
- Uses React Navigation 6.x
- Stack Navigator for root
- Bottom Tab Navigator for main tabs
- Modal presentation for active flows

### Web (React Router)
- Uses React Router 6.x
- BrowserRouter for web routing
- Tab navigation via state management
- URL-based routing for deep linking

---

## Screen Flow Examples

### Starting a New Hike
1. User navigates to **Record Hike** tab
2. Sees "Select Trail" or "Start Recording" options
3. User selects trail (optional)
4. User taps "Start Recording" button
5. **Active Hike** screen opens (modal)
6. Recording begins
7. User can end hike from Active Hike screen
8. Returns to Record Hike tab after completion

### Viewing Past Hike
1. User navigates to **Activity** tab
2. Sees list of past hikes
3. Taps on a hike
4. **Hike Detail** screen opens
5. Can navigate to **PostHikeInsights** or **Replay3D**

### Discovering Trails
1. User navigates to **Explore** tab
2. Searches or browses trails
3. Taps on a trail
4. **Trail Detail** screen opens
5. Can save trail or navigate to Record Hike

---

## Key Design Principles

1. **No Auto-Start**: No screen automatically starts a hike. User must explicitly start recording.

2. **Consistent Structure**: Mobile and web share the same logical navigation structure.

3. **Deep Linking**: All major screens support deep linking for sharing and navigation.

4. **Modal Flows**: Active hike and trail selection use modal presentation to maintain context.

5. **Tab Persistence**: Tab state persists when navigating within stacks.

6. **Clear Hierarchy**: Root → Tabs → Stacks → Modals

---

## Implementation Notes

### Mobile
- Use `@react-navigation/native` for navigation
- Use `@react-navigation/bottom-tabs` for tab navigation
- Use `@react-navigation/stack` for stack navigation
- Configure deep linking in `app.json` (Expo)

### Web
- Use `react-router-dom` for routing
- Use state management for tab selection
- Use URL parameters for deep linking
- Maintain consistent UI with mobile

---

## Migration Notes

### From Current Structure
- **Discovery** → **Explore** tab
- **History** → **Activity** tab
- **ActiveHike** → Modal in Record Hike flow
- **PostHike** → Stack screen in Activity tab
- **Replay3D** → Stack screen in Activity tab

### New Screens Required
- **Map** tab and MapView screen
- **Record Hike** tab and RecordHikeHome screen
- **Profile** tab and ProfileHome screen
- **TrailDetail** screen (reusable)
- **ParkDetail** screen (reusable)
- **Statistics** screen
