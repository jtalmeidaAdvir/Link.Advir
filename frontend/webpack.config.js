const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Suprimir avisos de source maps
  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Module not found: Can't resolve 'vm'/,
    /Module not found: Can't resolve 'fs'/,
  ];

  // Configurar fallbacks para módulos Node.js
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    "vm": false,
    "fs": false,
  };

  return config;
};