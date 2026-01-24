# Install Watchman to Fix "Too Many Open Files" Error

Watchman is a file watching service that's much more efficient than Node's built-in file watcher.

## Install Watchman

```bash
brew install watchman
```

## Verify Installation

```bash
watchman --version
```

## After Installation

Restart your Expo server:

```bash
cd mobile-app
./start-mobile.sh
```

Watchman will automatically be used by Metro bundler and should eliminate the "too many open files" error.

## Alternative: Increase System Limits (Temporary)

If you can't install Watchman, you can increase system limits:

```bash
# Check current limit
launchctl limit maxfiles

# Increase limit (requires restart to persist)
sudo launchctl limit maxfiles 65536 200000
```

Then restart your terminal and run the app again.
