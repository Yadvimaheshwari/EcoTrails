#!/bin/bash
# Post-install script to create react-native-worklets alias
# This is needed because react-native-reanimated v4 expects 'react-native-worklets/plugin'
# but the package is named 'react-native-worklets-core'

cd "$(dirname "$0")/node_modules"

# Create symlink directory if it doesn't exist
mkdir -p react-native-worklets

# Create package.json for the alias
cat > react-native-worklets/package.json << 'EOF'
{
  "name": "react-native-worklets",
  "version": "1.0.0",
  "main": "../react-native-worklets-core/lib/commonjs/index",
  "plugin": "../react-native-worklets-core/plugin.js"
}
EOF

# Create symlink to plugin
ln -sf ../react-native-worklets-core/plugin.js react-native-worklets/plugin.js 2>/dev/null || true

echo "Created react-native-worklets alias for react-native-worklets-core"
