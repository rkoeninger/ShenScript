const async = process.argv.includes('async');

const fs = require('fs');
const {
  Arrow, Assign, Block, Identifier, Member, Program, RawIdentifier, Return, Statement,
  generate
} = require('../src/ast');
const backend = require('../src/backend');
const { parse } = require('./parser');
const { compile, s } = backend({ async });

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === s`defun` ? defuns : statements).push(expr);
  }
}));

const syntax =
  generate(Program([Statement(Assign(
    Member(Identifier('module'), Identifier('exports')),
    Arrow(
      [RawIdentifier('$')],
      Block(
        ...defuns.map(x => Statement(compile(x).expressions[0])),
        ...statements.map(x => Statement(compile(x))),
        Return(RawIdentifier('$'))),
      async)))]));

console.log(`${syntax.length} chars`);
fs.writeFileSync(`./dist/kernel_${async ? 'async' : 'sync'}.js`, syntax, 'utf-8');
