// use "webpack --config ./webpack.config.js"

const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  // base url;
  context: path.resolve(__dirname, '.'),
  entry: { 
    main: './src/zoomage.js',
  },
  mode: 'production',
  output: {
    filename: 'zoomage.min.js',
    path: path.resolve(__dirname, './dist'),
    publicPath: '',
    crossOriginLoading: 'anonymous',
    libraryExport: 'default',
    libraryTarget: 'window',  // used for export libraries;
    library: 'Zoomage',
  },
  // regard module as every single source file;
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [/src\/js/],
        loader: 'eslint-loader',
        // set the sequence to the top;
        enforce: 'pre',
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
      }
    ]
  },
  resolve: {
    /*
    alias: [{
      name: 'components',
      alias: './src/components/',
      onlyModule: true  // only used on standalone "components", not "components/path/...";
    }] */
    // mainFields: ["browser", "module", "main"] // -> web / webworker
    // mainFields: ["module", "main"] // -> web // -> others
    mainFields: ['jsnext:main', 'browser', 'main'],
    extensions: ['.js'],  // default import extension (require('./data') -> data.js/data.json);
    modules:['node_modules'],  // directories for searching modules;
    descriptionFiles: ['package.json'],
    enforceExtension: false,
    enforceModuleExtension: false
  },
  optimization: {
    minimizer: [new UglifyJsPlugin()],
  }
};
