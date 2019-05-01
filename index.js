const async = true;

const { top }  = require('./lib/utils');
const config   = require('./lib/config.web');
const backend  = require('./lib/backend');
const kernel   = require(`./dist/kernel.${async ? 'async' : 'sync'}`);
const frontend = require('./lib/frontend.web');

const options = { ...config, async };

(async () => {
  try {
    const start = new Date().getTime();
    console.log('creating shen environment...');
    top.shen = frontend(await kernel(backend(options)));
    const end = new Date().getTime();
    console.log(`environment created in ${end - start}ms.`);
  } catch (e) {
    console.error(e);
  }
})();
