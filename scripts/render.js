const fs              = require('fs');
const { parseKernel } = require('./parser.js');
const backend         = require('../lib/backend.js');
const {
  Arrow, Assign, Block, Call, Const, Id, Literal, Member, Program, Return, Statement,
  generate
} = require('../lib/ast.js');
const { formatDuration, formatGrid, measure } = require('./utils.js');

console.log('- parsing kernel...');
const measureParse = measure(parseKernel);
console.log(`  parsed in ${formatDuration(measureParse.duration)}`);

console.log(`- creating backend...`);
const measureBackend = measure(() => backend());
const { assemble, construct, isArray, s } = measureBackend.result;
console.log(`  created in ${formatDuration(measureBackend.duration)}`);

console.log('- rendering kernel...');
const measureRender = measure(() => {
  const body = assemble(
    Block,
    ...measureParse.result.filter(isArray).map(construct),
    Assign(Id('$'), Call(Call(Id('require'), [Literal('./overrides.js')]), [Id('$')])),
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
        true)))]));
});
const syntax = measureRender.result;
console.log(`  rendered in ${formatDuration(measureRender.duration)}, ${syntax.length} chars`);

console.log('- writing file...');
const measureWrite = measure(() => fs.writeFileSync(`lib/kernel.js`, syntax));
console.log(`  written in ${formatDuration(measureWrite.duration)}`);
console.log();

console.log(formatGrid(['kernel.js', `${syntax.length} chars`, formatDuration(measureRender.duration)]));
