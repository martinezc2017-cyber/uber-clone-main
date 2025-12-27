const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Align web bundling to use react-native-web for any react-native imports.
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-native': 'react-native-web',
    'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
  };

  // Ensure platform-specific extensions are resolved on web builds.
  config.resolve.extensions = [
    '.web.js',
    '.web.ts',
    '.web.tsx',
    '.native.js',
    '.native.ts',
    '.native.tsx',
    '.android.js',
    '.ios.js',
    ...(config.resolve.extensions || []),
  ];

  return config;
};
