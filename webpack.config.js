const path = require('path');

module.exports = env => ({
  mode: env.mode,
  entry: env.mode === 'development' ? './index.development.js' : './index.js',
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
