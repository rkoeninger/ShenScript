const { equal, ok, throws } = require('assert');
const { parse } = require('../parser');
const { kl } = require('../refactor/core');
const $ = kl();

const s = parts => $.s(parts[0]);
const parse1 = s => parse(s)[0];
const exec = s => $.settle($.evalKl(parse1(s)));
const isShenBool = x => x === s`true` || x === s`false`;
const values = [12, null, undefined, 'abc', s`asd`, 0, Infinity, [], $.cons(1, 2)];

describe('parsing', () => {
  describe('symbolic literals', () => {
    it('should parse any non-whitespace, non-paren', () => {
      ['abc', 'x\'{', '.<?/^'].forEach(x => equal($.s(x), parse1(x)));
    });
  });
  describe('string literals', () => {
    it('should parse empty strings', () => {
      equal('', parse1('""'));
    });
    it('should capture any whitespace', () => {
      ['a\tb', 'a \n b', 'a   b', 'a\r\n\vb'].forEach(x => equal(x, parse1(`"${x}"`)));
    });
    it('should capture all ascii characters', () => {
      ['~!@#$%', '^&*()_+`\'<', '>,./?;:'].forEach(x => equal(x, parse1(`"${x}"`)));
    });
  });
  describe('numberic literals', () => {
    it('should parse zero', () => {
      equal(0, parse1('0'));
    });
    it('should parse numbers', () => {
      [[5, '5'], [287, '287'], [9456, '9456']].forEach(([n, s]) => equal(n, parse1(s)));
    });
    it('should parse negative numbers', () => {
      [[-4, '-4'], [-143, '-143'], [-79, '-79']].forEach(([n, s]) => equal(n, parse1(s)));
    });
  });
  describe('forms', () => {
    it('should parse empty forms as empty arrays', () => {
      equal(0, parse1('()').length);
    });
    it('should parse forms as arrays', () => {
      equal(s`abc`, parse1('(abc)')[0]);
      equal(s`def`, parse1('(abc def)')[1]);
    });
    it('should parse nested forms as nested arrays', () => {
      const expr = parse1('(if (>= 0 X) X (* -1 X))');
      equal(4,     expr.length);
      equal(s`if`, expr[0]);
      equal(3,     expr[1].length);
      equal(s`>=`, expr[1][0]);
      equal(0,     expr[1][1]);
      equal(s`X`,  expr[1][2]);
      equal(s`X`,  expr[2]);
      equal(3,     expr[3].length);
      equal(s`*`,  expr[3][0]);
      equal(-1,    expr[3][1]);
      equal(s`X`,  expr[3][2]);
    });
  });
});

describe('math', () => {
  describe('+', () => {
    const add = $.f['+'];
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
    const sub = $.f['-'];
    it('should subtract numbers', () => {
      equal(69, sub(142, 73));
    });
    it('should raise error for non-numbers', () => {
      [[undefined, 55], [125, NaN], [-4, 'qwerty']].forEach(([x, y]) => throws(() => sub(x, y)));
    });
  });
  describe('*', () => {
    const mul = $.f['*'];
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
    const div = $.f['/'];
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
    const ops = ['<', '>', '<=', '>=', '='].map(x => $.f[x]);
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
      [-1, 3, 1.5, 'a', null].forEach(i => throws(() => $.f.pos('abc', i)));
    });
  });
  describe('tlstr', () => {
    it('should return ', () => {
      [['a', ''], ['12', '2'], ['#*%', '*%']].forEach(([s, t]) => equal(t, $.f.tlstr(s)));
    });
    it('should raise an error when given empty string', () => {
      throws(() => $.f.tlstr(''));
    });
  });
  describe('cn', () => {
    it('should return non-empty argument when other is empty', () => {
      ['', 'lorem ipsum', '&`#%^@*'].forEach(s => {
        equal(s, $.f.cn('', s));
        equal(s, $.f.cn(s, ''));
      });
    });
  });
  describe('string->n', () => {
    it('should raise an error when given empty string', () => {
      throws(() => $.f['string->n'](''));
    });
    it('should only return code point for first character', () => {
      [[97, 'abc'], [63, '?12']].forEach(([n, s]) => equal(n, $.f['string->n'](s)));
    });
  });
  describe('n->string', () => {
    it('should always return a string of length 1', () => {
      [10, 45, 81, 76, 118].forEach(n => $.asString($.f['n->string'](n)).length === 1);
    });
  });
  describe('str', () => {
    it('should return a string for any argument', () => {
      values.forEach(x => $.f.str(x));
    });
  });
});

