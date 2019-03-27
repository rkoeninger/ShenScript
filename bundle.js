const fs = require('fs');
const Compiler = require('google-closure-compiler').jsCompiler;

const closureCompiler = new Compiler({
  js_output_file: './dist/bundle.js',
  language_in: 'ECMASCRIPT_2018',
  compilation_level: 'ADVANCED'//,
  //warning_level: 'VERBOSE'
});

const files = ['./src/backend.js', './dist/kernel_sync.js'];
const loadedFiles = files.map(f => ({ path: f, src: fs.readFileSync(f, 'utf-8') }));

const closureProcess = closureCompiler.run(loadedFiles, (exitCode, stdout, stderr) => {
  console.log(`exitCode = ${exitCode}`);

  if (stderr && stderr.length > 0) {
    console.error(stderr);
  } else {
    stdout.forEach(({ path, src }) => {
      console.log(`${path} : ${src.length} bytes`);
      fs.writeFileSync(path, src, 'utf-8');
    });
  }

  process.exitCode = exitCode;
});
