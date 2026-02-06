// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Resolve @ecotrails/shared/design to the local shared design module
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@ecotrails/shared': path.resolve(__dirname, 'src/shared'),
};

module.exports = config;
