const dump = process.argv.includes('dump');

const fs            = require('fs');
const tempfile      = require('tempfile');
const config        = require('../../lib/config.node');
const backend       = require('../../lib/backend');
const asyncKernel   = require('../../kernel/js/kernel.async');
const syncKernel    = require('../../kernel/js/kernel.sync');
const { testsPath } = require('../../scripts/config');
const { formatDuration, formatGrid, measure } = require('../../scripts/utils');

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

const isSingleSyncStackOverflow = (async, failures, outputLog) => {
  const message = 'Maximum call stack size exceeded';
  const firstIndex = outputLog.indexOf(message);
  const lastIndex = outputLog.lastIndexOf(message);
  return !async && failures === 1 && firstIndex >= 0 && firstIndex === lastIndex ? 1 : 0;
};

const formatResult = (failures, ignored) =>
    failures > ignored ? `${failures - ignored} (${ignored} ignored)` :
    ignored > 0 ? `success (${ignored} failures ignored)` :
    'success';

const run = async async => {
  const stoutput = new OutStream();

  console.log(`- creating backend in ${async ? 'async' : 'sync'} mode...`);
  const measureBackend = measure(() => backend({
    ...config,
    async,
    InStream,
    OutStream,
    openRead: path => new InStream(fs.readFileSync(path)),
    stoutput
  }));
  const $ = measureBackend.result;
  console.log(`  created in ${formatDuration(measureBackend.duration)}`);

  console.log(`- creating kernel in ${async ? 'async' : 'sync'} mode...`);
  const measureCreate = await measure(() => (async ? asyncKernel : syncKernel)($));
  const { evalKl, s, valueOf } = measureCreate.result;
  console.log(`  created in ${formatDuration(measureCreate.duration)}`);

  console.log('- running test suite...');
  const measureRun = await measure(async () => {
    await evalKl([s`cd`, testsPath]);
    await evalKl([s`load`, 'README.shen']);
    await evalKl([s`load`, 'tests.shen']);
  });
  const outputLog = stoutput.fromCharCodes();
  const failures = valueOf('test-harness.*failed*');
  const ignored = isSingleSyncStackOverflow(async, failures, outputLog);
  console.log(`  ran in ${formatDuration(measureRun.duration)}, ${formatResult(failures, ignored)}`);

  if (failures > ignored) {
    if (dump) {
      console.log();
      console.log(outputLog);
    } else {
      const outputPath = tempfile('.log');
      fs.writeFileSync(outputPath, outputLog);
      console.log(`  output log written to ${outputPath}`);
    }
  }

  console.log();
  return { failures, ignored, duration: measureRun.duration };
};

(async () => {
  const sync = await run(false);
  const async = await run(true);
  const total = {
    failures: sync.failures + async.failures,
    ignored: sync.ignored + async.ignored,
    duration: sync.duration + async.duration
  };

  console.log(formatGrid(
    ['sync',  formatResult(sync.failures,  sync.ignored),   formatDuration(sync.duration)],
    ['async', formatResult(async.failures, async.ignored),  formatDuration(async.duration)],
    ['total', formatResult(total.failures,  total.ignored), formatDuration(total.duration)]));

  if (total.failures > total.ignored) {
    process.exit(1);
  }
})();
