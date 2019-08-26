const fs              = require('fs');
const { parseKernel } = require('./parser');
const { produce, s }  = require('../lib/utils');
const backend         = require('../lib/backend');
const {
  Arrow, Assign, Block, Call, Const, Id, Literal,
  Member, Program, Return, SafeId, Statement,
  generate
} = require('../lib/ast');
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
  const indexLastReferredByThis = findLastIndex( sortedDefuns, d => walkFind(defun, d[1]));
  const indexFirstRefersToThis  = findFirstIndex(sortedDefuns, d => walkFind(d, defun[1]));

  if (indexLastReferredByThis === -1 && indexFirstRefersToThis === -1) {
    sortedDefuns.push(defun);
  } else if (indexLastReferredByThis > indexFirstRefersToThis) {
    sortedDefuns.splice(indexLastReferredByThis + 1, 0, defun);
  } else {
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
  const sysDefuns = defuns;
  const nonSysDefuns = [];
  const sysFuncs = defuns.map(x => x[1]);
  const { compile, compileLambda } = backend({ async, sysFuncs });
  //const sysDefuns = defuns.filter(x => sysFuncs.includes(x[1]));
  //const nonSysDefuns = defuns.filter(x => !sysFuncs.includes(x[1]));
  //const { compile, compileLambda } = backend({ async, sysFuncs: sysFuncs.filter(x => sysDefuns.some(y => y[1] === x)) });
  const syntax = generate(
    Program([Statement(Assign(
      Member(Id('module'), Id('exports')),
      Arrow(
        [Id('$')],
        // TODO: each function whose name is in systemFunctions,
        //       convert (define F ...)
        //       to
        //       const F = (...) => ...;
        //       $.d('F', F);
        //       from
        //       $.d('F', (...) => ...);
        Block(
          ...sysDefuns.map(x => Const(SafeId(Symbol.keyFor(x[1])), compileLambda(x[2], x[3]))),
          ...sysDefuns.map(x => Statement(Call(Member(Id('$'), Id('d')), [Literal(Symbol.keyFor(x[1])), SafeId(Symbol.keyFor(x[1]))]))),
          ...nonSysDefuns.map(x => Statement(compile(x))),
          //...defuns.map(x => Statement(compile(x))),
          ...statements.map(x => Statement(compile(x))),
          Return(Id('$'))),
        async)))]));

  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
};

render(false);
render(true);
