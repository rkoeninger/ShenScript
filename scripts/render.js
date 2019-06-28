const fs              = require('fs');
const { parseKernel } = require('./parser');
const { produce, s }  = require('../lib/utils');
const backend         = require('../lib/backend');
const { Arrow, Assign, Block, Id, Member, Program, Return, Statement, generate } = require('../lib/ast');
const { defuns, statements } = parseKernel();

const findFirstIndex = (array, f) => array.findIndex(f);
const findLastIndex  = (array, f) => {
  for (let i = array.length - 1; i >= 0; --i) {
    if (f(array[i])) {
      return i;
    }
  }

  return -1;
};

const walkFind = (expr, x) => x === expr || Array.isArray(expr) && expr.some(y => walkFind(y, x));
const sortedDefuns = [];

// sortedDefuns: [lowest-level functions ... top-level functions]
for (const defun of defuns) {
  const indexLastReferredByThis = findLastIndex(sortedDefuns,  d => walkFind(defun, d[1]));
  const indexFirstRefersToThis  = findFirstIndex(sortedDefuns, d => walkFind(d, defun[1]));

  if (indexLastReferredByThis === -1 && indexFirstRefersToThis === -1) {
    console.log(`inserting ${Symbol.keyFor(defun[1])} at the end`);
    sortedDefuns.push(defun);

  } else if (indexLastReferredByThis > indexFirstRefersToThis) {
    console.log(`inserting ${Symbol.keyFor(defun[1])} after ${Symbol.keyFor(sortedDefuns[indexLastReferredByThis][1])} (last function this refers to)`);
    sortedDefuns.splice(indexLastReferredByThis + 1, 0, defun);

  } else {
    console.log(`inserting ${Symbol.keyFor(defun[1])} before ${Symbol.keyFor(sortedDefuns[indexFirstRefersToThis][1])} (first function that refers to this)`);
    sortedDefuns.splice(indexFirstRefersToThis, 0, defun);
  }
}

// None of the symbols in shen.external-symbols can be redefined
const consedExternals = statements.find(x =>
  Array.isArray(x) &&
  x.length >= 4 &&
  x[0] === s`put` &&
  x[2] === s`shen.external-symbols`)[3];

// defuns listed here don't need to be awaited when called
const isConsForm = x => Array.isArray(x) && x.length === 3 && x[0] === s`cons`;

// TODO: need to list all async kernel system functions?
//       maybe we should only list sync primitive functions
const asyncPrimitives = [s`open`, s`close`, s`read-byte`, s`write-byte`];
const sysFuncs = produce(isConsForm, x => x[1], x => x[2], consedExternals);
const nonAwaits = sysFuncs.filter(x => !asyncPrimitives.includes(x));
const mustAwait = expr =>
  Array.isArray(expr) &&
  expr.length > 0 &&
  (!nonAwaits.includes(expr[0]) ||
    (expr[0] === s`cond`
      ? expr.slice(1).some(x => Array.isArray(x) && x.some(mustAwait))
      : expr.slice(1).some(mustAwait)));

for (const defun of sortedDefuns) { // TODO: this is including `write-to-file`, which it shouldn't
  if (!mustAwait(defun)) {
    nonAwaits.push(defun);
  }
}

const render = async => {
  // TODO: nonAwaits need to be passed in here, propogated to build function
  //       so when we call a nonAwait, it's not awaited
  //       and when we build a function with no awaits, it's not async
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
