/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next transpiles React Native / Expo packages for web.
  transpilePackages: [
    'expo',
    'expo-router',
    'react-native',
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-safe-area-context',
    'react-native-screens',
  ],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Ensure all react-native imports (including deep ones) resolve to web.
      'react-native': 'react-native-web',
      'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
    };

    // Add React Native platform extensions so Platform.* files resolve on web.
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
  },
};

module.exports = nextConfig;
