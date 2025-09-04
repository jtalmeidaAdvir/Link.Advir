const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Suprimir avisos de source maps
  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Module not found: Can't resolve 'vm'/,
    /Module not found: Can't resolve 'fs'/,
    /Critical dependency: the request of a dependency is an expression/,
  ];

  // Configurar fallbacks para módulos Node.js
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    "vm": false,
    "fs": false,
  };

  // Otimizações de produção
  if (env.mode === 'production') {
    // Code splitting e chunk optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000, // 244kb chunks
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
          expo: {
            test: /[\\/]node_modules[\\/]@expo[\\/]/,
            name: 'expo',
            chunks: 'all',
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
          },
        },
      },
    };

    // Tree shaking para remover código não utilizado
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
  }

  return config;
};