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
  constructor() { this.buffer = []; }
  write(b) {
    this.buffer.push(b);
    return b;
  }
  fromCharCodes() { return String.fromCharCode(...this.buffer); }
};

const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(', ');

// TODO: this can be removed when tests.shen doesn't end with (reset)
const unbreakTestsDotShen = () => {
  const path = config.testsPath + '/tests.shen';
  const text = fs.readFileSync(path, 'utf8');
  if (text.trimEnd().endsWith('(reset)')) {
    fs.writeFileSync(path, text.replace('(reset)', ''), 'utf8');
  }
};
unbreakTestsDotShen();

const runTests = async async => {
  const start = Date.now();
  console.log(`creating kernel in ${async ? 'async' : 'sync'} mode...`);
  const stoutput = new OutStream();
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
  const failures = valueOf('test-harness.*failed*');

  if (failures > 0) {
    console.error(`${failures} tests failed.`);
    console.error('test output:');
    console.error(stoutput.fromCharCodes());
  } else {
    console.log(`all tests passed.`);
  }

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
