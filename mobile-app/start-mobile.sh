#!/bin/bash
# Start EcoAtlas Mobile App with proper file limits

cd "$(dirname "$0")"

# Increase file descriptor limit for this session (macOS default is 256)
ulimit -n 4096

# Verify the limit was set
echo "File descriptor limit set to: $(ulimit -n)"

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
