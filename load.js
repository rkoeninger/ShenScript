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
    console.log(expr);
    const ast = env.build({ locals: new Set(), head: true, expression: true }, expr);
    console.log(ast);
    console.log(generate(ast));
    console.log(e);
  }
};

console.log('================================================================================');
console.log('defuns...');
defuns.forEach(load);
console.log('================================================================================');
console.log('setups...');
setups.forEach(load);
