const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const { Arrow, Assign, Block, Id, Member, Program, Return, Statement, generate } = require('../lib/ast');
const { defuns, statements } = parseKernel();

const render = async => {
  const { compile } = backend({ async });
  const syntax = generate(
    Program([Statement(Assign(
      Member(Id('module'), Id('exports')),
      Arrow(
        [Id('$')],
        Block(...[...defuns, ...statements].map(compile).map(Statement), Return(Id('$'))),
        async)))]),
    { indent: '  ' }); // TODO: try to render each expr on a single line if possible

  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
};

render(false);
render(true);
