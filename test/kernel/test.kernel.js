const async = process.argv.includes('async');

const fs      = require('fs');
const backend = require('../../lib/backend');
const config  = require('../../scripts/config.node');
const kernel  = require(`../../dist/kernel.${async ? 'async' : 'sync'}`);

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

(async () => {
  const start = Date.now();
  console.log('creating kernel...');
  const { evalKl, s } = await kernel(backend({
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
  console.log(`total time elapsed: ${formatDuration(Date.now() - start)}`);
})();
