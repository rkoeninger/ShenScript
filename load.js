const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');
const env = kl();
const load = expr =>
  env.trap(
    () => {
      if (Array.isArray(expr) && expr[0] === env.symbolOf('shen.initialise_arity_table')) {
        // TODO: stack overflow caused just by building cons chain
        console.log('intercepting shen.initialise_arity_table');
        const aritySymbol = env.symbolOf('arity');
        let x = expr[1];
        while (Array.isArray(x) && x.length > 0) {
          env.settle(env.functions.put(x[1], aritySymbol, x[2][1]));
          x = x[2][2];
        }
      } else {
        env.evalKl(env.context, env, expr);
      }
    },
    e => {
      console.log(expr[0] === env.symbolOf('defun') || expr[0] === env.symbolOf('declare') ? `${expr[0]} ${expr[1]}` : expr);
      console.log(e);
    });

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(load));

module.exports = env;
