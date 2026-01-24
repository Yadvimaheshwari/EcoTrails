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
  "main": "../react-native-worklets-core/lib/commonjs/index"
}
EOF

# Create plugin.js file that re-exports from core
# Use the actual plugin implementation from lib/commonjs/plugin/index.js
cat > react-native-worklets/plugin.js << 'EOF'
// Re-export the actual Babel plugin function from react-native-worklets-core
module.exports = require('../react-native-worklets-core/lib/commonjs/plugin/index.js');
EOF

echo "Created react-native-worklets alias for react-native-worklets-core"
