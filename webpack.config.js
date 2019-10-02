const path = require('path');

module.exports = env => ({
  mode: env.mode,
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist/' + env.mode),
    filename: 'index.js'
  },
  stats: {
    warningsFilter: w => w.includes('the request of a dependency is an expression')
                      || w.includes('exceed')
  }
});
