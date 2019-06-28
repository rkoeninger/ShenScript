const verbose = process.argv.includes('verbose');

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

const OutBuffer = class {
  constructor() { this.buffer = Buffer.alloc(24 * 1024); }
  write(b) {
    this.buffer.writeInt8(b);
    return b;
  }
  toString() { return this.buffer.toString(); }
};

const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(', ');

const runTests = async async => {
  const start = Date.now();
  console.log(`creating kernel in ${async ? 'async' : 'sync'} mode...`);
  const stoutput = new OutBuffer();
  const { evalKl, s, valueOf } = await (async ? asyncKernel : syncKernel)(backend({
    ...config,
    async,
    InStream,
    OutStream,
    openRead: path => new InStream(fs.readFileSync(path)),
    stoutput
  }));
  console.log(`kernel ready: ${formatDuration(Date.now() - start)}`);
  console.log('running test suite...');
  await evalKl([s`cd`, config.testsPath]);
  await evalKl([s`load`, 'README.shen']);
  await evalKl([s`load`, 'tests.shen']);
  const duration = Date.now() - start;
  console.log(`total time elapsed: ${formatDuration(duration)}`);

  if (valueOf('test-harness.*failed*') > 0) {
    console.log(stoutput.toString());
  } else {
    console.log(`all tests passed.`);
  }

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
