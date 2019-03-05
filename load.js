const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');
const env = kl();
const defuns = [];
const setups = [];
const debris = [];

const load = expr => {
  try {
    env.evalKl(env.context, env, expr);
    if (expr[1] === env.symbolOf('shen.walk')) {
      console.log(expr);
      console.log(env.build(env.context, expr));
      console.log(generate(env.build(env.context, expr)));
    }
  } catch (e) {
    // console.log('--------------------------------------------------------------------------------');
    // const ast = env.build(env.context, expr);
    // console.log(ast);
    // console.log(generate(ast));
    // console.log(e);
  }
};

[
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
].forEach(file =>
  parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr =>
    (!Array.isArray(expr) ? debris : expr[0] === env.symbolOf('defun') ? defuns : setups).push(expr)));

defuns.forEach(load);
setups.forEach(load);

// console.log(env.symbols['shen.*demodulation-function*']);

console.log(env.functions.eval(env.settle(env.functions['read-from-string']('(+ 1 2)')).head));
console.log(env.settle(env.functions.eval(env.settle(env.functions['read-from-string']('(+ 1 2)')).head)));
