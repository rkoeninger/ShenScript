const { equal, ok } = require('assert');
const backend       = require('../../lib/backend');
const kernel        = require('../../dist/kernel.sync');
const frontend      = require('../../lib/frontend.node');

const $ = frontend(kernel(backend()));
const { caller, consFromArray, equate, exec, isArray } = $;

describe('sync', () => {
  describe('interop', () => {
    describe('js.new', () => {
      it('should be able to construct globally referrable constructors', () => {
        ok(isArray(exec('(js.new (js.Array) [5])')));
        equal(123, exec('(js.new (js.Number) ["123"])'));
      });
    });
    describe('js.new-obj', () => {
      it('should construct js object from series of key-value pairs', () => {
        ok(equate({ a: 1, b: 2 }, exec('(js.new-obj ["a" 1 "b" 2])')));
      });
      it('should work with ({ ... }) macro', () => {
        ok(equate({ a: 1, b: 2 }, exec('({ "a" 1 "b" 2 })')));
      });
      it('should build nested objects with ({ ... }) macro', () => {
        equal(42, exec('({ "x" ({ "y" ({ "z" 42 }) }) })').x.y.z);
      });
    });
    describe('exec', () => {
      it('should work', () => {
        equal(5, exec('(+ 3 2)'));
        ok(equate(consFromArray([1, 2, 3]), exec('[1 2 3]')));
      });
    });
    describe('.', () => {
      it('should access property on object', () => {
        equal(3, caller('js.get')({ y: 3 }, 'y'));
      });
      it('should access chain of properties on object', () => {
        equal(3, exec('(. (js.new-obj ["x" (js.new-obj ["y" (js.new-obj ["z" 3])])]) "x" "y" "z")'));
      });
    });
  });
});
