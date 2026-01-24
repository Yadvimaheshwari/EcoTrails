const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Aggressively exclude node_modules from watching
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /\.git\/.*/,
  /\.expo\/.*/,
  /\.metro\/.*/,
  // Don't block dist/ in node_modules (needed for packages like memoize-one)
  // /dist\/.*/,
];

// Optimize watcher - use Watchman if available, otherwise reduce file watching
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
  },
  watchman: {
    deferStates: ['hg.update'],
  },
  // Reduce polling interval and exclude patterns
  additionalExts: ['cjs', 'mjs'],
  ignore: [
    /node_modules\/.*\/node_modules\/.*/,
    /\.git\/.*/,
    /\.expo\/.*/,
    /\.metro\/.*/,
    // Don't ignore dist/ in node_modules (needed for packages like memoize-one)
    // /dist\/.*/,
  ],
};

// Exclude large directories from watching
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
