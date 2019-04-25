const { equal, ok, throws } = require('assert');
const forEach               = require('mocha-each');
const backend               = require('../../src/backend');

const { asString, cons, isCons, isString, evalKl, f, s, equate } = backend();
const isShenBool = x => x === s`true` || x === s`false`;
const values = [12, null, undefined, 'abc', s`asd`, 0, Infinity, [], cons(1, 2)];

describe('primitive', () => {
  describe('math', () => {
    describe('+', () => {
      forEach([[1, 2, 3], [3400, -1250, 2150], [4637436, 283484734, 288122170]]).it('should add numbers', (x, y, z) => {
        equal(z, f['+'](x, y));
      });
      forEach([[undefined, 55], [125, NaN], [-4, 'qwerty']]).it('should raise error for non-numbers', () => {
        throws(() => f['+'](x, y));
      });
    });
    describe('-', () => {
      it('should subtract numbers', () => {
        equal(69, f['-'](142, 73));
      });
      forEach([[undefined, 55], [125, NaN], [-4, 'qwerty']]).it('should raise error for non-numbers', (x, y) => {
        throws(() => f['-'](x, y));
      });
    });
    describe('*', () => {
      it('should multiply numbers', () => {
        equal(24, f['*'](4, 6));
      });
      forEach([[undefined, 55], [125, NaN], [-4, 'qwerty']]).it('should raise error for non-numbers', (x, y) => {
        throws(() => f['*'](x, y));
      });
      forEach([34, -7, 449384736738485434.45945]).it('should return zero when multiplying by zero', x => {
        equal(0, f['*'](0, x));
      });
    });
    describe('/', () => {
      it('should divide numbers', () => {
        equal(4, f['/'](24, 6));
      });
      forEach([[undefined, 55], [125, NaN], [-4, 'qwerty']]).it('should raise error for non-numbers', (x, y) => {
        throws(() => f['/'](x, y));
      });
      forEach([1, 0, -3]).it('should raise error when divisor is zero', x => {
        throws(() => f['/'](x, 0));
      });
    });
    forEach(['<', '>', '<=', '>=', '=']).describe('%s', op => {
      forEach([[3, 5], [0.0002, -123213], [-34, 234234]]).it('should return a Shen boolean', (x, y) => {
        ok(isShenBool(f[op](x, y)));
      });
    });
  });

  describe('strings', () => {
    describe('pos', () => {
      forEach([-1, 3, 1.5, 'a', null]).it('should raise an error if index is out of range or not an integer', i => {
        throws(() => f.pos('abc', i));
      });
    });
    describe('tlstr', () => {
      forEach([['a', ''], ['12', '2'], ['#*%', '*%']]).it('should return all but first character of string', (x, y) => {
        equal(y, f.tlstr(x));
      });
      it('should raise an error when given empty string', () => {
        throws(() => f.tlstr(''));
      });
    });
    describe('cn', () => {
      forEach(['', 'lorem ipsum', '&`#%^@*']).it('should return non-empty argument when other is empty', x => {
        equal(x, f.cn('', x));
        equal(x, f.cn(x, ''));
      });
    });
    describe('string->n', () => {
      it('should raise an error when given empty string', () => {
        throws(() => f['string->n'](''));
      });
      forEach([[97, 'abc'], [63, '?12']]).it('should only return code point for first character', (n, x) => {
        equal(n, f['string->n'](x));
      });
    });
    describe('n->string', () => {
      forEach([10, 45, 81, 76, 118]).it('should always return a string of length 1', n => {
        equal(1, asString(f['n->string'](n)).length);
      });
    });
    describe('str', () => {
      forEach(values).it('should return a string for any argument', x => {
        ok(isString(f.str(x)));
      });
    });
  });

  describe('symbols', () => {
    describe('intern', () => {
      it('should return the same symbol for the same name', () => {
        equal(f.intern('qwerty'), f.intern('qwerty'));
      });
    });
    describe('value', () => {
      it('should accept idle symbols', () => {
        equal('JavaScript', f.value(s`*language*`));
      });
      it('should raise error for symbol with no value', () => {
        throws(() => f.value(s`qwerty`));
      });
      it('should raise error for non-symbol argument', () => {
        throws(() => f.value(5));
        throws(() => f.value(cons(1, 2)));
      });
    });
    describe('set', () => {
      it('should return the assigned value', () => {
        equal(1, f.set(s`x`, 1));
      });
      it('should allow value to be retrieved later', () => {
        f.set(s`x`, 'abc');
        equal("abc", f.value(s`x`));
      });
    });
  });

  describe('conses', () => {
    describe('cons', () => {
      forEach(values).describe('should accept values of any type', x => {
        forEach(values).it('and any other type', y => {
          ok(isCons(f.cons(x, y)));
        });
      });
    });
    describe('hd', () => {
      it('should raise an error on empty list', () => {
        throws(() => f.hd(null));
      });
      forEach(values).it('should retrieve head value of any cons', x => {
        ok(equate(x, f.hd(f.cons(x, null))));
      });
    });
    describe('tl', () => {
      it('should raise an error on empty list', () => {
        throws(() => f.tl(null));
      });
      forEach(values).it('should retrieve head value of any cons', x => {
        ok(equate(x, f.tl(f.cons(null, x))));
      });
    });
  });

  describe('absvectors', () => {
    it('should store values in specified index', () => {
      equal('hi', f['<-address'](f['address->'](f.absvector(16), 3, 'hi'), 3));
    });
    describe('absvector', () => {
      forEach([-1, 'a', null, undefined]).it('should raise error when given non-positive-integer', n => {
        throws(() => f.absvector(n));
      });
      forEach([0, 1, 2, 3, 4]).it('should initialize all values to null', i => {
        equal(null, f['<-address'](f.absvector(5), i));
      });
    });
    describe('<-address', () => {
      forEach([-1, 'a', null, undefined]).it('should raise error when given non-positive-integer', i => {
        throws(() => f['<-address'](f.absvector(5), i));
      });
    });
    describe('address->', () => {
      forEach([-1, 'a', null, undefined]).it('should raise error when given non-positive-integer', i => {
        throws(() => f['address->'](f.absvector(5), i, null));
      });
    });
    describe('absvector?', () => {
      forEach([0, 12, 4835]).it('should return true for values returned by (absvector N)', n => {
        equal(s`true`, f['absvector?'](f.absvector(n)));
      });
    });
  });

  describe('recognisors', () => {
    forEach(['cons?', 'number?', 'string?', 'absvector?']).describe('%s', op => {
      forEach(values).it('should return a Shen boolean', x => {
        ok(isShenBool(f[op](x)));
      });
    });
  });

  describe('equality', () => {
    describe('=', () => {
      it('should compare booleans', () => {
        equal(s`true`,  evalKl([s`=`, s`true`, [s`and`, s`true`, s`true`]]));
        equal(s`false`, evalKl([s`=`, s`true`, [s`and`, s`true`, s`false`]]));
        equal(s`true`,  evalKl([s`=`, [s`number?`, 746], [s`number?`, 419]]));
        equal(s`true`,  evalKl([s`=`, 25, [s`+`, 11, 14]]));
      });
    });
    describe('equal', () => {
      it('should handle Infinity', () => {
        ok(equate(Infinity, Infinity));
        ok(equate(-Infinity, -Infinity));
        ok(!equate(-Infinity, Infinity));
      });
      it('should compare functions based on reference equality', () => {
        const f = evalKl([s`lambda`, s`X`, 0]);
        const g = evalKl([s`lambda`, s`X`, 0]);
        ok(equate(f, f));
        ok(!equate(f, g));
      });
      it('should be able to compare objects', () => {
        ok(equate({}, {}));
        ok(!equate({}, null));
        ok(equate({ a: 45, b: s`sym` }, { a: 45, b: s`sym` }));
        ok(equate({ ['key']: [{ a: 'abc', b: false }] }, { ['key']: [{ a: 'abc', b: false }] }));
        ok(!equate({ ['key']: [{ a: 'abc', b: false }] }, { ['key']: [{ a: 'abc', b: null }] }));
      });
    });
  });
});
