const async = process.argv.includes('async');

const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const {
  Arrow, Assign, Block, Identifier, Member, Program, RawIdentifier, Return, Statement,
  generate
} = require('../lib/ast');

const { defuns, statements } = parseKernel();
const { compile } = backend({ async });

const syntax =
  generate(Program([Statement(Assign(
    Member(Identifier('module'), Identifier('exports')),
    Arrow(
      [RawIdentifier('$')],
      Block(
        // TODO: top-level defuns and statements all start in ignore situation
        ...defuns    .map(x => Statement(compile(x).expressions[0])),
        ...statements.map(x => Statement(compile(x))),
        Return(RawIdentifier('$'))),
      async)))]));

console.log(`${syntax.length} chars`);

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
