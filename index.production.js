const ShenBase = require('./lib/shen.js');
const { StringInStream } = require('./lib/utils.js');

const openRead = path => fetch(path).then(x => x.text()).then(x => new StringInStream(x));

window.Shen = class extends ShenBase {
  constructor(options) {
    super({ async: true, target: 'web', openRead, InStream: StringInStream, ...options });
  }
};
