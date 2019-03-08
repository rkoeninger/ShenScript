const fs = require('fs');
const { kl } = require('./refactor/core');
const { parse } = require('./parser');

const BufferStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() { return this.pos >= this.buf.length ? -1 : this.buf[this.pos++]; }
  close() {}
};

let home = () => '';
const $ = kl({
  implementation: 'node',
  release: process.version.slice(1),
  os: process.platform,
  port: 'shen-script',
  porters: 'Robert Koeninger',
  openRead: path => new BufferStream(fs.readFileSync(home() + path)),
  isInStream: x => x instanceof BufferStream,
  stoutput: { write: x => process.stdout.write(String.fromCharCode(asNumber(x))) }
});
home = () => $.symbols['*home-directory*'];
const load = expr => $.trap(() => $.evalKl(expr), console.log);

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === $.symbolOf('defun') ? defuns : statements).push(expr);
  }
}));

const loadGroup = (name, exprs) => {
  const start = Date.now();
  exprs.forEach((expr, i) => {
    process.stdout.write(`${name}: loading ${i + 1}/${exprs.length}...`);
    load(expr);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  });
  process.stdout.write(`${name}: ${exprs.length} loaded in ${Date.now() - start}ms\n`);
};

loadGroup('defuns', defuns);
loadGroup('statements', statements);

// console.log($.evalKl([$.s('cd'), './kernel/tests']));
// console.log($.evalKl([$.s('load'), 'README.shen']));
// console.log($.evalKl([$.s('load'), 'tests.shen']));

$.evalKl(parse('(print "hi")')[0]);

module.exports = $;
