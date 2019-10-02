const shen = require('./lib/shen.js');
const { StringInStream } = require('./lib/utils.js');

const openRead = path => fetch(path).then(x => x.text()).then(x => new StringInStream(x));
const options = { async: true, target: 'web', openRead, InStream: StringInStream };
shen(options).then(x => window.shen = x, e => console.error(e));
