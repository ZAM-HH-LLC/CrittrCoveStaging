const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddBabelTransformContentToConfig: true
    }
  }, argv);
  
  // Add polyfills and aliases
  if (config.resolve) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      'react-native-maps': 'react-native-web-maps',
      '@stripe/stripe-react-native': '@stripe/stripe-js',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      vm: false
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: false
    };
  }

  // Optimize performance
  config.performance = {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  };

  return config;
};
