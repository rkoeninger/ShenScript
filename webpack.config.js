const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = env => ({
  mode: env.mode,
  entry: env.mode === 'development' ? './index.development.js' : './index.js',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        }
      })
    ]
  },
  module: {
    rules: [
      {
        test: x => !x.includes('kernel.'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-proposal-object-rest-spread']
          }
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: env.mode === 'development' ? 'shen-script.js' : 'shen-script.min.js'
  },
  stats: {
    warningsFilter: w => w.includes('the request of a dependency is an expression')
                      || w.includes('exceed')
  }
});
