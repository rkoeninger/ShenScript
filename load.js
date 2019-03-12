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

const OutStream = class {
  write(b) {
    return process.stdout.write(String.fromCharCode(b));
  }
};

const stoutput = new OutStream();

let home = () => '';
const $ = kl({
  implementation: 'node',
  release: process.version.slice(1),
  os: process.platform,
  port: 'shen-script',
  porters: 'Robert Koeninger',
  openRead: path => new BufferStream(fs.readFileSync(home() + path)),
  isInStream: x => x instanceof BufferStream,
  isOutStream: x => x instanceof OutStream,
  stoutput
});
home = () => $.symbols['*home-directory*'];
const load = expr => $.trap(() => $.evalKl(expr), e => (console.log(expr), console.log(e)));
const s = parts => $.s(parts[0]);

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

console.log($.evalKl([s`function`, s`thaw`]));

// TODO: macros aren't getting added to macroreg, instead undefined is
console.log($.settle($.f.eval($.settle($.f['read-from-string']('(define inc X -> (+ 1 X))')))));
console.log($.evalKl([s`function`, s`inc`]));

// console.log($.consToArray($.symbols['*macros*']));
// try {
//   console.log($.evalKl([s`eval`, [s`read-from-string`, '(defmacro plus-macro [X + Y] -> [+ X Y])']]));
// } catch (e) {
//   console.log(e);
// }
// console.log($.consToArray($.symbols['*macros*']));

// console.log($.evalKl([s`cd`, './kernel/tests']));
// console.log($.evalKl([s`load`, 'README.shen']));
// console.log($.evalKl([s`load`, 'tests.shen']));

module.exports = $;
