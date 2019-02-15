const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');

const files = [
  'toplevel',
  'core',
  'sys',
  'dict',
  'sequent',
  'yacc',
  'reader',
  'prolog',
  'track',
  'load',
  'writer',
  'macros',
  'declarations',
  'types',
  't-star'
];

const fs = require('fs');

files.forEach(file => console.log(parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8'))));
