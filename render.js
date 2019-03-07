const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core');
const { parse } = require('./parser');
const env = kl();

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

const body = [].concat(defuns, statements).map(expr => env.build(expr));

const syntax = generate({ type: 'Program', body });

console.log(`${syntax.length} chars`);

fs.writeFileSync(`./dist/kernel_2.js`, syntax, 'utf-8');
