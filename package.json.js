const path = require('path');

module.exports = {
  entry: {
    service_worker: './src/service_worker.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist/src'),
    filename: '[name].js'
  },
  mode: 'production',
  target: 'web',
  resolve: {
    alias: {
      '@tensorflow/tfjs-core': '@tensorflow/tfjs-core/dist/webcore.js',
      '@tensorflow/tfjs-backend-webgl': '@tensorflow/tfjs-backend-webgl/dist/backend_webgl.js'
    },
    fallback: {
      "path": false,
      "fs": false,
      "crypto": false,
      "util": false
    }
  }
};