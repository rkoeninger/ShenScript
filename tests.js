const { equal, ok } = require('assert');
const { Sym, eq } = require('./src/types');
const Parser = require('./src/parser');
const Transpiler = require('./src/transpiler');
const { Kl, kl } = require('./src/kl');
global.kl = kl;
const exec = x => eval(Transpiler.translateHead(Parser.parseString(x)));

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
describe('primitives', () => {
    it('conds should act as if-else chains', () => equal(2, exec('(cond (false 1) (true 2) (false 3))')));
    it('+ should add numbers', () => equal(3, exec('(+ 1 2)')));
    it('value should accept idle symbols', () => exec('(value *language*)') === 'JavaScript');
    it('let should bind local variables', () => exec('(let X 123 X)') === 123);
    it('let should mask outer bindings', () => exec('(let X 1 (let X 2 (let X 3 X)))') === 3);
    it('functions can be recursive', () => {
        exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
        return (exec('(fac 5)') === 120) && (exec('(fac 7)') === 5040);
    });
    it('argument expressions should be evaluated in order', () => {
        exec('(defun do (_ X) X)');
        return exec('(do (let X 1 X) (let X 2 X))') === 2;
    });
    it('trampolines should allow tail recursive functions to not blow the stack', () => {
        exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
        return exec('(count-down 20000)') === 'done';
    });
    it('trampolines should allow mutually recursive functions to not blow the stack', () => {
        exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
        exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
        return asJsBool(exec('(even? 20000)'));
    });
    it('partial application', () => exec('((+ 6) 7)') === 13);
    it('curried application', () => exec('((lambda X (lambda Y (+ X Y))) 6 7)') === 13);
    it('access to javascript namespaced functions', () => exec('(js.Math.max 2 3)') === 3);
    it('embedded javascript', () => exec('(js. "2 + 3")') === 5);
});
