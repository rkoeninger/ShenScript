const async = process.argv.includes('async');

const fs              = require('fs');
const { distPath }    = require('./config');
const { parseKernel } = require('./parser');
const backend         = require('../src/backend');
const {
  Arrow, Assign, Block, Identifier, Member, Program, RawIdentifier, Return, Statement,
  generate
} = require('../src/ast');

const { defuns, statements } = parseKernel();
const { compile } = backend({ async });

const syntax =
  generate(Program([Statement(Assign(
    Member(Identifier('module'), Identifier('exports')),
    Arrow(
      [RawIdentifier('$')],
      Block(
        ...defuns    .map(x => Statement(compile(x).expressions[0])),
        ...statements.map(x => Statement(compile(x))),
        Return(RawIdentifier('$'))),
      async)))]));

console.log(`${syntax.length} chars`);

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}

fs.writeFileSync(`${distPath}/kernel.${async ? 'async' : 'sync'}.js`, syntax);