describe('symbols', () => {
  describe('intern', () => {
    it('should return the same symbol for the same name', () => {
      equal($.f.intern('qwerty'), $.f.intern('qwerty'));
    });
  });
  describe('value', () => {
    it('should accept idle symbols', () => {
      equal('JavaScript', exec('(value *language*)'));
    });
    it('should raise error for symbol with no value', () => {
      throws(() => exec('(value *qwerty*)'));
    });
    it('should raise error for non-symbol argument', () => {
      throws(() => exec('(value 5)'));
      throws(() => exec('(value (cons 1 2))'));
    });
  });
  describe('set', () => {
    it('should return the assigned value', () => {
      equal(1, exec('(set x 1)'));
    });
    it('should allow value to be retrieved later', () => {
      exec('(set x "abc")');
      equal("abc", exec('(value x)'));
    });
  });
});

describe('conses', () => {
  describe('cons', () => {
    it('should accept values of any type', () => {
      values.forEach(x => values.forEach(y => ok($.isCons($.f.cons(x, y)))));
    });
  });
  describe('hd', () => {
    it('should raise an error on empty list', () => {
      throws(() => $.f.hd(null));
    });
    it('should retrieve head value of any cons', () => {
      values.forEach(x => ok($.equal(x, $.f.hd($.f.cons(x, null)))));
    });
  });
  describe('tl', () => {
    it('should raise an error on empty list', () => {
      throws(() => $.f.tl(null));
    });
    it('should retrieve head value of any cons', () => {
      values.forEach(x => ok($.equal(x, $.f.tl($.f.cons(null, x)))));
    });
  });
});

describe('absvectors', () => {
  it('should store values in specified index', () => {
    equal('hi', $.f['<-address']($.f['address->']($.f.absvector(16), 3, 'hi'), 3));
  });
  describe('absvector', () => {
    it('should raise error when given non-positive-integer', () => {
      [-1, 'a', null, undefined].forEach(n => throws(() => $.f.absvector(n)));
    });
    it('should initialize all values to null', () => {
      const a = $.f.absvector(5);
      [0, 1, 2, 3, 4].forEach(i => equal(null, $.f['<-address'](a, i)));
    });
  });
  describe('<-address', () => {
    it('should raise error when given non-positive-integer', () => {
      const a = $.f.absvector(5);
      [-1, 'a', null, undefined].forEach(i => throws(() => $.f['<-address'](a, i)));
    });
  });
  describe('address->', () => {
    it('should raise error when given non-positive-integer', () => {
      const a = $.f.absvector(5);
      [-1, 'a', null, undefined].forEach(i => throws(() => $.f['address->'](a, i, null)));
    });
  });
  describe('absvector?', () => {
    it('should return true for values returned by (absvector N)', () => {
      [0, 12, 4835].forEach(n => equal(s`true`, $.f['absvector?']($.f.absvector(n))));
    });
  });
});

describe('recognisors', () => {
  it('should return Shen booleans', () => {
    const ops = ['cons?', 'number?', 'string?', 'absvector?'];
    ops.forEach(op => values.forEach(x => ok(isShenBool($.f[op](x)))));
  });
});

describe('equality', () => {
  describe('=', () => {
    it('should handle Infinity', () => {
      equal(s`true`,  $.f['='](Infinity, Infinity));
      equal(s`true`,  $.f['='](-Infinity, -Infinity));
      equal(s`false`, $.f['='](-Infinity, Infinity));
    });
    it('should compare functions based on reference equality', () => {
      const f = $.evalKl([s`lambda`, s`X`, 0]);
      const g = $.evalKl([s`lambda`, s`X`, 0]);
      equal(s`true`,  $.f['='](f, f));
      equal(s`false`, $.f['='](f, g));
    });
  });
});

describe('evaluation', () => {
  it('eval-kl', () => {
    equal(5, exec('(eval-kl (cons + (cons 2 (cons 3 ()))))'));
    equal(5, $.f['eval-kl']($.cons(s`+`, $.cons(2, $.cons(3, null)))));
    equal(5, $.f['eval-kl']([s`+`, 2, 3]));
    equal(5, $.evalKl($.cons(s`+`, $.cons(2, $.cons(3, null)))));
    equal(5, $.evalKl([s`+`, 2, 3]));
  });
});

