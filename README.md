[![Shen Version](https://img.shields.io/badge/shen-21.2-blue.svg)](https://github.com/Shen-Language)
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
  * Fairly small deployable (\~633KB uncompressed, \~76KB compressed).

Still in progress:

  * Speed up async performance (sync test suite time: \~12s, async: \~64s).
    * Web startup time is \~1200ms on Chrome, \~15s on Firefox in async mode.
  * Pre-supply helpful async I/O implementations for loading in WebWorker, command line, etc.

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/) as well as [webpack-cli](https://www.npmjs.com/package/webpack-cli) locally installed and [http-server](https://www.npmjs.com/package/http-server) if you want to run the demo.

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

### Demo Page

Run the following commands in order to host a simple demo page:

```bash
npm install           # Get npm dependencies
npm start             # Start webpack watch
http-server -p 8080   # Host the page
```

If you open a browser on [localhost:8080](http://localhost:8080) a basic webpage will load, and when ready, it will display the load time.

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
