const path = require('path');

module.exports = env => ({
  mode: env.mode,
  entry: `./index.${env.mode}.js`,
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
    path: path.resolve(__dirname, 'dist/' + env.mode),
    filename: 'shenScript.js'
  },
  stats: {
    warningsFilter: w => w.includes('the request of a dependency is an expression')
                      || w.includes('exceed')
  }
});
