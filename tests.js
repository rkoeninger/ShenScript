'use strict';

// function check(f) {
//     if (!f()) console.error('fail');
// }
// function exec(x) {
//     return eval(Transpiler.translateHead(Parser.parseString(x)));
// }
// (function () {
//     check(() => eq(Parser.parseString('"abc"'), 'abc'));
//     check(() => eq(Parser.parseString('abc'), new Sym('abc')));
//     check(() => eq(Parser.parseString('(abc)').hd, new Sym('abc')));
//     check(() => Parser.parseString('5') === 5);
//     check(() => Parser.parseString('-13') === -13);
//     check(() => Parser.parseString('+1.25') === 1.25);
//     check(() => exec('(+ 1 2)') === 3);
//     check(() => exec('(value *language*)') === 'JavaScript');
//     check(() => exec('(let X 123 X)') === 123);
//     check(() => exec('(let X 1 (let X 2 (let X 3 X)))') === 3);
//     check(() => {
//         exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
//         return (exec('(fac 5)') === 120) && (exec('(fac 7)') === 5040);
//     });
//     check(() => {
//         exec('(defun do (_ X) X)');
//         return exec('(do (let X 1 X) (let X 2 X))') === 2;
//     });
//     check(() => {
//         exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
//         return exec('(count-down 20000)') === 'done';
//     });
//     check(() => {
//         exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
//         exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
//         return asJsBool(exec('(even? 20000)'));
//     });
//     check(() => exec('((+ 6) 7)') === 13);
//     check(() => exec('((lambda X (lambda Y (+ X Y))) 6 7)') === 13);
//     check(() => exec('(js. "2 + 3")') === 5);
//     check(() => exec('(js.Math.max 2 3)') === 3)
//     console.log('done');
// })();

const { equal, ok } = require('assert');
const { Sym, eq } = require('./types.js');
const Parser = require('./parser.js');

describe('parsing', () => {
    it('should read string literals', () => equal('abc', Parser.parseString('"abc"')));
    it('should read symbols', () => ok(eq(new Sym('abc'), Parser.parseString('abc'))));
    describe('numbers', () => {
        it('should parse numeric literals', () => equal(5, Parser.parseString('5')));
        it('should parse negative numeric literals', () => equal(-143, Parser.parseString('-143')));
        it('should parse fractional numeric literals', () => equal(4.625, Parser.parseString('4.625')));
        it('should parse explicitly positive numeric literals', () => equal(23, Parser.parseString('+23')));
    });
});
