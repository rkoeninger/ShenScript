const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const { Arrow, Assign, Block, Id, Member, Program, Return, Statement, generate } = require('../lib/ast');
const { defuns, statements } = parseKernel();

const contains = (expr, x) => x === expr || Array.isArray(expr) && expr.some(y => contains(y, x));
const sortedDefuns = [];

for (const defun of defuns) {
  const index = sortedDefuns.findIndex(d => !contains(defun, d[1]));
  if (index >= 0) {
    sortedDefuns.splice(index, 0, defun);
  } else {
    sortedDefuns.unshift(defun);
  }
}

const _nonAsyncs = []; // TODO: defuns listed here are not built as async

for (const _defun of sortedDefuns) {
  // TODO: a function gets added to the list if it does not apply as a function:
  //   - a variable
  //   - an expression
  //   - a function other than itself that is not in nonAsyncs
}

const render = async => {
  // TODO: nonAsyncs need to be passed in here, propogated to build function
  //       so when we build a non-async, it's not async
  //       and when we call a non-async, it's not awaited
  const { compile } = backend({ async });
  const syntax = generate(
    Program([Statement(Assign(
      Member(Id('module'), Id('exports')),
      Arrow(
        [Id('$')],
        Block(...[...sortedDefuns, ...statements].map(compile).map(Statement), Return(Id('$'))),
        async)))]));

  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
};

render(false);
render(true);
