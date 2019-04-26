const { equal, ok, rejects } = require('assert');
const forEach                = require('mocha-each');
const backend                = require('../../lib/backend');
const kernel                 = require('../../dist/kernel.async');
const frontend               = require('../../lib/frontend');

(async () => {
  const $ = frontend(await kernel(backend({ async: true })));
  const { caller, consFromArray, equate, evalKl, exec, f, isArray, s, settle } = $;

  describe('async', () => {
    describe('interop', () => {
      describe('js.new', () => {
        it('should be able to construct globally referrable constructors', async () => {
          ok(isArray(await exec('(js.new Array [5])')));
        });
      });
      describe('js.obj', () => {
        it('should construct js object from series of key-value pairs', async () => {
          ok(equate({ a: 1, b: 2 }, await exec('(js.obj ["a" 1 "b" 2])')));
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
          equal(3, await caller('.')({ y: 3 }, 'y'));
        });
      });
      describe('..', () => {
        it('should access chain of properties on object', async () => {
          equal(3, await exec('(.. (js.obj ["x" (js.obj ["y" (js.obj ["z" 3])])]) ["x" "y" "z"])'));
        });
      });
    });
  });
})();
