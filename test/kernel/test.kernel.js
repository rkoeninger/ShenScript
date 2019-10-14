const dump = process.argv.includes('dump');

const fs            = require('fs');
const tempfile      = require('tempfile');
const config        = require('../../lib/config.node.js');
const backend       = require('../../lib/backend.js');
const kernel        = require('../../lib/kernel.js');
const { testsPath } = require('../../scripts/config.js');
const { formatDuration, formatGrid, measure } = require('../../scripts/utils.js');

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

const formatResult = (failures, ignored) =>
  failures > ignored ? `${failures - ignored} (${ignored} ignored)` :
  ignored > 0 ? `success (${ignored} failures ignored)` :
  'success';

(async () => {
  const stoutput = new OutStream();

  console.log(`- creating backend...`);
  const measureBackend = measure(() => backend({
    ...config,
    InStream,
    OutStream,
    openRead: path => new InStream(fs.readFileSync(path)),
    stoutput
  }));
  const $ = measureBackend.result;
  console.log(`  created in ${formatDuration(measureBackend.duration)}`);

  console.log(`- creating kernel...`);
  const measureCreate = await measure(() => kernel($));
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
  const ignored = 0;
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
  console.log(formatGrid(['Test Suite', formatResult(failures,  ignored), formatDuration(measureRun.duration)]));

  if (failures > ignored) {
    process.exit(1);
  }
})();
