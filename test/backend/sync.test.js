const { equal, ok, throws } = require('assert');
const { parse } = require('../../scripts/parser');
const backend = require('../../src/backend');
const { cons, evalKl, f, s, settle, valueOf } = backend();
const parse1 = s => parse(s)[0];
const exec = s => settle(evalKl(parse1(s)));
const values = [12, null, undefined, 'abc', s`asd`, 0, Infinity, [], cons(1, 2)];

describe('sync', () => {
  describe('evaluation', () => {
    it('eval-kl', () => {
      equal(5, exec('(eval-kl (cons + (cons 2 (cons 3 ()))))'));
      equal(5, f['eval-kl'](cons(s`+`, cons(2, cons(3, null)))));
      equal(5, f['eval-kl']([s`+`, 2, 3]));
      equal(5, evalKl(cons(s`+`, cons(2, cons(3, null)))));
      equal(5, evalKl([s`+`, 2, 3]));
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
    describe('escaping', () => {
      it('$ should be usable as a variable', () => {
        equal(3, exec('(let $ 2 (+ 1 $))'));
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
        values.forEach(x => throws(() => f['error-to-string'](x)));
      });
    });
  });

  describe('recursion', () => {
    it('functions should be able to call themselves', () => {
      exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
      [[0, 1], [5, 120], [7, 5040]].forEach(([n, r]) => equal(r, settle(f.fac(n))));
    });
    describe('tail recursion', () => {
      const countDown = body => {
        evalKl([s`defun`, s`count-down`, [s`X`], parse1(body)]);
        ok(evalKl([s`count-down`, 20000]));
      };
      it('should be possible without overflow', () => {
        countDown('(if (= 0 X) true (count-down (- X 1)))');
      });
      it('should optimize through an if true branch', () => {
        countDown('(if (> X 0) (count-down (- X 1)) true)');
      });
      it('should optimize through an if false branch', () => {
        countDown('(if (<= X 0) true (count-down (- X 1)))');
      });
      it('should optimize through nested if expressions', () => {
        countDown('(if (<= X 0) true (if true (count-down (- X 1)) false))');
      });
      it('should optimize through let body', () => {
        countDown('(if (<= X 0) true (let F 1 (count-down (- X F))))');
      });
      it('should optimize through a first cond consequent', () => {
        countDown('(cond ((> X 0) (count-down (- X 1))) (true true))');
      });
      it('should optimize through a last cond consequent', () => {
        countDown('(cond ((<= X 0) true) (true (count-down (- X 1))))');
      });
      it('should optimize through last expression in a do expression', () => {
        countDown('(do 0 (if (<= X 0) true (do 0 (count-down (- X 1)))))');
      });
      it('should optimize through handler of trap-error expression', () => {
        countDown('(trap-error (if (> X 0) (simple-error "recur") true) (lambda E (count-down (- X 1))))');
      });
      it('should optimize through freeze calls', () => {
        countDown('(if (<= X 0) true ((freeze (count-down (- X 1)))))');
      });
      it('should optimize through lambda calls', () => {
        countDown('(if (<= X 0) true ((lambda Y (count-down (- X Y))) 1))');
      });
      it('should optimize through nested lambdas', () => {
        countDown('(let F (lambda F (lambda X (if (<= X 0) true ((F F) (- X 1))))) ((F F) 20000))');
      });
      it('should be possible for mutually recursive functions without overflow', () => {
        exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
        exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
        equal(s`true`, exec('(even? 20000)'));
      });
    });
  });

  describe('scope capture', () => {
    describe('lambda', () => {
      it('should capture local variables', () => {
        equal(1, exec('(let X 1 (let F (lambda Y X) (F 0)))'));
      });
      it('should not have access to symbols outside lexical scope', () => {
        equal(s`Y`, exec('(let F (lambda X Y) (let Y 3 (F 0)))'));
      });
    });
    describe('freeze', () => {
      it('should capture local variables', () => {
        equal(1, exec('(let X 1 (let F (freeze X) (F)))'));
      });
      it('should not have access to symbols outside lexical scope', () => {
        equal(s`Y`, exec('(let F (freeze Y) (let Y 3 (F)))'));
      });
    });
  });

  describe('applications', () => {
    it('argument expressions should be evaluated in order', () => {
      exec('((set x (lambda X (lambda Y (+ X Y)))) (set x 1) (set x 2))');
      equal(2, valueOf('x'));
    });
    it('partial application', () => {
      equal(13, exec('((+ 6) 7)'));
    });
    it('curried application', () => {
      equal(13, exec('((lambda X (lambda Y (+ X Y))) 6 7)'));
    });
  });
});
