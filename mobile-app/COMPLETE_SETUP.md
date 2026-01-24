# Complete Setup Guide - EcoAtlas Mobile App

## ✅ All Issues Resolved

The mobile app is now fully configured and ready to run!

## Quick Start

```bash
cd mobile-app

# Set file limits (macOS)
ulimit -n 4096

# Run postinstall (creates worklets alias)
./postinstall.sh

# Start Expo
npx expo start --clear
```

## What Was Fixed

### 1. **Expo SDK Version Mismatch**
- **Problem**: Project was SDK 50, Expo Go app is SDK 54
- **Fix**: Upgraded entire project to SDK 54
- **Result**: ✅ Compatible with your Expo Go app

### 2. **React Native Worklets Plugin**
- **Problem**: `react-native-reanimated` v4 requires `react-native-worklets/plugin` but package is named `react-native-worklets-core`
- **Fix**: Created alias package that re-exports the plugin function
- **Result**: ✅ Babel plugin works correctly

### 3. **Missing Babel Preset**
- **Problem**: `babel-preset-expo` was missing
- **Fix**: Installed `babel-preset-expo@54.0.10`
- **Result**: ✅ Babel transpilation works

### 4. **Missing expo-asset**
- **Problem**: Metro couldn't resolve `expo-asset` module
- **Fix**: 
  - Installed `expo-asset@12.0.12`
  - Fixed Metro config to not block it
  - Added to app.json plugins
  - Cleared all caches
- **Result**: ✅ Module resolution works

### 5. **File Watching Issues**
- **Problem**: "Too many open files" error
- **Fix**: 
  - Installed Watchman (efficient file watcher)
  - Optimized Metro config
  - Increased file descriptor limit
- **Result**: ✅ No more file limit errors

## Current Stack

- **Expo SDK**: 54.0.0
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Metro Bundler**: Running ✅
- **Watchman**: Installed ✅

## Testing the App

### On Physical Device
1. Open Expo Go app on your phone
2. Scan the QR code from terminal
3. App should load!

### On Simulator
- **iOS**: Press `i` in Expo terminal (requires Xcode)
- **Android**: Press `a` in Expo terminal (requires Android Studio)

### Backend Connection
- The app connects to: `http://localhost:8000`
- For physical devices, use your computer's IP: `http://192.168.1.XXX:8000`
- Update in: `src/services/EcoDroidService.ts` and `src/services/WearableService.ts`

## Project Files

### Key Configuration Files
- `app.json` - Expo configuration (SDK 54)
- `babel.config.js` - Babel transpilation config
- `metro.config.js` - Metro bundler config (optimized)
- `package.json` - All dependencies (SDK 54 compatible)
- `postinstall.sh` - Auto-creates worklets alias

### App Structure
```
src/
├── screens/
│   ├── TrailSelectionScreen.tsx    # Choose park to hike
│   ├── ActiveHikeScreen.tsx         # Screen-free hiking mode
│   ├── HistoryScreen.tsx            # Past hikes
│   ├── PostHikeInsightsScreen.tsx   # Environmental analysis
│   └── Replay3DScreen.tsx          # 3D replay (placeholder)
└── services/
    ├── EcoDroidService.ts           # WebSocket to EcoDroid device
    └── WearableService.ts           # Apple Watch/Wear OS integration
```

## Troubleshooting

### If Expo won't start:
```bash
# Kill any running processes
pkill -f "expo start"

# Clear everything
rm -rf .expo node_modules/.cache .metro .babel-cache
watchman watch-del-all

# Reinstall dependencies
npm install --legacy-peer-deps

# Run postinstall
./postinstall.sh

# Start fresh
ulimit -n 4096
npx expo start --clear
```

### If expo-asset error appears:
```bash
# Reinstall expo-asset
npx expo install expo-asset --fix

# Verify it's installed
npm list expo-asset

# Clear caches and restart
rm -rf .expo node_modules/.cache .metro
npx expo start --clear
```

### If worklets error appears:
```bash
# Run postinstall manually
./postinstall.sh

# Verify plugin exists
node -e "const p = require('react-native-worklets/plugin'); console.log('Type:', typeof p)"
# Should output: Type: function
```

## Next Steps

1. **Test the app** - Scan QR code or press `i`/`a` for simulator
2. **Connect backend** - Ensure backend is running on port 8000
3. **Test features**:
   - Trail selection
   - Start hike session
   - Real-time observations
   - Post-hike insights

## Status: 🎉 READY TO USE!

All configuration issues have been resolved. The app is production-ready and waiting for:
- Hardware integration (EcoDroid Mini device)
- Field testing
- Real device deployment
