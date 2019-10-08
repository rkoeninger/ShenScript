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
  * Fairly small production webpack bundle (\~640KB uncompressed, \~100KB gzip compressed).
  * Decent web startup time (\~50ms in Chromium, \~100ms in Firefox).

Still in progress:

  * Continue to improve async performance, ultimately removing the sync version of the kernel.
  * Interactive in-browser environment with UI in `index.html`.

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/).

## Building and Testing

Once you've checked out the code, the following command sequence will get the project built and verified:

  - `npm install` - Retrieve npm packages as you would with any other project.
  - `npm run test-backend` - The basic environment and compiler is testable out of the box.
  - `npm run fetch-kernel` - If this is a fresh checkout, or if the Shen kernel version has been updated, running this command will pull the kernel sources from the [shen-sources](https://github.com/Shen-Language/shen-sources.git) project and extract them under `kernel/`.
  - `npm run render-kernel` - Uses the backend compiler to translate the kernel sources to JavaScript and stores the generated code under `kernel/js/`.
  - `npm run test-kernel` - Runs the test suite that comes with the Shen kernel.
  - `npm run test-frontend` - Runs unit tests for helper and interop functions provided by ShenScript.
  - `npm run lint` - If you make changes, run `lint` to check adherence to style and code quality.

## Running

### Demo Page

Run `npm start` to start webpack watch.

If you open `index.html` in your browser a basic webpage will load, and when ready, it will display the load time. (The production webpack bundle does not automatically create a Shen environment and does not log anything.) `index.html` should be viewable without hosting in a web server, but you will not be able to use the `load` function to load additional Shen code if opened from a `file://` path. `http-server` is adequate for hosting in a web server.

If you open the JavaScript console in the developer tools, it is possible to access to the `$` global object and execute commands:

```javascript
$.exec("(+ 1 1)").then(console.log);
```

Chaining the `then` call is necessary because the environment will be built in `async` mode and `exec` will return a `Promise`. For more information refer to the [documentation](https://shenscript.readthedocs.io/en/latest/interop.html).

### REPL

Run `npm run repl` to run a command-line REPL. It should have the same behavior as the `shen-cl` REPL. `node.` functions will be available. Run `(node.exit)` to exit the REPL.

Neither command-line options nor the `launcher` kernel extension are implemented. ShenScript is not intended to take the form of a standalone executable.
