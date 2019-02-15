const fs = require('fs');
const { kl } = require('./refactor/core.js');
const { parse } = require('./parser.js');

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

files.forEach(file => console.log(parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).length));
