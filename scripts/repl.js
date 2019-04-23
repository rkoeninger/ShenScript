const fs                    = require('fs');
const { addAsyncFunctions } = require('awaitify-stream');
const config                = require('./config.node');
const { parseKernel }       = require('./parser');
const backend               = require('../src/backend');

const InStream = class {
  constructor(stream, name) {
    this.name = name;
    this.stream = addAsyncFunctions(stream);
    this.buf = '';
    this.pos = 0;
  }
  async read() {
    if (this.pos < this.buf.length) {
      return this.buf[this.pos] === 13 ? (this.pos++, this.read()) : this.buf[this.pos++];
    }
    const b = await this.stream.readAsync();
    return b === null ? -1 : (this.buf = b, this.pos = 0, this.read());
  }
  close() { return this.stream.close(); }
};

const OutStream = class {
  constructor(stream, name) {
    this.name = name;
    this.stream = stream;
  }
  write(b) { return this.stream.write(String.fromCharCode(b)); }
  close() { return this.stream.close(); }
};

const { evalKl, symbols, s, fun, functions, asNumber } = backend({
  ...config,
  async: true,
  openRead: path => new InStream(fs.createReadStream(path), `filein=${path}`),
  openWrite: path => new OutStream(fs.createWriteStream(path), `fileout=${path}`),
  isInStream: x => x instanceof InStream,
  isOutStream: x => x instanceof OutStream,
  stinput: new InStream(process.stdin, 'stinput'),
  stoutput: new OutStream(process.stdout, 'stoutput'),
  sterror: new OutStream(process.stderr, 'sterror')
});

const { defuns, statements } = parseKernel();

const loadGroupAsync = async (name, exprs) => {
  const start = Date.now();
  let i = 0;
  console.log(`${name}: loading...`);
  for (let expr of exprs) {
    try {
      await evalKl(expr);
    } catch (e) {
      console.log(expr);
      console.log(e);
    }
  }
  console.log(`${name}: ${exprs.length} loaded in ${Date.now() - start}ms`);
};

(async () => {
  await loadGroupAsync('defuns', defuns);
  await loadGroupAsync('statements', statements);
  functions['shen-script.exit'] = fun(X => process.exit(asNumber(X)));
  await evalKl([s`shen.shen`]);
})();
