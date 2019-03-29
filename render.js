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

// TODO: in async mode, toplevel statements are in awaits even though init function is not async

const syntax = generate({
  type: 'Program',
  body: [{
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'module' },
        property: { type: 'Identifier', name: 'exports' }
      },
      right: {
        type: 'ArrowFunctionExpression',
        params: [{ type: 'Identifier', name: '$' }],
        body: {
          type: 'BlockStatement',
          body: [].concat([].concat(defuns, statements).map(compile), [{
            type: 'ReturnStatement',
            argument: { type: 'Identifier', name: '$' }
          }])
        }
      }
    }
  }]
});

console.log(`${syntax.length} chars`);
fs.writeFileSync(`./dist/kernel_${async ? 'async' : 'sync'}.js`, syntax, 'utf-8');
