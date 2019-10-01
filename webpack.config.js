const path = require('path');

module.exports = env => ({
  mode: env.mode,
  entry: env && env.node ? './shen.js' : './index.js',
  output: {
    path: path.resolve(__dirname, env && env.node ? 'dist/node' : 'dist/web'),
    filename: env && env.node ? 'shen.js' : 'index.js'
  },
  stats: {
    warningsFilter: w => w.includes('the request of a dependency is an expression')
  }
});
