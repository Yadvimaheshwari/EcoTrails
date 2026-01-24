# EcoAtlas Mobile App

React Native mobile application for EcoAtlas environmental intelligence system.

## Features

- **Trail Selection**: Choose from available national parks
- **Active Hike**: Screen-free mode with real-time observations
- **EcoDroid Integration**: Connect to EcoDroid Mini hardware device
- **Wearable Support**: Apple Watch and Wear OS integration
- **History**: View past hikes and environmental records
- **Post-Hike Insights**: Comprehensive environmental analysis

## Setup

1. Install dependencies:
```bash
npm install
```

2. For iOS:
```bash
cd ios && pod install && cd ..
npm run ios
```

3. For Android:
```bash
npm run android
```

## Configuration

Update API base URL in service files:
- `src/services/EcoDroidService.ts`
- `src/services/WearableService.ts`

Default: `http://localhost:8000`

## Architecture

- **Services**: Device communication (EcoDroid, Wearables)
- **Screens**: Main app screens
- **Components**: Reusable UI components
- **Hooks**: Custom React hooks for state management

## EcoDroid Device Connection

The app connects to EcoDroid Mini hardware via WebSocket:
- Real-time video frame streaming
- Audio chunk processing
- Sensor telemetry
- Location tracking

## Wearable Integration

- **Apple Watch**: Uses WatchConnectivity framework
- **Wear OS**: Uses Wearable Data Layer API
- Features: Alerts, vibrations, status updates
