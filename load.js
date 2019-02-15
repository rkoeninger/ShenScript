const fs = require('fs');
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

files.forEach(file =>
  parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr =>
    (expr[0] === symbolOf('defun') ? defuns : setups).push(expr)));

const load = expr => {
  try {
    evalKl(expr);
  } catch (e) {
    console.log('--------------------------------------------------------------------------------');
    console.log(expr);
    console.log(e);
  }
};

console.log('================================================================================');
console.log('defuns...');
defuns.forEach(load);
console.log('================================================================================');
console.log('setups...');
setups.forEach(load);
