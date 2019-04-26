const { top }  = require('./lib/utils');
const backend  = require('./lib/backend');
const kernel   = require('./dist/kernel.sync');
const frontend = require('./lib/frontend.web');

const options = {

};

(async () => {
  console.log('creating shen environment...');
  top.shen = frontend(await kernel(backend(options)));
  console.log('environment created.');
})();
