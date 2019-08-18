[![Shen Version](https://img.shields.io/badge/shen-21.1-blue.svg)](https://github.com/Shen-Language)
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

  * Speed up async performance (sync test suite time: \~24s, async: \~72s).
    * Web startup time is \~2s on Chrome, \~75s on Firefox in async mode.
  * Speed up web load time (current \~2s). Disable `declare` type checks?
  * Pre-supply helpful async I/O implementations for loading in WebWorker, command line, etc.

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/) as well as [webpack-cli](https://www.npmjs.com/package/webpack-cli) locally installed and [http-server](https://www.npmjs.com/package/http-server) if you want to run the demo.

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

Run the following commands in order to host a simple demo page:

```bash
npm install
npm start
# You should serve the root directory
http-server -p 8000
```

If you open a browser on [localhost:8000](localhost:8000) a basic webpage will load and after a while it will display 
the time required to load the shen environment in miliseconds (see the performance section above).

If you open the javascript console at the developer tools it is possible to access to the shen global object and
execute commands:

```javascript
shen.exec("(+ 1 1)").
then(console.log)
```

For more information refer to the [documentation](https://shenscript.readthedocs.io/en/latest/interop.html).
