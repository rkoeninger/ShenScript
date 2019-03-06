const fs = require('fs');
const { generate } = require('astring');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');
const env = kl();

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const body = []
  .concat(...files.map(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8'))))
  .map(expr => env.build(env.context, expr));

const syntax = generate({ type: 'Program', body });

fs.writeFileSync(`./dist/kernel_2.js`, syntax, 'utf-8');
