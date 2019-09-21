const fs              = require('fs');
const { parseKernel } = require('./parser');
const backend         = require('../lib/backend');
const {
  Arrow, Assign, Block, Call, Const, Id, Literal, Member, Program, Return, Statement,
  generate
} = require('../lib/ast');
const { defuns, statements } = parseKernel();
const { formatDuration, formatGrid, measure } = require('./utils');

const render = async => {
  console.log(`- creating backend in ${async ? 'async' : 'sync'} mode...`);
  const measureBackend = measure(() => backend({ async }));
  const { assemble, construct } = measureBackend.result;
  console.log(`  created in ${formatDuration(measureBackend.duration)}`);

  console.log('- rendering kernel...');
  const measureRender = measure(() => {
    const body = assemble(
      Block,
      ...defuns.map(construct),
      Assign(Id('$'), Call(Call(Id('require'), [Literal('../lib/overrides')]), [Id('$')])),
      ...statements.map(construct));
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
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    fs.writeFileSync(`dist/kernel.${async ? 'async' : 'sync'}.js`, syntax);
  });
  console.log(`  written in ${formatDuration(measureWrite.duration)}`);
  console.log();

  return { size: syntax.length, duration: measureRender.duration };
};

const sync = render(false);
const async = render(true);
const total = {
  size: sync.size + async.size,
  duration: sync.duration + async.duration
};

console.log(formatGrid(
  ['sync',  `${sync.size} chars`,  formatDuration(sync.duration)],
  ['async', `${async.size} chars`, formatDuration(async.duration)],
  ['total', `${total.size} chars`, formatDuration(total.duration)]));
