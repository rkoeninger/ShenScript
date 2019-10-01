module.exports = (options = {}) => {
  const { async, target } = options;

  if (async === undefined) {
    throw new Error(`options.async must be specified, not "${async}"`);
  }

  if (target !== 'node' && target !== 'web') {
    throw new Error(`options.target must be either "node" or "web", not "${target}"`);
  }

  const backend = require('./backend.js');
  const config = require(`./config.${target}.js`);
  const kernel = require(`../kernel/js/kernel.${async ? 'async' : 'sync'}.js`);
  const frontend = require(`./frontend.${target}.js`);

  return async
    ? (async () => await frontend(await kernel(backend({ ...config, ...options }))))()
    : frontend(kernel(backend({ ...config, ...options })));
};
