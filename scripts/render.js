const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const {
  Arrow, Assign, Block, Call, Const, Id, Literal, Member, Program, Return, Statement,
  generate
} = require('../lib/ast');
const { formatDuration, formatGrid, measure } = require('./utils');

const render = (async, defuns) => {
  console.log(`- creating backend in ${async ? 'async' : 'sync'} mode...`);
  const measureBackend = measure(() => backend({ async }));
  const { assemble, construct, s } = measureBackend.result;
  console.log(`  created in ${formatDuration(measureBackend.duration)}`);

  console.log('- rendering kernel...');
  const measureRender = measure(() => {
    const body = assemble(
      Block,
      ...defuns.map(construct),
      Assign(Id('$'), Call(Call(Id('require'), [Literal('../../lib/overrides')]), [Id('$')])),
      assemble(Statement, construct([s`shen.initialise`])));
    return generate(
      Program([Statement(Assign(
        Member(Id('module'), Id('exports')),
        Arrow(
          [Id('$')],
          Block(
            ...Object.entries(body.subs).map(([key, value]) => Const(Id(key), value)),
            ...body.ast.body,
            Return(Id('$'))),
          async)))]));
  });
  const syntax = measureRender.result;
  console.log(`  rendered in ${formatDuration(measureRender.duration)}, ${syntax.length} chars`);

  console.log('- writing file...');
  const measureWrite = measure(() => {
    if (!fs.existsSync('kernel/js')) {
      fs.mkdirSync('kernel/js');
    }

    fs.writeFileSync(`kernel/js/kernel.${async ? 'async' : 'sync'}.js`, syntax);
  });
  console.log(`  written in ${formatDuration(measureWrite.duration)}`);
  console.log();

  return { size: syntax.length, duration: measureRender.duration };
};

console.log('- parsing kernel...');
const measureParse = measure(parseKernel);
console.log(`  parsed in ${formatDuration(measureParse.duration)}`);
console.log();

const sync = render(false, measureParse.result);
const async = render(true, measureParse.result);
const total = {
  size: sync.size + async.size,
  duration: sync.duration + async.duration
};

console.log(formatGrid(
  ['sync',  `${sync.size} chars`,  formatDuration(sync.duration)],
  ['async', `${async.size} chars`, formatDuration(async.duration)],
  ['total', `${total.size} chars`, formatDuration(total.duration)]));
