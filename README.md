[![Shen Version](https://img.shields.io/badge/shen-21.1-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)

# Shen for JavaScript

![ShenScript Logo](https://raw.githubusercontent.com/rkoeninger/ShenScript/master/logo.png)

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Built for modern browsers and recent versions of Node, requiring the [latest features](https://github.com/lukehoban/es6features) of the ECMAScript standard.

## Features

  * Allows integration with arbitrary I/O.
  * Async operations are transparent to written Shen code.
  * Easy interop: JS can be called from Shen, Shen can be called from JS.
  * REPL works on command line in Node.js.
  * Fairly small deployable (\~765KB uncompressed, \~96KB compressed).

Still in progress:

  * Speed up async performance (sync test suite time: \~24s, async: \~72s).
  * Speed up web load time (current \~2s). Pre-generate environment state (?).
  * Pre-supply helpful async I/O primitives.
  * Smaller deployable package (?).

## Prerequisites

Requires recent version (10+) of [Node.js and npm](https://nodejs.org/en/download/).

## Building and Testing

Refer to [`.travis.yml`](.travis.yml) for typical build/test process. `test-*` commands are optional.

## Running

Run `npm start` to host a simple demo page.

## Prior Art

This library is attempt to improve on the existing [shen-js](https://github.com/gravicappa/shen-js) project by [Ramil Farkhshatov](https://github.com/gravicappa). shen-js implements its own KLVM on top of JS, allowing it to handle deep recursion without stack overflow and make asynchronous I/O transparent to Shen code. It outputs in a large deployable (\~12MB uncompressed). ShenScript is intended to instead be a lighter-weight solution built on more recent JS features, output a smaller deployable and provide plentify facilities for web development.
