const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

// const loaders = require('./rules');

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'electron-main',
  context: path.resolve(__dirname, '../src'),
  entry: path.resolve(__dirname, '../src/test.js'),
  output: {
    filename: 'electron-main.js',
  },
  plugins: [
    new webpack.CleanPlugin(),
    new webpack.DefinePlugin({
      IS_PRODUCTION: true,
    }),
    // new BundleAnalyzerPlugin(),
  ],
};
