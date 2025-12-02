const { getDefaultConfig } = require('metro-react-native-babel-preset');

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
