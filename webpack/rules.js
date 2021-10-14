{
  const path = require('path');
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');

  const file = {
    test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot)$/,
    loader: 'file-loader',
    options: {
      esModule: false,
      outputPath: 'assets',
      name: '[name].[contenthash].[ext]',
    },
    type: 'javascript/auto',
  };

  const vue = {
    test: /\.vue$/,
    loader: 'vue-loader',
  };

  const typescript = {
    test: /\.ts$/,
    loader: 'ts-loader',
  };

  const pug = {
    test: /\.pug$/,
    loader: [
      {
        loader: 'pug-loader',
        options: {
          pretty: true,
          root: path.resolve(__dirname, '../src/pug'),
        },
      },
    ],
  };

  const css = (function () {
    return {
      test: /\.(sa|sc|c)ss$/,
      use: [
        MiniCssExtractPlugin.loader,
        { loader: 'css-loader' },
        { loader: 'sass-loader' },
      ],
    };
  })();

  const node = {
    test: /.node$/,
    loader: 'node-loader',
  };

  exports.rules = {
    file,
    css,
    pug,
    typescript,
    node,
    vue,
  };
}
