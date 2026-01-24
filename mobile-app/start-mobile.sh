#!/bin/bash
# Start EcoAtlas Mobile App with proper file limits

cd "$(dirname "$0")"

# Increase file descriptor limit for this session
ulimit -n 4096

# Clear Metro cache
echo "Clearing Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Start Expo
echo "Starting Expo development server..."
echo "Press 'i' for iOS simulator, 'a' for Android, or scan QR code with Expo Go app"
echo ""

npx expo start --clear
