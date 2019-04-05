const { equal, ok, throws } = require('assert');
const { parse } = require('../../build/parser');
const backend = require('../../src/backend');
const { asString, cons, isCons, evalKl, f, s, equal: eq } = backend();
const isShenBool = x => x === s`true` || x === s`false`;
const values = [12, null, undefined, 'abc', s`asd`, 0, Infinity, [], cons(1, 2)];

describe('primitive', () => {
  describe('math', () => {
    describe('+', () => {
      const add = f['+'];
      it('should add numbers', () => {
        equal(3,             add(1,           2));
        equal(2150,          add(3400,        -1250));
        equal(4024423313307, add(75848374834, 3948574938473));
      });
      it('should raise error for non-numbers', () => {
        [[undefined, 55], [125, NaN], [-4, 'qwerty']].forEach(([x, y]) => throws(() => add(x, y)));
      });
    });
    describe('-', () => {
      const sub = f['-'];
      it('should subtract numbers', () => {
        equal(69, sub(142, 73));
      });
      it('should raise error for non-numbers', () => {
        [[undefined, 55], [125, NaN], [-4, 'qwerty']].forEach(([x, y]) => throws(() => sub(x, y)));
      });
    });
    describe('*', () => {
      const mul = f['*'];
      it('should multiply numbers', () => {
        equal(24, mul(4, 6));
      });
      it('should raise error for non-numbers', () => {
        [[undefined, 55], [125, NaN], [-4, 'qwerty']].forEach(([x, y]) => throws(() => mul(x, y)));
      });
      it('should return zero when multiplying by zero', () => {
        [34, -7, 449384736738485434.45945].forEach(x => equal(0, mul(0, x)));
      });
    });
    describe('/', () => {
      const div = f['/'];
      it('should divide numbers', () => {
        equal(4, div(24, 6));
      });
      it('should raise error for non-numbers', () => {
        [[undefined, 55], [125, NaN], [-4, 'qwerty']].forEach(([x, y]) => throws(() => div(x, y)));
      });
      it('should raise error when divisor is zero', () => {
        [1, 0, -3].forEach(x => throws(() => div(x, 0)));
      });
    });
    describe('<, >, <=, >=, =', () => {
      const ops = ['<', '>', '<=', '>=', '='].map(x => f[x]);
      it('should return a Shen boolean', () => {
        ops.forEach(op => {
          [[3, 5], [0.0002, -123213], [-34, 234234]].forEach(([x, y]) => {
            ok(isShenBool(op(x, y)));
          });
        });
      });
    });
  });

  describe('strings', () => {
    describe('pos', () => {
      it('should raise an error if index is out of range or not an integer', () => {
        [-1, 3, 1.5, 'a', null].forEach(i => throws(() => f.pos('abc', i)));
      });
    });
    describe('tlstr', () => {
      it('should return all but first character of string', () => {
        [['a', ''], ['12', '2'], ['#*%', '*%']].forEach(([x, y]) => equal(y, f.tlstr(x)));
      });
      it('should raise an error when given empty string', () => {
        throws(() => f.tlstr(''));
      });
    });
    describe('cn', () => {
      it('should return non-empty argument when other is empty', () => {
        ['', 'lorem ipsum', '&`#%^@*'].forEach(x => {
          equal(x, f.cn('', x));
          equal(x, f.cn(x, ''));
        });
      });
    });
    describe('string->n', () => {
      it('should raise an error when given empty string', () => {
        throws(() => f['string->n'](''));
      });
      it('should only return code point for first character', () => {
        [[97, 'abc'], [63, '?12']].forEach(([n, x]) => equal(n, f['string->n'](x)));
      });
    });
    describe('n->string', () => {
      it('should always return a string of length 1', () => {
        [10, 45, 81, 76, 118].forEach(n => asString(f['n->string'](n)).length === 1);
      });
    });
    describe('str', () => {
      it('should return a string for any argument', () => {
        values.forEach(x => f.str(x));
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
      it('should accept values of any type', () => {
        values.forEach(x => values.forEach(y => ok(isCons(f.cons(x, y)))));
      });
    });
    describe('hd', () => {
      it('should raise an error on empty list', () => {
        throws(() => f.hd(null));
      });
      it('should retrieve head value of any cons', () => {
        values.forEach(x => ok(eq(x, f.hd(f.cons(x, null)))));
      });
    });
    describe('tl', () => {
      it('should raise an error on empty list', () => {
        throws(() => f.tl(null));
      });
      it('should retrieve head value of any cons', () => {
        values.forEach(x => ok(eq(x, f.tl(f.cons(null, x)))));
      });
    });
  });

  describe('absvectors', () => {
    it('should store values in specified index', () => {
      equal('hi', f['<-address'](f['address->'](f.absvector(16), 3, 'hi'), 3));
    });
    describe('absvector', () => {
      it('should raise error when given non-positive-integer', () => {
        [-1, 'a', null, undefined].forEach(n => throws(() => f.absvector(n)));
      });
      it('should initialize all values to null', () => {
        const a = f.absvector(5);
        [0, 1, 2, 3, 4].forEach(i => equal(null, f['<-address'](a, i)));
      });
    });
    describe('<-address', () => {
      it('should raise error when given non-positive-integer', () => {
        const a = f.absvector(5);
        [-1, 'a', null, undefined].forEach(i => throws(() => f['<-address'](a, i)));
      });
    });
    describe('address->', () => {
      it('should raise error when given non-positive-integer', () => {
        const a = f.absvector(5);
        [-1, 'a', null, undefined].forEach(i => throws(() => f['address->'](a, i, null)));
      });
    });
    describe('absvector?', () => {
      it('should return true for values returned by (absvector N)', () => {
        [0, 12, 4835].forEach(n => equal(s`true`, f['absvector?'](f.absvector(n))));
      });
    });
  });

  describe('recognisors', () => {
    it('should return Shen booleans', () => {
      const ops = ['cons?', 'number?', 'string?', 'absvector?'];
      ops.forEach(op => values.forEach(x => ok(isShenBool(f[op](x)))));
    });
  });

  describe('equality', () => {
    describe('equal', () => {
      it('should handle Infinity', () => {
        ok(eq(Infinity, Infinity));
        ok(eq(-Infinity, -Infinity));
        ok(!eq(-Infinity, Infinity));
      });
      it('should compare functions based on reference equality', () => {
        const f = evalKl([s`lambda`, s`X`, 0]);
        const g = evalKl([s`lambda`, s`X`, 0]);
        ok(eq(f, f));
        ok(!eq(f, g));
      });
      it('should be able to compare objects', () => {
        ok(eq({}, {}));
        ok(!eq({}, null));
        ok(eq({ a: 45, b: s`sym` }, { a: 45, b: s`sym` }));
        ok(eq({ ['key']: [{ a: 'abc', b: false }] }, { ['key']: [{ a: 'abc', b: false }] }));
        ok(!eq({ ['key']: [{ a: 'abc', b: false }] }, { ['key']: [{ a: 'abc', b: null }] }));
      });
    });
  });
});
