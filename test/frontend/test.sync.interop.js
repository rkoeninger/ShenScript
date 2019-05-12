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
      });
    });
    describe('js.new-obj', () => {
      it('should construct js object from series of key-value pairs', () => {
        ok(equate({ a: 1, b: 2 }, exec('(js.new-obj ["a" 1 "b" 2])')));
      });
      it('should work with ({ ... }) macro', () => {
        ok(equate({ a: 1, b: 2 }, exec('({ "a" 1 "b" 2 })')));
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
        equal(3, caller('.')({ y: 3 }, 'y'));
      });
    });
    describe('..', () => {
      it('should access chain of properties on object', () => {
        equal(3, exec('(.. (js.new-obj ["x" (js.new-obj ["y" (js.new-obj ["z" 3])])]) ["x" "y" "z"])'));
      });
    });
  });
});
