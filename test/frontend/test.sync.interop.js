const { equal, ok, throws } = require('assert');
const forEach               = require('mocha-each');
const backend               = require('../../src/backend');
const kernel                = require('../../dist/kernel.sync');
const frontend              = require('../../src/frontend');

const $ = frontend(kernel(backend()));
const { caller, consFromArray, equate, evalKl, exec, f, isArray, s, settle } = $;

describe('sync', () => {
  describe('interop', () => {
    describe('js.new', () => {
      it('should be able to construct globally referrable constructors', () => {
        ok(isArray(exec('(js.new Array [5])')));
      });
    });
    describe('js.obj', () => {
      it('should construct js object from series of key-value pairs', () => {
        ok(equate({ a: 1, b: 2 }, exec('(js.obj ["a" 1 "b" 2])')));
      });
    });
    describe('exec', () => {
      it('should work', () => {
        equal(5, exec('(+ 3 2)'));
        ok(equate(consFromArray([1, 2, 3]), exec('[1 2 3]')));
      });
    });
    describe('.', () => {
      it('should bind property to object', () => {
        const dot = caller('.');
        equal(3, dot({ y: 3 }, s`y`));
      });
    });
  });
});
