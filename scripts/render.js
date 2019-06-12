const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const { flatMap }     = require('../lib/utils');
const { Arrow, Assign, Block, Id, Member, Program, Return, Statement, generate } = require('../lib/ast');
const { defuns, statements } = parseKernel();
const exprs = [...defuns, ...statements];

const render = async => {
  const { compile } = backend({ async });
  const syntax = generate(
    Program([Statement(Assign(
      Member(Id('module'), Id('exports')),
      Arrow(
        [Id('$')],
        Block(
          // TODO: top-level defuns and statements all start in ignore situation
          ...flatMap(exprs.map(compile), fabr => [...fabr.statements, Statement(fabr.expression)]),
          Return(Id('$'))),
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
