const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core');
const { parse } = require('./parser');
const StaticStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() {
    return this.buf[this.pos++];
  }
  close() {
  }
}
const env = kl({
  openRead: path => new StaticStream(fs.readFileSync('./kernel/tests/' + path)),
  isInStream: x => x instanceof StaticStream,
  stoutput: {
    write: x => process.stdout.write(x)
  }
});
const load = expr => env.trap(() => env.evalKl(expr), console.log);

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === env.symbolOf('defun') ? defuns : statements).push(expr);
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

env.evalKl([env.symbolOf('cd'), './kernel/tests']);
env.evalKl([env.symbolOf('load'), 'README.shen']);
env.evalKl([env.symbolOf('load'), 'tests.shen']);

module.exports = env;
