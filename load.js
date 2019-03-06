const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');
const env = kl();
const load = expr =>
  env.trap(
    () => env.evalKl(env.context, env, expr),
    x => {
      console.log(expr[0] === env.symbolOf('defun') || expr[0] === env.symbolOf('declare') ? expr[0] + ' ' + expr[1] : expr);
      console.log(x);
    });

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(load));

module.exports = env;
