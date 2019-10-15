module.exports = class Shen {
  constructor (options = {}) {
    const target = typeof process === 'undefined' ? 'web' : 'node';
    const backend = require('./backend.js');
    const config = require(`./config.${target}.js`);
    const kernel = require('./kernel.js');
    const frontend = require(`./frontend.${target}.js`);
    return kernel(backend({ ...config, ...options })).then(frontend);
  }
};
