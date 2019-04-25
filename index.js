const backend  = require('./lib/backend');
const kernel   = require('./dist/kernel.async');
const frontend = require('./lib/frontend.web');

const shen = async (options = {}) => frontend(await kernel(backend(options)));

module.exports = { shen };
