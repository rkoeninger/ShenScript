const { equal, ok, throws } = require('assert');
const { parse } = require('../parser');
const { kl } = require('../refactor/core');
const $ = kl();

const s = parts => $.s(parts[0]);
const parse1 = s => parse(s)[0];
const exec = s => $.settle($.evalKl(parse1(s)));

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
      equal(5,    parse1('5'));
      equal(287,  parse1('287'));
      equal(9456, parse1('9456'));
    });
    it('should parse negative numbers', () => {
      equal(-4,   parse1('-4'));
      equal(-143, parse1('-143'));
      equal(-79,  parse1('-79'));
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

describe('primitives', () => {
  describe('math', () => {
    describe('+', () => {
      const add = $.f['+'];
      it('should add numbers', () => {
        equal(3,             add(1,           2));
        equal(2150,          add(3400,        -1250));
        equal(4024423313307, add(75848374834, 3948574938473));
      });
      it('should raise error for non-numbers', () => {
        throws(() => add(undefined, 55));
        throws(() => add(125, NaN));
        throws(() => add(-4, 'qwerty'));
      });
    });
    describe('-', () => {
      const sub = $.f['-'];
      it('should subtract numbers', () => {
        equal(69, sub(142, 73));
      });
    });
    describe('*', () => {
      const mul = $.f['*'];
      it('should multiply numbers', () => {
        equal(24, mul(4, 6));
      });
      it('should raise error for non-numbers', () => {
        throws(() => mul(undefined, 55));
        throws(() => mul(125, NaN));
        throws(() => mul(-4, 'qwerty'));
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
        throws(() => div(undefined, 55));
        throws(() => div(125, NaN));
        throws(() => div(-4, 'qwerty'));
      });
      it('should raise error when divisor is zero', () => {
        [1, 0, -3].forEach(x => throws(() => div(x, 0)));
      });
    })
  });
  describe('recognisors', () => {
    describe('cons?', () => {
      const consp = $.f['cons?'];
      it('should return a Shen boolean', () => {
        equal(s`true`,  consp($.cons(1, 2)));
        equal(s`true`,  consp($.cons(1, $.cons(2, null))));
        equal(s`false`, consp(12));
        equal(s`false`, consp(null));
      });
    });
    describe('number?', () => {
      const numberp = $.f['number?'];
      it('should return a Shen boolean', () => {
        equal(s`true`,  numberp(4));
        equal(s`false`, numberp(''));
      });
    });
    describe('string?', () => {
      const stringp = $.f['string?'];
      it('should return a Shen boolean', () => {
        equal(s`true`,  stringp(''));
        equal(s`false`, stringp(s`qwerty`));
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
      equal(1, exec('(tl (cons (if (= 0 0) (set *x* 1) (set *x* 2)) (value *x*)))'));
      equal(2, exec('(tl (cons (if (= 0 1) (set *x* 1) (set *x* 2)) (value *x*)))'));
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
    it('should mask outer bindings', () => {
      equal(3, exec('(let X 1 (let X 2 (let X 3 X)))'));
    });
    it('should handle nested bindings translated to iifes', () => {
      equal(3, exec('(let X 1 (if (> X 0) (let X 2 (+ X 1)) 5))'));
    });
  });
});

describe('error handling', () => {
  describe('trap-error', () => {
    it('should provide error to handler', () => {
      equal('hi', exec('(trap-error (simple-error "hi") (lambda X (error-to-string X)))'));
    });
  });
});

describe('recursion', () => {
  it('functions should be able to call themselves', () => {
    exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
    equal(120, exec('(fac 5)'));
    equal(5040, exec('(fac 7)'));
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
    exec('(cons (set *x* 1) (set *x* 2))');
    equal(2, $.symbols['*x*']);
  });
  it('partial application', () => {
    equal(13, exec('((+ 6) 7)'));
  });
  it('curried application', () => {
    equal(2, $.f['+'].arity);
    equal(1, $.f['+'](6).arity);
    equal(13, $.f['+'](6, 7));
    equal(13, $.f['+'](6)(7));
    console.log($.fun(X => $.fun(Y => $.asNumber(X) + $.asNumber(Y), 'g', 1), 'f', 1)(6, 7));
    // equal(13, $.fun(X => $.fun(Y => $.asNumber(X) + $.asNumber(Y), 'lambda', 1), 'lambda', 1)(6, 7));
    // equal(13, exec('((lambda X (lambda Y (+ X Y))) 6 7)')); // TODO: why is Y the Array constructor?
  });
});

describe('globals', () => {
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
      equal(1, exec('(set *x* 1)'));
    });
    it('should allow value to be retrieved later', () => {
      exec('(set *x* "abc")');
      equal("abc", exec('(value *x*)'));
    });
  });
});
