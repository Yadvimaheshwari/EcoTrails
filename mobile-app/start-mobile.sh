#!/bin/bash
# Start EcoAtlas Mobile App with proper file limits

cd "$(dirname "$0")"

# Increase file descriptor limit for this session (macOS default is 256)
# Try to set it as high as possible
ulimit -n 65536 2>/dev/null || ulimit -n 4096 2>/dev/null || ulimit -n 2048

# Verify the limit was set
CURRENT_LIMIT=$(ulimit -n)
echo "File descriptor limit set to: $CURRENT_LIMIT"

# Check if Watchman is available (better file watching)
if command -v watchman &> /dev/null; then
  echo "Watchman detected - using for better file watching"
else
  echo "⚠️  Watchman not found. Install with: brew install watchman"
  echo "   This will significantly improve file watching performance"
fi

# Clear Metro cache to avoid stale file handles
echo "Clearing Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro

# Start Expo with clear cache
echo "Starting Expo development server..."
echo "Press 'i' for iOS simulator, 'a' for Android, or scan QR code with Expo Go app"
echo ""

npx expo start --clear
