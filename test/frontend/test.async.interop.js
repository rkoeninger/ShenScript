const { equal, ok } = require('assert');
const backend       = require('../../lib/backend');
const kernel        = require('../../dist/kernel.async');
const frontend      = require('../../lib/frontend.node');

(async () => {
  const $ = frontend(await kernel(backend({ async: true })));
  const { caller, consFromArray, equate, exec, isArray } = $;

  describe('async', () => {
    describe('interop', () => {
      describe('js.new', () => {
        it('should be able to construct globally referrable constructors', async () => {
          ok(isArray(await exec('(js.new (js.Array) [5])')));
          equal(123, await exec('(js.new (js.Number) ["123"])'));
        });
      });
      describe('js.new-obj', () => {
        it('should construct js object from series of key-value pairs', async () => {
          ok(equate({ a: 1, b: 2 }, await exec('(js.new-obj ["a" 1 "b" 2])')));
        });
        it('should work with ({ ... }) macro', async () => {
          ok(equate({ a: 1, b: 2 }, await exec('({ "a" 1 "b" 2 })')));
        });
        it('should build nested objects with ({ ... }) macro', async () => {
          equal(42, await exec('({ "x" ({ "y" ({ "z" 42 }) }) })').x.y.z);
        });
      });
      describe('exec', () => {
        it('should work', async () => {
          equal(5, await exec('(+ 3 2)'));
          ok(equate(consFromArray([1, 2, 3]), await exec('[1 2 3]')));
        });
      });
      describe('.', () => {
        it('should access property on object', async () => {
          equal(3, await caller('js.get')({ y: 3 }, 'y'));
        });
        it('should access chain of properties on object', async () => {
          equal(3, await exec('(. (js.new-obj ["x" (js.new-obj ["y" (js.new-obj ["z" 3])])]) "x" "y" "z")'));
        });
      });
    });
  });
})();
