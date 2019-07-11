[![Shen Version](https://img.shields.io/badge/shen-21.1-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)
[![Docs Status](https://readthedocs.org/projects/shenscript/badge/?version=latest)](https://shenscript.readthedocs.io/en/latest/?badge=latest)

# Shen for JavaScript

<img src="https://raw.githubusercontent.com/rkoeninger/ShenScript/master/assets/logo.png" align="right">

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Built for modern browsers and recent versions of Node, requiring the [latest features](https://github.com/lukehoban/es6features) of the ECMAScript standard.

Full documentation can be viewed at [shenscript.readthedocs.io](https://shenscript.readthedocs.io/en/latest/).

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

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/).

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

Run `npm start` to host a simple demo page.

## Prior Art

This library is attempt to improve on the existing [shen-js](https://github.com/gravicappa/shen-js) project by [Ramil Farkhshatov](https://github.com/gravicappa). shen-js implements its own KLVM on top of JS, allowing it to handle deep recursion without stack overflow and make asynchronous I/O transparent to Shen code. It outputs in a large deployable (\~12MB uncompressed). ShenScript is intended to instead be a lighter-weight solution built on more recent JS features, output a smaller deployable and provide plentify facilities for web development.
