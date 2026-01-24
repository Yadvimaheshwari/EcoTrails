# Starting the Mobile App

## Quick Start

### Option 1: Use the startup script (Recommended)
```bash
cd mobile-app
./start-mobile.sh
```

### Option 2: Manual start
```bash
cd mobile-app

# Increase file limit (required on macOS)
ulimit -n 4096

# Clear cache
rm -rf .expo node_modules/.cache .metro

# Start Expo
npx expo start --clear
```

## Fixing "Too Many Open Files" Error

If you see `EMFILE: too many open files`, run:

```bash
# In the mobile-app directory
ulimit -n 4096
```

### Permanent Fix (Optional)

Add to your `~/.zshrc` or `~/.bash_profile`:
```bash
# Increase file descriptor limit for development
ulimit -n 4096
```

Then reload:
```bash
source ~/.zshrc
```

## Running on Devices

Once Expo starts, you'll see a QR code:

- **iOS**: Open Camera app and scan QR code (requires Expo Go app)
- **Android**: Open Expo Go app and scan QR code
- **iOS Simulator**: Press `i` (requires Xcode)
- **Android Emulator**: Press `a` (requires Android Studio)
- **Web**: Press `w`

## Backend Connection

The app connects to your backend at:
- **Localhost**: `http://localhost:8000` (for simulators/emulators)
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.XXX:8000`)

Update the backend URL in:
- `src/services/EcoDroidService.ts`
- `src/services/WearableService.ts`

## Troubleshooting

**Metro bundler crashes:**
```bash
rm -rf .expo node_modules/.cache .metro
npx expo start --clear
```

**Package version warnings:**
```bash
npm install react-native@0.73.6 expo-camera@~14.1.3 expo-sensors@~12.9.1
```

**Port already in use:**
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
```
