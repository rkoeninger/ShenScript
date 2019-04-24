const { equal, ok, throws } = require('assert');
const forEach               = require('mocha-each');
const { parseForm }         = require('../../scripts/parser');
const backend               = require('../../src/backend');
const frontend              = require('../../src/frontend');

const { equal: eq, evalKl, f, isArray, s, settle } = frontend(backend());
const exec = x => settle(evalKl(parseForm(x)));

describe('interop', () => {
  describe('sync', () => {
    describe('js.new', () => {
      it('should be able to construct globally referrable constructors', () => {
        ok(isArray(exec('(js.new (intern "Array") (cons 5 ()))')));
      });
    });
    describe('js.{}', () => {
      it('should construct js object from series of key-value pairs', () => {
        ok(eq({ a: 1, b: 2 }, exec('(js.{} (cons (cons "a" (cons 1 null)) (cons (cons "b" (cons 2 null)) null)))')));
      });
    });
  });
});
