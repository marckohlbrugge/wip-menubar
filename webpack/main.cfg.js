const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

const { rules } = require('./rules');

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'electron-main',
  context: path.resolve(__dirname, '../src'),
  entry: path.resolve(__dirname, '../src/app.js'),
  output: {
    filename: 'electron-main.js',
  },
  module: {
    rules: [rules.node],
  },
  plugins: [
    new webpack.DefinePlugin({
      IS_PRODUCTION: JSON.stringify(true),
    }),
    // new BundleAnalyzerPlugin(),
  ],
};
