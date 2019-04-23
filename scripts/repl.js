const fs                    = require('fs');
const { addAsyncFunctions } = require('awaitify-stream');
const config                = require('./config.node');
const backend               = require('../src/backend');
const kernel                = require('../dist/kernel.async');
const frontend              = require('../src/frontend.node');

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

(async () => {
  const { evalShen, s } = frontend(await kernel(backend({
    ...config,
    async: true,
    InStream,
    OutStream,
    openRead:  path => new InStream(fs.createReadStream(path), `filein=${path}`),
    openWrite: path => new OutStream(fs.createWriteStream(path), `fileout=${path}`),
    stinput:  new InStream(process.stdin, 'stinput'),
    stoutput: new OutStream(process.stdout, 'stoutput'),
    sterror:  new OutStream(process.stderr, 'sterror')
  })));
  await evalShen([s`shen.shen`]);
})().then(console.log, console.error);
