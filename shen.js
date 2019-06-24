const { language, port, porters, kernelVersion } = require('./lib/config');

module.exports = (options = {}) => {
  if (options.async === undefined) {
    throw new Error(`options.async must be specified, not "${options.async}"`);
  }

  if (options.platform !== 'node' && options.platform !== 'web') {
    throw new Error(`options.platform must be either "node" or "web", not "${options.platform}"`);
  }

  const backend = require('./lib/backend');
  const config = require(`./lib/config.${options.platform}`);
  const kernel = require(`./dist/kernel.${options.async ? 'async' : 'sync'}`);
  const frontend = require(`./lib/frontend.${options.platform}`);
  const $ = kernel(backend({ ...config, ...options }));
  return options.async ? $.then(frontend) : frontend($);
};
