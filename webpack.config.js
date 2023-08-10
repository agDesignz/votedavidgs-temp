const currentTask = process.env.npm_lifecycle_event;
// This variable will have a value of 'start' or 'build' -- the script we are running in our terminal, defined in the package.json file

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fse = require('fs-extra');

const postCSSPlugins = [
  require('postcss-import'),
  require('postcss-mixins'),
  require('postcss-simple-vars'),
  require('postcss-nested'),
  require('postcss-hexrgba'),
  require('autoprefixer')
]

class RunAfterCompile {
  apply(compiler) {
    compiler.hooks.done.tap('Copy Images', function() {
      fse.copySync('./app/assets/images', './docs/assets/images');
    });
  }
}
// This class is a plugin we just created for webpack. LESSON 62

let cssConfig = {
  test: /\.css$/i,
  use: [ {
    loader: "css-loader",
    options: {
      url: false
    }
  }, {
    loader: "postcss-loader",
    options: {
      postcssOptions: {
        plugins: postCSSPlugins
      }
    }
  }]
}

let pages = fse.readdirSync('./app').filter(function(file) {
  return file.endsWith('.html')
}).map(function(page) {
  return new HtmlWebpackPlugin({
    filename: page,
    template: `./app/${page}`
  })
})
// This variable is to use fs-extra to copy over multiple html files to the 'docs' folder
// LESSON 62 !!!!!!

let config = {
  entry: './app/assets/scripts/App.js',
  plugins: pages, // This will be an array where we use the fs-extra plugin once for each HTML file
  module: {
    rules: [
      cssConfig
    ]
  }
};

if (currentTask == 'start') {
  cssConfig.use.unshift('style-loader');
  config.output = {
    filename: 'bundled.js',
    path: path.resolve(__dirname, 'app')
  };
  config.devServer = {
    watchFiles: ['./app/**/*.html'],
    static: {
      directory: path.join(__dirname, 'app'),
      watch: false
    },
    hot: true,
    // liveReload: false,
    port: 3000,
    host: '0.0.0.0'
  }
  config.mode = 'development';
}

if (currentTask == 'build') {
  config.module.rules.push({
    test: /\.js$/,
    exclude: /(node_modules)/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env']
      }
    }
  })
  cssConfig.use.unshift(MiniCssExtractPlugin.loader)
  config.output = {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'docs'),
    clean: true // Deletes older files
  }
  config.mode = 'production';
  config.optimization = {
    splitChunks: {
      chunks: 'all'
    },
    minimize: true,
    minimizer: [`...`, new CssMinimizerPlugin()]
  }
  config.plugins.push(
    new MiniCssExtractPlugin({filename: 'styles.[chunkhash].css'}),
    new RunAfterCompile()
    )
}

module.exports = config;