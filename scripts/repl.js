const fs = require('fs');
const { addAsyncFunctions } = require('awaitify-stream');
const backend = require('../src/backend');
const { parse } = require('../scripts/parser');

const InStream = class {
  constructor(stream) {
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
  constructor(stream) {
    this.stream = stream;
  }
  write(b) { return this.stream.write(String.fromCharCode(b)); }
  close() { return this.stream.close(); }
};

let home = () => '';
const $ = backend({
  async: true,
  implementation: 'Node.js',
  release: process.version.slice(1),
  os: process.platform,
  port: '0.1.0',
  porters: 'Robert Koeninger',
  openRead: path => new InStream(fs.createReadStream(home() + path)),
  openWrite: path => new OutStream(fs.createWriteStream(home() + path)),
  isInStream: x => x instanceof InStream,
  isOutStream: x => x instanceof OutStream,
  stinput: new InStream(process.stdin),
  stoutput: new OutStream(process.stdout),
  sterror: new OutStream(process.stderr)
});
const { evalKl, symbols, s, fun, functions, asNumber } = $;
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
  functions['shen-script.exit'] = fun(X => process.exit(asNumber(X)));
  await evalKl([s`shen.shen`]);
})();
