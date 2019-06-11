const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const {
  Arrow, Assign, Block, Identifier, Member, Program, RawIdentifier, Return, Statement,
  generate
} = require('../lib/ast');
const { flatMap } = require('../lib/utils');

const { defuns, statements } = parseKernel();

const render = async => {
  const { compile } = backend({ async });
  const toStatements = fab => [...fab.statements, Statement(fab.expression)];
  const syntax =
    generate(Program([Statement(Assign(
      Member(Identifier('module'), Identifier('exports')),
      Arrow(
        [RawIdentifier('$')],
        Block(
          // TODO: top-level defuns and statements all start in ignore situation
          ...flatMap([...defuns, ...statements], x => toStatements(compile(x))),
          Return(RawIdentifier('$'))),
        async)))]), { indent: '  ' }); // TODO: try to render each expr on a single line if possible

  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
};

render(false);
render(true);
