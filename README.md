[![Shen Version](https://img.shields.io/badge/shen-21.1-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)

# Shen for JavaScript

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Built for modern browsers using the [latest features](https://github.com/lukehoban/es6features) of the ES6 standard.

## Project State

This implementation is not complete. It can almost run the Shen test suite, but fails on some of the more intensive tests with a stack overflow. ShenScript uses trampolines for tail recursion, but it's still not enough. Only Safari has implemented tail calls natively at this point. ShenScript also can't simulate synchronous I/O, which the `read-byte` primitive is designed for. So the built-in `(shen)` REPL won't work.

ShenScript was an attempt to improve on the existing [shen-js](https://github.com/gravicappa/shen-js) project, as shen-js is more complicated, generates inscrutible code and outputs a large .js file (\~12MB uncompressed). On the other hand, shen-js actually works. shen-js implements its own KLVM on top of JS, allowing it to handle deep recursion and simulate synchronous I/O. Given the current state of JS engines and the design of Shen, shen-js is the only 100% complete solution.

Despite being only 90% of the way to completion, I think ShenScript can still be useful so long as you don't want to run the REPL or your computation doesn't push the limits of recursion or performance. Typical JS development should be doable, but only beta testing will show for sure.

## Project Goals

  * Generate straight-forward JavaScript that is as idiomatic as possible.
  * Make the most use of ES6 features.
  * Render a small npm release package (current minified bundle is about \~570KB).
  * Make interop with JavaScript easy, especially in the browser.
  * Make REPL work in node.
  * Try running environment for REPL in service worker in browser.
  * Implemented async I/O in a way that is transparent to executed Shen code.

## Prerequisites

Requires recent version (10+) of [Node](https://nodejs.org/en/download/).

## Building and Testing

Run `npm install` to download all dependencies.

The primitive backend environment can be tested with `npm run test-backend`.

The Shen kernel sources can be retrieved with `npm run fetch`. Shen Kernel version can be updated in `fetch.js`.

Running `npm run test-kernel` will load the kernel sources and run the kernel test suite. Passing `async` will generate async code for the kernel.

Running `npm run render` will render the KL files to JavaScript and output `dist/kernel_sync.js` or `dist/kernel_async.js` based on optional `async` argument.

`dist/shenscript.js` bundle can be built with `npm run bundle`.

## Running

TODO: update this

`index.html` contains a basic KL/Shen test bed. There, one can experiment with parsing, translating and running Shen code. It will not be able to mount files to the virtual file system unless it is loaded through a web server like `http-server`.

`dist/bundle.js` must be built for `index.html` to work.
