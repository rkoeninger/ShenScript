const async = true;

const config   = require('./lib/config.web');
const backend  = require('./lib/backend');
const kernel   = require(`./dist/kernel.${async ? 'async' : 'sync'}`);
const frontend = require('./lib/frontend.web');

const options = { ...config, async };

(async () => {
  try {
    const start = new Date().getTime();
    console.log('creating shen environment...');
    window.shen = frontend(await kernel(backend(options)));
    const end = new Date().getTime();
    const message = `environment created in ${end - start}ms.`;
    console.log(message);
    setTimeout(() => document.body.innerHTML = message, 0);
  } catch (e) {
    console.error(e);
  }
})();
