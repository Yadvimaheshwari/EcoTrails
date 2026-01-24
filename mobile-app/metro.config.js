const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce file watching overhead
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

// Optimize watcher
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
  },
};

module.exports = config;
