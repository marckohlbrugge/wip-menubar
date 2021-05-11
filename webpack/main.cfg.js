const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const { rules } = require('./rules');

module.exports = function(env, argv) {
  const IS_PRODUCTION = argv.mode === 'production';

  /** @type {import('webpack').Configuration} */
  const cfg = {
    target: 'electron-main',
    context: path.resolve(__dirname, '../src'),
    entry: {
      'electron-main': path.resolve(__dirname, '../src/app.js'),
      'electron-preload': path.resolve(__dirname, '../src/preload.js'),
    },
    output: {
      filename: '[name].js',
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        name: 'main-vendor',
      },
    },
    module: {
      rules: [rules.node],
    },
    plugins: [
      new CopyPlugin({
        patterns: [{ from: 'icons', to: 'icons' }],
      }),
      new webpack.DefinePlugin({
        IS_PRODUCTION: JSON.stringify(IS_PRODUCTION),
      }),
      // new BundleAnalyzerPlugin(),
    ],
  };

  return cfg;
};
