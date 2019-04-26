const { top }  = require('./lib/utils');
const config   = require('./lib/config.web');
const backend  = require('./lib/backend');
const kernel   = require('./dist/kernel.sync');
const frontend = require('./lib/frontend.web');

const options = { ...config };

(async () => {
  try {
    console.log('creating shen environment...');
    top.shen = frontend(await kernel(backend(options)));
    console.log('environment created.');
  } catch (e) {
    console.error(e);
  }
})();
