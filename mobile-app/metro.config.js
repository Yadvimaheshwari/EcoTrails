const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce file watching overhead - exclude node_modules from watching
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

// Optimize watcher to reduce file handles
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
  },
  // Reduce the number of files watched
  watchman: {
    deferStates: ['hg.update'],
  },
};

// Exclude large directories from watching
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
