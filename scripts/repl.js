const fs = require('fs');
const { addAsyncFunctions } = require('awaitify-stream');
const backend = require('../src/backend');
const { parse } = require('../scripts/parser');

const InStream = class {
  constructor() {
    this.stream = addAsyncFunctions(process.stdin);
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
};

const OutStream = class {
  write(b) { return process.stdout.write(String.fromCharCode(b)); }
};

const InFileStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() { return this.pos >= this.buf.length ? -1 : this.buf[this.pos++]; }
  close() {}
};

const OutFileStream = class {
  constructor(stream) { this.stream = stream; }
  write(b) { return this.stream.write(String.fromCharCode(b)); }
  close() { return this.stream.close(); }
};

const stinput = new InStream();
const stoutput = new OutStream();

let home = () => '';
const $ = backend({
  async: true,
  implementation: 'Node.js',
  release: process.version.slice(1),
  os: process.platform,
  port: '0.1.0',
  porters: 'Robert Koeninger',
  openRead: path => new InFileStream(fs.readFileSync(home() + path)),
  openWrite: path => new OutFileStream(fs.createWriteStream(home() + path, { flags: 'w' })),
  isInStream: x => x instanceof InStream || x instanceof InFileStream,
  isOutStream: x => x instanceof OutStream || x instanceof OutFileStream,
  stinput,
  stoutput,
  sterror: stoutput
});
const { evalKl, symbols, s } = $;
home = () => symbols['*home-directory*'];

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === s`defun` ? defuns : statements).push(expr);
  }
}));

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
  $.f['shen-script.exit'] = $.fun(X => process.exit($.asNumber(X)));
  await evalKl([s`shen.shen`]);
})();
