[![Shen Version](https://img.shields.io/badge/shen-22.1-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)
[![Docs Status](https://readthedocs.org/projects/shenscript/badge/?version=latest)](https://shenscript.readthedocs.io/en/latest/?badge=latest)

# Shen for JavaScript

<img src="https://raw.githubusercontent.com/rkoeninger/ShenScript/master/assets/logo.png" align="right">

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Full documentation can be viewed at [shenscript.readthedocs.io](https://shenscript.readthedocs.io/en/latest/).

## Features

  * Allows integration with arbitrary I/O.
  * Async operations are transparent to written Shen code.
  * Easy interop: JS can be called from Shen, Shen can be called from JS.
  * REPL works on command line in Node.js.
  * Fairly small production webpack bundle (\~640KB uncompressed, \~100KB gzip compressed).
  * Decent web startup time (\~50ms in Chromium, \~180ms in Firefox).

Still in progress:

  * Web workers:
    * Startup runtime in a worker.
    * Be able to create a new environment in a separate worker (`shen-script.new`).
  * Continue to improve async performance.
    * Or if overall perf improves enough, remove sync version of kernel.
  * Interactive in-browser environment with UI.

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/).

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

### Demo Page

Run the following commands in order to host a simple demo page:

```bash
npm install    # Get npm dependencies
npm start      # Start webpack watch
```

If you open `index.html` in your browser a basic webpage will load, and when ready, it will display the load time.

If you open the JavaScript console in the developer tools, it is possible to access to the `shen` global object and execute commands:

```javascript
shen.exec("(+ 1 1)").then(console.log);
```

Chaining the `then` call is necessary because the environment will be built in `async` mode and `exec` will return a `Promise`.

For more information refer to the [documentation](https://shenscript.readthedocs.io/en/latest/interop.html).

### REPL

Run `npm run repl` to run a command-line REPL. It should have the same behavior as the `shen-cl` REPL. `node.` functions will be available.

Execute `(node.exit)` to exit the REPL.

Command-line options not yet implemented.
