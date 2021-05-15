const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');

const { rules } = require('./rules');

function getEntries(chunks = ['vendor']) {
  const folders = ['oauth', 'preferences', 'compose'];

  const pages = [];
  const entries = {};

  for (const name of folders) {
    const base = path.resolve(__dirname, '../src', name, name);
    pages.push(
      new HtmlWebpackPlugin({
        inject: 'head',
        chunks: [...chunks, name],
        template: `${base}.html`,
        filename: `${name}.html`,
        minify: false,
      }),
    );
    entries[name] = `${base}.js`;
  }

  return { pages, entries };
}

const { pages, entries } = getEntries();
console.log('Total pages:', entries);

module.exports = function (env, argv) {
  const IS_PRODUCTION = argv.mode === 'production';

  /** @type {import('webpack').Configuration} */
  const cfg = {
    target: 'web',
    context: path.resolve(__dirname, '../src'),
    entry: {
      ...entries,
    },
    output: {
      filename: '[name].[fullhash].js',
      publicPath: '',
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        name: 'vendor',
      },
    },
    module: {
      rules: [rules.css, rules.file, rules.vue],
    },
    resolve: {
      extensions: ['.js', '.css', '.vue'],
    },
    plugins: [
      new MiniCssExtractPlugin(),
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        IS_PRODUCTION: JSON.stringify(IS_PRODUCTION),
      }),
      ...pages,
      // new BundleAnalyzerPlugin(),
    ],
  };

  return cfg;
};
