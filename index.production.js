const ShenBase = require('./lib/shen.js');
const { StringInStream, fetchRead } = require('./lib/utils.js');

window.Shen = class extends ShenBase {
  constructor(options) {
    super({ openRead: fetchRead, InStream: StringInStream, ...options });
  }
};
