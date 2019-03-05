const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');
const env = kl();
const defuns = [];
const setups = [];
const debris = [];

[
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
].forEach(file =>
  parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr =>
    (!Array.isArray(expr) ? debris : expr[0] === env.symbolOf('defun') ? defuns : setups).push(expr)));

const str = x =>
  env.isSymbol(x) ? env.nameOf(x) :
  env.isString(x) ? `"${x}"` :
  env.isNumber(x) ? `${x}` :
  env.isArray(x) ? `(${x.map(str).join(' ')})` :
  env.raise('invalid syntax');

const load = expr => {
  try {
    env.evalKl(env.context, env, expr);
    // if (expr[1] === env.symbolOf('declare')) {
    //   console.log(generate(env.build(env.context, expr)));
    // }
  } catch (e) {
    // console.log('--------------------------------------------------------------------------------');
    // console.log(str(expr));
    // const ast = env.build(env.context, expr);
    // console.log(ast);
    // console.log(generate(ast));
    console.log(e.message);
  }
};

// const fexpr = parse('(lambda X (qwerty X))')[0];
// const fast = env.build(env.context, fexpr);
// const fstring = generate(fast);
// const fval = env.evalKl(env.context, env, fexpr);
// console.log(fexpr);
// console.log(fast);
// console.log(fstring);
// console.log(fval);
// console.log(env.isFunction(fval));

console.log('================================================================================');
console.log('defuns...');
defuns.forEach(load);
console.log('================================================================================');
console.log('setups...');
setups.forEach(load);

console.log(env.symbols['shen.*demodulation-function*']);
