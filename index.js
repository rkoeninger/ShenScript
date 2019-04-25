const backend  = require('./src/backend');
const kernel   = require('./dist/kernel.async');
const frontend = require('./src/frontend.web');

const shen = async (options = {}) => frontend(await kernel(backend(options)));

module.exports = { shen };
