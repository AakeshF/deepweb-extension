const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV === 'production';
const shouldAnalyze = process.env.ANALYZE === 'true';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'source-map',
  
  entry: {
    // Background script
    background: './background-firefox.js',
    
    // Content script with lazy loading
    content: './src/content/index.optimized.js',
    
    // Popup script
    popup: './popup/popup-firefox.js',
    
    // Separate chunks for heavy modules
    'content-components': {
      import: './content/components/index.js',
      dependOn: 'content'
    },
    'intelligence-modules': {
      import: './src/intelligence/index.js',
      dependOn: 'content'
    }
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    clean: true
  },
  
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: isProduction
            }
          ]
        }
      })
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
          reuseExistingChunk: true
        },
        
        // Common modules used across multiple chunks
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          name: 'common'
        },
        
        // CSS extraction
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        }
      }
    },
    
    // Keep runtime chunk separate for better caching
    runtimeChunk: {
      name: 'runtime'
    },
    
    // Use deterministic module ids for better caching
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  firefox: '91'
                },
                modules: false,
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties'
            ],
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: false,
              importLoaders: 1
            }
          }
        ]
      }
    ]
  },
  
  plugins: [
    // Extract CSS to separate files in production
    ...(isProduction ? [
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[id].[contenthash:8].css'
      })
    ] : []),
    
    // Copy static assets
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup/popup.html', to: 'popup/popup.html' },
        { from: 'popup/popup-secure.html', to: 'popup/popup-secure.html' },
        { from: 'icons', to: 'icons' },
        { from: 'content/templates', to: 'content/templates' },
        { from: 'content/styles', to: 'content/styles' }
      ]
    }),
    
    // Bundle analyzer
    ...(shouldAnalyze ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: true
      })
    ] : [])
  ],
  
  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 250000,
    maxAssetSize: 250000
  },
  
  // Resolve optimizations
  resolve: {
    extensions: ['.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@content': path.resolve(__dirname, 'content'),
      '@components': path.resolve(__dirname, 'content/components'),
      '@utils': path.resolve(__dirname, 'content/utils'),
      '@intelligence': path.resolve(__dirname, 'src/intelligence'),
      '@security': path.resolve(__dirname, 'src/security')
    }
  },
  
  // Cache configuration for faster rebuilds
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    buildDependencies: {
      config: [__filename]
    }
  }
};