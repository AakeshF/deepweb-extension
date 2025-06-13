/**
 * Webpack configuration for Firefox WebExtension
 */

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: argv.mode || 'production',
    devtool: isDevelopment ? 'source-map' : false,
    
    entry: {
      'background': './src/background/index.js',
      'content/content-firefox': './src/content/index.js',
      'popup/popup-firefox': './src/popup/index.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json' },
          { from: 'icons', to: 'icons' },
          { from: 'popup/popup.html', to: 'popup' },
          { from: 'content/styles-secure.css', to: 'content' },
          { from: '_locales', to: '_locales', noErrorOnMissing: true }
        ]
      })
    ],
    
    optimization: {
      minimize: !isDevelopment,
      moduleIds: 'deterministic'
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@api': path.resolve(__dirname, 'src/api')
      }
    },
    
    performance: {
      hints: isDevelopment ? false : 'warning',
      maxAssetSize: 500000,
      maxEntrypointSize: 500000
    },
    
    watchOptions: {
      ignored: /node_modules/
    }
  };
};