const fs = require('fs');
const { generate } = require('astring');
const backend = require('./src/backend');
const { parse } = require('./parser');
const { compile, symbolOf } = backend();

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === symbolOf('defun') ? defuns : statements).push(expr);
  }
}));

const body = [].concat(defuns, statements).map(compile);

const syntax = generate({ type: 'Program', body });

console.log(`${syntax.length} chars`);

fs.writeFileSync(`./dist/kernel.js`, syntax, 'utf-8');
