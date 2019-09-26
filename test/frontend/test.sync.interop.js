const { equal, ok } = require('assert');
const backend       = require('../../lib/backend');
const kernel        = require('../../dist/kernel.sync');
const frontend      = require('../../lib/frontend.node');

(async () => {
  const $ = await frontend(await kernel(backend()));
  const { caller, equate, exec, isArray, toList } = $;

  describe('sync', () => {
    describe('interop', () => {
      describe('js.new', () => {
        it('should be able to construct globally referrable constructors', () => {
          ok(isArray(exec('(js.new (js.Array) [5])')));
          equal(123, exec('(js.new (js.Number) ["123"])'));
        });
      });
      describe('js.obj', () => {
        it('should construct js object from series of key-value pairs', () => {
          ok(equate({ a: 1, b: 2 }, exec('(js.obj ["a" 1 "b" 2])')));
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
          ok(equate(toList([1, 2, 3]), exec('[1 2 3]')));
        });
      });
      describe('.', () => {
        it('should access property on object', () => {
          equal(3, caller('js.get')({ y: 3 }, 'y'));
        });
        it('should access chain of properties on object', () => {
          equal(3, exec('(. (js.obj ["x" (js.obj ["y" (js.obj ["z" 3])])]) "x" "y" "z")'));
        });
      });
    });
    describe('ast', () => {
      describe('eval', () => {
        it('should eval at runtime', () => {
          equal(3, exec('(js.ast.eval (js.ast.binary "+" (js.ast.literal 1) (js.ast.literal 2)))'));
        });
      });
    });
  });
})();
