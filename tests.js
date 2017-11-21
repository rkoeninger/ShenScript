const { equal, ok } = require('assert');
const { os, name, version } = require('./src/env');
const { Sym, eq } = require('./src/types');
const Parser = require('./src/parser');
const Transpiler = require('./src/transpiler');
const { Kl, kl } = require('./src/kl');
global.kl = kl;
const exec = x => eval(Transpiler.translateHead(Parser.parseString(x)));

describe('environment', () => {
    it('operating system', () => console.log(os()));
    it('implementation name', () => console.log(name()));
    it('implementation version', () => console.log(version()));
});
describe('parsing', () => {
    it('should read string literals', () => equal('abc', Parser.parseString('"abc"')));
    it('should read symbols', () => ok(eq(new Sym('abc'), Parser.parseString('abc'))));
    it('should read lists', () => ok(eq(new Sym('abc'), Parser.parseString('(abc)').hd)));
    describe('numbers', () => {
        it('should parse numeric literals', () => equal(5, Parser.parseString('5')));
        it('should parse negative numeric literals', () => equal(-143, Parser.parseString('-143')));
        it('should parse fractional numeric literals', () => equal(4.625, Parser.parseString('4.625')));
        it('should parse explicitly positive numeric literals', () => equal(23, Parser.parseString('+23')));
    });
});
describe('transpiler', () => {
    it('should properly escape strings', () => equal('x\'', exec('(str x\')')));
});
describe('primitives', () => {
    it('conds should act as if-else chains', () => equal(2, exec('(cond (false 1) (true 2) (false 3))')));
    it('+ should add numbers', () => equal(3, exec('(+ 1 2)')));
    it('value should accept idle symbols', () => equal('JavaScript', exec('(value *language*)')));
    it('let should bind local variables', () => equal(123, exec('(let X 123 X)')));
    it('let should mask outer bindings', () => equal(3, exec('(let X 1 (let X 2 (let X 3 X)))')));
    it('let should handle nested bindings translated to iifes', () => equal(3, exec('(let X 1 (if (> X 0) (let X 2 (+ X 1)) 5))')));
    it('functions can be recursive', () => {
        exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
        equal(120, exec('(fac 5)'));
        equal(5040, exec('(fac 7)'));
    });
    it('argument expressions should be evaluated in order', () => {
        exec('(defun do (_ X) X)');
        equal(2, exec('(do (let X 1 X) (let X 2 X))'));
    });
    it('trap-error should provide error to handler', () => equal('hi', exec('(trap-error (simple-error "hi") (lambda X (error-to-string X)))')));
    it('trampolines should allow tail recursive functions to not blow the stack', () => {
        exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
        equal('done', exec('(count-down 20000)'));
    });
    it('trampolines should allow mutually recursive functions to not blow the stack', () => {
        exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
        exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
        ok(asJsBool(exec('(even? 20000)')));
    });
    it('partial application', () => equal(13, exec('((+ 6) 7)')));
    it('curried application', () => equal(13, exec('((lambda X (lambda Y (+ X Y))) 6 7)')));
    it('kl eval', () => equal(5, exec('(eval-kl (cons + (cons 2 (cons 3 ()))))')));
    it('access to javascript namespaced functions', () => equal(3, exec('(js.Math.max 2 3)')));
    it('embedded javascript', () => equal(5, exec('(js. "2 + 3")')));
});
