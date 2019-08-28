const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const { Arrow, Assign, Block, Id, Member, Program, Return, Statement, generate } = require('../lib/ast');
const { defuns, statements } = parseKernel();

const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(', ');

const render = async => {
  const start = Date.now();
  console.log(`creating backend in ${async ? 'async' : 'sync'} mode...`);
  const { compile } = backend({ async });
  console.log(`backend ready: ${formatDuration(Date.now() - start)}`);
  const renderStart = Date.now();
  const syntax = generate(
    Program([Statement(Assign(
      Member(Id('module'), Id('exports')),
      Arrow(
        [Id('$')],
        Block(...[...defuns, ...statements].map(compile).map(Statement), Return(Id('$'))),
        async)))]));
  const renderTime = Date.now() - renderStart;
  console.log(`kernel rendered: ${formatDuration(renderTime)}`);
  console.log(`${async ? 'async' : 'sync '} kernel: ${syntax.length} chars`);
  console.log('writing file...');

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
  return [syntax.length, renderTime];
};

const pad = (len, fill, s) => s + fill.repeat(len - s.length);

const [syncSize, syncDuration] = render(false);
const [asyncSize, asyncDuration] = render(true);
console.log();
console.log('-------------------------------------');
console.log(`| sync  | ${pad(14, ' ', syncSize + ' chars')} | ${pad(8, ' ', formatDuration(syncDuration))} |`);
console.log(`| async | ${pad(14, ' ', asyncSize + ' chars')} | ${pad(8, ' ', formatDuration(asyncDuration))} |`);
console.log(`| both  | ${pad(14, ' ', syncSize + asyncSize + ' chars')} | ${pad(8, ' ', formatDuration(syncDuration + asyncDuration))} |`);
console.log('-------------------------------------');
