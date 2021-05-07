{
  const path = require('path');
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');

  const file = {
    test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot)$/,
    loader: 'file-loader',
    options: {
      esModule: false,
      outputPath: 'assets/static',
      name: '[name].[contenthash].[ext]',
    },
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

  const css = (function() {
    return {
      test: /\.(sa|sc|c)ss$/,
      use: [
        MiniCssExtractPlugin.loader,
        { loader: 'css-loader' },
        { loader: 'sass-loader' },
      ],
    };
  })();

  exports.rules = {
    file,
    css,
    pug,
    typescript,
  };
}
