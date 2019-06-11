const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const { flatMap }     = require('../lib/utils');
const {
  Arrow, Assign, Block, Member, Program, RawId, Return, Statement,
  generate
} = require('../lib/ast');
const { defuns, statements } = parseKernel();

const render = async => {
  const { compile } = backend({ async });
  const toStatements = fab => [...fab.statements, Statement(fab.expression)];
  const syntax =
    generate(Program([Statement(Assign(
      Member(RawId('module'), RawId('exports')),
      Arrow(
        [RawId('$')],
        Block(
          // TODO: top-level defuns and statements all start in ignore situation
          ...flatMap([...defuns, ...statements], x => toStatements(compile(x))),
          Return(RawId('$'))),
        async)))]), { indent: '  ' }); // TODO: try to render each expr on a single line if possible

  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
};

render(false);
render(true);
