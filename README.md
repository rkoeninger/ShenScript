[![Shen Version](https://img.shields.io/badge/shen-21.0-blue.svg)](https://github.com/Shen-Language)
[![Build Status](https://travis-ci.org/rkoeninger/ShenScript.svg?branch=master)](https://travis-ci.org/rkoeninger/ShenScript)

# Shen for JavaScript

An implementation of the [Shen Language](http://www.shenlanguage.org) by [Mark Tarver](http://marktarver.com/) for JavaScript. Built for modern browsers using the [latest features](https://github.com/lukehoban/es6features) of the ES6 standard.

## Project Goals

  * Generate straight-forward JavaScript that is as idiomatic as possible.
  * Make the most use of ES6 features.
  * Render a small npm release package (current minified bundle is about ~570KB).
  * Make interop with JavaScript easy, especially in the browser.
  * Make REPL work in node.
  * Try running environment for REPL in service worker in browser.

## Prerequisites

Get [Node](https://nodejs.org/en/download/) installed. See `package.json` for recommended version.

Make sure you have `gulp-cli` installed with `npm install -g gulp-cli`.

## Building and Testing

Run `npm install` to download all dependencies.

The basic KL environment can be tested with `gulp test`.

The Shen Kernel sources can be retrieved with `gulp fetch`. Shen Kernel version can be updated in the gulpfile.

Running `node build.js` will render the KL files to JavaScript and output `dist/kernel.js`.

Webpack bundle can be built with `gulp bundle` and minified bundle can be built with `gulp bundle-min`.

## Running

`index.html` contains a basic KL/Shen test bed. There, one can experiment with parsing, translating and running Shen code.

`dist/bundle.js` must already be built for `index.html` to work.
