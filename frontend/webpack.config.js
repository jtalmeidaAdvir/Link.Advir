const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Adicionar polyfills para "crypto" e "stream"
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify")
  };

  return config;
};
