const fs = require('fs');
const backend = require('./src/backend');
const { parse } = require('./parser');

const InStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() { return this.pos >= this.buf.length ? -1 : this.buf[this.pos++]; }
  close() {}
};

const OutStream = class {
  write(b) { return process.stdout.write(String.fromCharCode(b)); }
};

const stoutput = new OutStream();

let home = () => '';
const $ = backend({
  async: true,
  implementation: 'node',
  release: process.version.slice(1),
  os: process.platform,
  port: 'shen-script',
  porters: 'Robert Koeninger',
  openRead: path => new InStream(fs.readFileSync(home() + path)),
  isInStream: x => x instanceof InStream,
  isOutStream: x => x instanceof OutStream,
  stoutput,
  sterror: stoutput
});
const { evalKl, symbolOf, symbols, trap } = $;
home = () => symbols['*home-directory*'];
const s = parts => symbolOf(parts[0]);

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

const loadGroup = async (name, exprs) => {
  const start = Date.now();
  let i = 0;
  for (let expr of exprs) {
    process.stdout.write(`${name}: loading ${i++ + 1}/${exprs.length}...`);
    try {
      await evalKl(expr);
    } catch (e) {
      console.log(expr);
      console.log(e);
    }
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }
  process.stdout.write(`${name}: ${exprs.length} loaded in ${Date.now() - start}ms\n`);
};

(async () => {
  await loadGroup('defuns', defuns);
  await loadGroup('statements', statements);
  console.log(await evalKl([s`cd`, './kernel/tests']));
  console.log(await evalKl([s`load`, 'README.shen']));
  console.log(await evalKl([s`load`, 'tests.shen']));
})();

// module.exports = $;
