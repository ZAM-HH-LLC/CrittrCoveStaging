const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddBabelTransformContentToConfig: true
    }
  }, argv);
  
  // Ensure proper handling of client-side routing for pre-rendering
  config.output.publicPath = '/';
  
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

  // Add fallback for client-side routing
  if (config.devServer) {
    config.devServer.historyApiFallback = {
      index: '/index.html',
      rewrites: [
        // SEO landing pages
        { from: /^\/dog-boarding-colorado-springs/, to: '/index.html' },
        { from: /^\/dog-walker-colorado-springs/, to: '/index.html' },
        { from: /^\/cat-sitting-colorado-springs/, to: '/index.html' },
        { from: /^\/exotic-pet-care-colorado-springs/, to: '/index.html' },
        { from: /^\/ferret-sitter-colorado-springs/, to: '/index.html' },
        { from: /^\/bird-boarding-colorado-springs/, to: '/index.html' },
        { from: /^\/horse-sitting-colorado/, to: '/index.html' },
        { from: /^\/reptile-sitter-colorado-springs/, to: '/index.html' },
        { from: /^\/pet-boarding-colorado-springs/, to: '/index.html' },
        { from: /^\/dog-sitting-colorado-springs/, to: '/index.html' },
        // Other routes
        { from: /^\/signin/, to: '/index.html' },
        { from: /^\/signup/, to: '/index.html' },
        { from: /^\/dashboard/, to: '/index.html' },
        { from: /^\/message-history/, to: '/index.html' },
        { from: /^\/search-professionals/, to: '/index.html' },
        { from: /^\/my-profile/, to: '/index.html' },
        { from: /^\/contact-us/, to: '/index.html' },
        { from: /^\/blog/, to: '/index.html' },
        { from: /^\/privacy-policy/, to: '/index.html' },
        { from: /^\/terms-of-service/, to: '/index.html' },
        { from: /^\/help-faq/, to: '/index.html' },
        { from: /^\/waitlist/, to: '/index.html' },
        { from: /^\/site-map/, to: '/index.html' },
        { from: /^\/site-map\.html/, to: '/site-map.html' }
      ]
    };
  }

  return config;
};
