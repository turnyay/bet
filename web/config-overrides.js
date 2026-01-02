const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "process": require.resolve("process/browser.js"),
  };

  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': require.resolve('process/browser.js'),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  // Disable fork-ts-checker-webpack-plugin to avoid RPC errors
  if (config.plugins) {
    config.plugins = config.plugins.filter(
      plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
    );
  }

  // Configure watch options to use polling instead of file watchers
  // This prevents ENOSPC errors by not using inotify file watchers
  config.watchOptions = {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/build/**',
      '**/dist/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.yarn/**',
      '**/target/**',
      '**/.anchor/**',
    ],
    aggregateTimeout: 300,
    poll: 1000, // Poll every 1 second instead of using file watchers
  };

  return config;
};

