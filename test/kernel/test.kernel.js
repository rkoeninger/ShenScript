const async = process.argv.includes('async');

const fs              = require('fs');
const backend         = require('../../src/backend');
const { parseKernel } = require('../../scripts/parser');
const config          = require('../../scripts/config.node');

const InStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() { return this.pos >= this.buf.length ? -1 : this.buf[this.pos++]; }
  close() {}
};

const OutStream = class {
  constructor(stream) {
    this.stream = stream;
  }
  write(b) { return this.stream.write(String.fromCharCode(b)); }
};

const { evalKl, s } = backend({
  ...config,
  async,
  InStream,
  OutStream,
  openRead: path => new InStream(fs.readFileSync(path)),
  stoutput: new OutStream(process.stdout),
  sterror:  new OutStream(process.stderr)
});

const { defuns, statements } = parseKernel();

const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(', ');

(async () => {
  const start = Date.now();
  let i = 0;
  console.log(`loading kernel...`);
  const exprs = [...defuns, ...statements];
  for (let expr of exprs) {
    try {
      await evalKl(expr);
    } catch (e) {
      console.log(expr);
      console.log(e);
    }
  }
  console.log(`kernel (${exprs.length} exprs) loaded: ${formatDuration(Date.now() - start)}`);
  console.log(await evalKl([s`cd`, config.testsPath]));
  console.log(await evalKl([s`load`, 'README.shen']));
  console.log(await evalKl([s`load`, 'tests.shen']));
  console.log(`total time elapsed: ${formatDuration(Date.now() - start)}`);
})();
