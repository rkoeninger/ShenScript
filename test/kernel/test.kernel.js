const fs          = require('fs');
const config      = require('../../lib/config.node');
const backend     = require('../../lib/backend');
const asyncKernel = require('../../dist/kernel.async');
const syncKernel  = require('../../dist/kernel.sync');

const InStream = class {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  read() { return this.pos >= this.buf.length ? -1 : this.buf[this.pos++]; }
  close() {}
};

const OutStream = class {
  constructor(stream) { this.stream = stream; }
  write(b) { return this.stream.write(String.fromCharCode(b)); }
};

const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(', ');

const runTests = async async => {
  const start = Date.now();
  console.log('creating kernel...');
  const { evalKl, s } = await (async ? asyncKernel : syncKernel)(backend({
    ...config,
    async,
    InStream,
    OutStream,
    openRead: path => new InStream(fs.readFileSync(path)),
    stoutput: new OutStream(process.stdout),
    sterror:  new OutStream(process.stderr)
  }));
  console.log(`kernel ready: ${formatDuration(Date.now() - start)}`);
  console.log(await evalKl([s`cd`, config.testsPath]));
  console.log(await evalKl([s`load`, 'README.shen']));
  console.log(await evalKl([s`load`, 'tests.shen']));
  const duration = Date.now() - start;
  console.log(`total time elapsed: ${formatDuration(duration)}`);
  return duration;
};

const pad = (len, fill, s) => s + fill.repeat(len - s.length);

(async () => {
  const syncDuration = await runTests(false);
  const asyncDuration = await runTests(true);
  console.log();
  console.log('--------------------------------');
  console.log(`| sync  | ${pad(20, ' ', formatDuration(syncDuration))} |`);
  console.log(`| async | ${pad(20, ' ', formatDuration(asyncDuration))} |`);
  console.log(`| both  | ${pad(20, ' ', formatDuration(syncDuration + asyncDuration))} |`);
  console.log('--------------------------------');
})();
