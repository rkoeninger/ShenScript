module.exports = (options = {}) => {
  const { async, target } = options;

  if (async === undefined) {
    throw new Error(`options.async must be specified, not "${async}"`);
  }

  if (target !== 'node' && target !== 'web') {
    throw new Error(`options.target must be either "node" or "web", not "${target}"`);
  }

  const backend = require('./lib/backend');
  const config = require(`./lib/config.${target}`);
  const kernel = require(`./dist/kernel.${async ? 'async' : 'sync'}`);
  const frontend = require(`./lib/frontend.${target}`);

  return async
    ? (async () => await frontend(await kernel(backend({ ...config, ...options }))))()
    : frontend(kernel(backend({ ...config, ...options })));
};
