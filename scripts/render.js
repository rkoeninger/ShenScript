const async = process.argv.includes('async');

const fs = require('fs');
const {
  Arrow, Assign, Block, Identifier, Member, Program, RawIdentifier, Return, Statement,
  generate
} = require('../src/ast');
const backend = require('../src/backend');
const { parseKernel } = require('./parser');
const { compile, s } = backend({ async });
const { defuns, statements } = parseKernel();

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

if (!fs.existsSync('./dist/')) {
  fs.mkdirSync('./dist/');
}

fs.writeFileSync(`./dist/kernel_${async ? 'async' : 'sync'}.js`, syntax, 'utf-8');