describe('conditionals', () => {
  describe('cond', () => {
    it('should raise an error when there are no clauses', () => {
      throws(() => exec('(cond)'));
    });
    it('should act as an if-else chain', () => {
      equal(2, exec('(cond (false 1) (true 2) (false 3))'));
    });
  });
  describe('if', () => {
    it('should not evaluate both branches', () => {
      equal(1, exec('(tl (cons (if (= 0 0) (set x 1) (set x 2)) (value x)))'));
      equal(2, exec('(tl (cons (if (= 0 1) (set x 1) (set x 2)) (value x)))'));
    });
  });
  describe('and', () => {
    it('should return a Shen boolean', () => {
      equal(s`true`,  exec('(and true  true)'));
      equal(s`false`, exec('(and true  false)'));
      equal(s`false`, exec('(and false true)'));
      equal(s`false`, exec('(and false false)'));
    });
    it('should do short-circuit evaluation', () => {
      exec('(and false (simple-error "should not get evaluated"))');
      throws(() => exec('(and true (simple-error "should get evaluated"))'));
    });
  });
  describe('or', () => {
    it('should return a Shen boolean', () => {
      equal(s`true`,  exec('(or true  true)'));
      equal(s`true`,  exec('(or true  false)'));
      equal(s`true`,  exec('(or false true)'));
      equal(s`false`, exec('(or false false)'));
    });
    it('should do short-circuit evaluation', () => {
      exec('(or true (simple-error "should not get evaluated"))');
      throws(() => exec('(or false (simple-error "should get evaluated"))'));
    });
  });
});

describe('variable bindings', () => {
  describe('let', () => {
    it('should bind local variables', () => {
      equal(123, exec('(let X 123 X)'));
    });
    it('should not bind local variables in value expression', () => {
      equal('X', exec('(let X (str X) X)'));
      throws(() => exec('(let X (+ 1 X) (* 2 X))'));
    });
    it('should not bind local variables outside body expression', () => {
      equal(s`X`, exec('(tl (cons (let X 2 (+ 1 X)) X))'));
    });
    it('should shadow outer bindings when nested', () => {
      equal(3, exec('(let X 1 (let X 2 (let X 3 X)))'));
      equal(3, exec('(let X 1 (if (> X 0) (let X 2 (+ X 1)) 5))'));
    });
    it('should shadow outer lambda binding when nested', () => {
      equal(8, exec('((lambda X (let X 4 (+ X X))) 3)'));
    });
    it('should shadow defun parameters in outer scope', () => {
      exec('(defun triple (X) (let X 4 (* 3 X)))');
      equal(12, exec('(triple 0)'));
    });
  });
  describe('lambda', () => {
    it('should shadow outer bindings when nested', () => {
      equal(8, exec('(((lambda X (lambda X (+ X X))) 3) 4)'));
    });
    it('should shadow outer let binding when nested', () => {
      equal(8, exec('(let X 3 ((lambda X (+ X X)) 4))'));
    });
    it('should shadow defun parameters in outer scope', () => {
      exec('(defun three (X) (lambda X (* 3 X)))');
      equal(12, exec('((three 2) 4)'));
    });
  });
});

describe('error handling', () => {
  describe('trap-error', () => {
    it('should provide error to handler', () => {
      equal('hi', exec('(trap-error (simple-error "hi") (lambda X (error-to-string X)))'));
    });
  });
  describe('error-to-string', () => {
    it('should raise error when given non-error', () => {
      values.forEach(x => throws(() => $.f['error-to-string'](x)));
    });
  });
});

describe('recursion', () => {
  it('functions should be able to call themselves', () => {
    exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
    [[0, 1], [5, 120], [7, 5040]].forEach(([n, r]) => equal(r, $.settle($.f.fac(n))));
  });
  describe('tail recursion', () => {
    it('should be possible without overflow', () => {
      exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
      equal('done', exec('(count-down 20000)'));
    });
    it('should be possible for mutually recursive functions without overflow', () => {
      exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
      exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
      equal(s`true`, exec('(even? 20000)'));
    });
  });
});

describe('applications', () => {
  it('argument expressions should be evaluated in order', () => {
    exec('((set x (lambda X (lambda Y (+ X Y)))) (set x 1) (set x 2))');
    equal(2, $.symbols['x']);
  });
  it('partial application', () => {
    equal(13, exec('((+ 6) 7)'));
  });
  it('curried application', () => {
    equal(13, exec('((lambda X (lambda Y (+ X Y))) 6 7)'));
  });
});
