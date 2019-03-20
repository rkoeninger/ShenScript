const { equal, ok, throws } = require('assert');
const { parse } = require('./parser');
const { kl } = require('./refactor/core');
const $ = kl();

const s = parts => $.s(parts[0]);
const parse1 = s => parse(s)[0];
const exec = s => $.settle($.evalKl(parse1(s)));

describe('parsing', () => {
  it('should read string literals', () => equal('abc', parse1('"abc"')));
  it('should read symbols', () => equal(s`abc`, parse1('abc')));
  it('should read forms as arrays', () => equal(s`abc`, parse1('(abc)')[0]));
  describe('numbers', () => {
    it('should parse numeric literals', () => equal(5, parse1('5')));
    it('should parse negative numeric literals', () => equal(-143, parse1('-143')));
  });
});
describe('transpiler', () => {
  it('should properly escape strings', () => equal('x\'', exec('(str x\')')));
});
describe('primitives', () => {
  describe('math', () => {
    it('+ should add numbers', () => equal(3, exec('(+ 1 2)')));
    it('div by zero should raise error', () => throws(() => exec('(/ 1 0)')));
  });
  it('conds should act as if-else chains', () => equal(2, exec('(cond (false 1) (true 2) (false 3))')));
  it('value should accept idle symbols', () => equal('JavaScript', exec('(value *language*)')));
  it('value should raise error for undefined symbol', () => throws(() => exec('(value *qwerty*)')));
  it('let should bind local variables', () => equal(123, exec('(let X 123 X)')));
  it('let should mask outer bindings', () => equal(3, exec('(let X 1 (let X 2 (let X 3 X)))')));
  it('let should handle nested bindings translated to iifes', () => equal(3, exec('(let X 1 (if (> X 0) (let X 2 (+ X 1)) 5))')));
  it('functions can be recursive', () => {
    exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
    equal(120, exec('(fac 5)'));
    equal(5040, exec('(fac 7)'));
  });
  it('argument expressions should be evaluated in order', () => equal(2, exec('(tl (cons (let X 1 X) (let X 2 X)))')));
  it('trap-error should provide error to handler', () => equal('hi', exec('(trap-error (simple-error "hi") (lambda X (error-to-string X)))')));
  it('trampolines should allow tail recursive functions to not blow the stack', () => {
    exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
    equal('done', exec('(count-down 20000)'));
  });
  it('trampolines should allow mutually recursive functions to not blow the stack', () => {
    exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
    exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
    equal(s`true`, exec('(even? 20000)'));
  });
  it('partial application', () => equal(13, exec('((+ 6) 7)')));
  it('curried application', () => equal(13, exec('((lambda X (lambda Y (+ X Y))) 6 7)')));
  it('kl eval', () => equal(5, exec('(eval-kl (cons + (cons 2 (cons 3 ()))))')));
});
