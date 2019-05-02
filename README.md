[![Shen Version](https://img.shields.io/badge/shen-21.1-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)

# Shen for JavaScript

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Built for modern browsers and recent versions of Node, requiring the [latest features](https://github.com/lukehoban/es6features) of the ECMAScript standard.

## Features

  * Allows integration with arbitrary I/O.
  * Async operations are transparent to executed Shen code.
  * Easy interop: JS can be called from Shen, Shen can be called from JS.
  * REPL works on command line in Node.js.
  * Fairly small deployable (current gzipped bundle is \~100kb).

Still in progress:

  * Speed up web load time (currently 30-60s). Pre-generate environment state (?).
  * Pre-supply async I/O primitives.
  * Smaller deployable package (?).

## Project State

This implementation is not complete. It can almost run the Shen test suite, but fails on some of the more intensive tests with a stack overflow. ShenScript uses trampolines for tail recursion, but it's still not enough. Only Safari has implemented tail calls natively at this point. ShenScript also can't simulate synchronous I/O, which the `read-byte` primitive is designed for. So the built-in `(shen)` REPL won't work.

ShenScript was an attempt to improve on the existing [shen-js](https://github.com/gravicappa/shen-js) project, as shen-js is more complicated, generates inscrutible code and outputs a large .js file (\~12MB uncompressed). On the other hand, shen-js actually works. shen-js implements its own KLVM on top of JS, allowing it to handle deep recursion and simulate synchronous I/O. Given the current state of JS engines and the design of Shen, shen-js is the only 100% complete solution.

Despite being only 90% of the way to completion, I think ShenScript can still be useful so long as you don't want to run the REPL or your computation doesn't push the limits of recursion or performance. Typical JS development should be doable, but only beta testing will show for sure.

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/).

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

Run `npm start` to host a simple demo page.
