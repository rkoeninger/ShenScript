const async = process.argv.includes('async');

const fs = require('fs');
const { generate } = require('astring');
const backend = require('./src/backend');
const { parse } = require('./parser');
const { compile, symbolOf } = backend({ async });

const files = [
  'toplevel', 'core',   'sys',          'dict',  'sequent',
  'yacc',     'reader', 'prolog',       'track', 'load',
  'writer',   'macros', 'declarations', 'types', 't-star'
];

const defuns = [];
const statements = [];

files.forEach(file => parse(fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8')).forEach(expr => {
  if (Array.isArray(expr) && expr.length > 0) {
    (expr[0] === symbolOf('defun') ? defuns : statements).push(expr);
  }
}));

const identifier = name => ({ type: 'Identifier', name });
const answer = argument => ({ type: 'ReturnStatement', argument });
const block = body => ({ type: 'BlockStatement', body });
const arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body });
const member = (object, property) => ({ type: 'MemberExpression', object, property });
const assign = (left, right) => ({ type: 'AssignmentExpression', operator: '=', left, right });
const statement = expression => ({ type: 'ExpressionStatement', expression });
const program = body => ({ type: 'Program', body });
const cleanupDefun = ast => ast.expressions[0];
const syntax =
  generate(program([statement(assign(
    member(identifier('module'), identifier('exports')),
    arrow(
      [identifier('$')],
      block([].concat(
        defuns.map(compile).map(cleanupDefun).map(statement),
        statements.map(compile).map(statement),
        [answer(identifier('$'))])),
      async)))]));

console.log(`${syntax.length} chars`);
fs.writeFileSync(`./dist/kernel_${async ? 'async' : 'sync'}.js`, syntax, 'utf-8');
