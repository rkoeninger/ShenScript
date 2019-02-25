const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const env = kl();
const { cons, symbolOf, valueToArrayTree } = env;
const evalKl = env.functions['eval-kl'];
const defuns = [];
const setups = [];
const debris = [];

files.forEach(file =>
  parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr =>
    (!Array.isArray(expr) ? debris : expr[0] === symbolOf('defun') ? defuns : setups).push(expr)));

const load = expr => {
  try {
    evalKl(expr);
  } catch (e) {
    console.log('--------------------------------------------------------------------------------');
    console.log(generate(env.build({ locals: new Set(), head: true, expression: true }, expr)));
    console.log(e);
  }
};

console.log('================================================================================');
console.log('defuns...');
defuns.forEach(load);
console.log('================================================================================');
console.log('setups...');
setups.forEach(load);

// const text = '(defun shen.dict (V3255) (cond ((< V3255 1) (simple-error (cn "invalid initial dict size: " (shen.app V3255 "" shen.s)))) (true (let D (absvector (+ 3 V3255)) (let Tag (address-> D 0 shen.dictionary) (let Capacity (address-> D 1 V3255) (let Count (address-> D 2 0) (let Fill (shen.fillvector D 3 (+ 2 V3255) ()) D))))))))';
// console.log(generate(env.build({ locals: new Set(), head: true, expression: true }, parse(text)[0])));
