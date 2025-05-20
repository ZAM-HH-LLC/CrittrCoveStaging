module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
        systemvars: true,
      }],
      '@babel/plugin-transform-template-literals',
      '@babel/plugin-transform-export-namespace-from',
      'react-native-paper/babel'
    ]
  };
};
