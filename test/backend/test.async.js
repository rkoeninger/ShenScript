const { equal, ok, rejects } = require('assert');
const forEach                = require('mocha-each');
const { parseForm }          = require('../../scripts/parser');
const backend                = require('../../lib/backend');

const { cons, evalKl, f, future, s, valueOf } = backend({ async: true });
const exec = s => future(evalKl(parseForm(s)));

describe('async', () => {
  describe('evaluation', () => {
    it('eval-kl', async () => {
      equal(5, await exec('(eval-kl (cons + (cons 2 (cons 3 ()))))'));
      equal(5, await f['eval-kl'](cons(s`+`, cons(2, cons(3, null)))));
      equal(5, await f['eval-kl']([s`+`, 2, 3]));
      equal(5, await evalKl(cons(s`+`, cons(2, cons(3, null)))));
      equal(5, await evalKl([s`+`, 2, 3]));
    });
  });

  describe('conditionals', () => {
    describe('cond', () => {
      it('should raise an error when there are no clauses', async () => {
        await rejects(exec('(cond)'));
      });
      it('should act as an if-else chain', async () => {
        equal(2, await exec('(cond (false 1) (true 2) (false 3))'));
      });
    });
    describe('if', () => {
      it('should not evaluate both branches', async () => {
        equal(1, await exec('(tl (cons (if (= 0 0) (set x 1) (set x 2)) (value x)))'));
        equal(2, await exec('(tl (cons (if (= 0 1) (set x 1) (set x 2)) (value x)))'));
      });
      it('should evaluate side effects in nested ifs', async () => {
        await exec('(if (trap-error (simple-error "fail") (lambda E (do (set x 1) true))) (set y 2) (set y 0))');
        equal(1, valueOf('x'));
        equal(2, valueOf('y'));
        await exec('(if (trap-error (simple-error "fail") (lambda E (do (set x 3) false))) (set y 0) (set y 4))');
        equal(3, valueOf('x'));
        equal(4, valueOf('y'));
      });
    });
    describe('and', () => {
      it('should return a Shen boolean', async () => {
        equal(s`true`,  await exec('(and true  true)'));
        equal(s`false`, await exec('(and true  false)'));
        equal(s`false`, await exec('(and false true)'));
        equal(s`false`, await exec('(and false false)'));
      });
      it('should do short-circuit evaluation', async () => {
        await exec('(and false (simple-error "should not get evaluated"))');
        await rejects(exec('(and true (simple-error "should get evaluated"))'));
      });
    });
    describe('or', () => {
      it('should return a Shen boolean', async () => {
        equal(s`true`,  await exec('(or true  true)'));
        equal(s`true`,  await exec('(or true  false)'));
        equal(s`true`,  await exec('(or false true)'));
        equal(s`false`, await exec('(or false false)'));
      });
      it('should do short-circuit evaluation', async () => {
        await exec('(or true (simple-error "should not get evaluated"))');
        await rejects(exec('(or false (simple-error "should get evaluated"))'));
      });
    });
  });

  describe('variable bindings', () => {
    describe('let', () => {
      it('should bind local variables', async () => {
        equal(123, await exec('(let X 123 X)'));
      });
      it('should not bind local variables in value expression', async () => {
        equal('X', await exec('(let X (str X) X)'));
        await rejects(exec('(let X (+ 1 X) (* 2 X))'));
      });
      it('should not bind local variables outside body expression', async () => {
        equal(s`X`, await exec('(tl (cons (let X 2 (+ 1 X)) X))'));
      });
      it('should shadow outer bindings when nested', async () => {
        equal(3, await exec('(let X 1 (let X 2 (let X 3 X)))'));
        equal(3, await exec('(let X 1 (if (> X 0) (let X 2 (+ X 1)) 5))'));
      });
      it('should be able to initialize inner variable in terms of outer variable', async () => {
        equal(2, await exec('(let X 1 (let X (+ X 1) X))'));
      });
      it('should shadow outer lambda binding when nested', async () => {
        equal(8, await exec('((lambda X (let X 4 (+ X X))) 3)'));
      });
      it('should shadow defun parameters in outer scope', async () => {
        await exec('(defun triple (X) (let X 4 (* 3 X)))');
        equal(12, await exec('(triple 0)'));
      });
    });
    describe('lambda', () => {
      it('should shadow outer bindings when nested', async () => {
        equal(8, await exec('(((lambda X (lambda X (+ X X))) 3) 4)'));
      });
      it('should shadow outer let binding when nested', async () => {
        equal(8, await exec('(let X 3 ((lambda X (+ X X)) 4))'));
      });
      it('should shadow defun parameters in outer scope', async () => {
        await exec('(defun three (X) (lambda X (* 3 X)))');
        equal(12, await exec('((three 2) 4)'));
      });
    });
    describe('set/value key optimization', () => {
      it('should not try to optimize a variable that holds the key value in (value)', async () => {
        await exec('(set z 31)');
        equal(31, await exec('(let X z (value X))'));
      });
      it('should not try to optimize a variable that holds the key value in (set)', async () => {
        await exec('(let X z (set X 37))');
        equal(37, await exec('(value z)'));
      });
    });
  });

  describe('error handling', () => {
    describe('trap-error', () => {
      it('should provide error to handler', async () => {
        equal('hi', await exec('(trap-error (simple-error "hi") (lambda X (error-to-string X)))'));
      });
    });
  });

  describe('recursion', () => {
    forEach([[0, 1], [5, 120], [7, 5040]]).it('functions should be able to call themselves', async (n, r) => {
      await exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
      equal(r, await future(f.fac(n)));
    });
    describe('tail recursion', () => {
      const countDown = async body => {
        await evalKl([s`defun`, s`count-down`, [s`X`], parseForm(body)]);
        ok(await evalKl([s`count-down`, 20000]));
      };
      it('should be possible without overflow', async () => {
        await countDown('(if (= 0 X) true (count-down (- X 1)))');
      });
      it('should optimize through an if true branch', async () => {
        await countDown('(if (> X 0) (count-down (- X 1)) true)');
      });
      it('should optimize through an if false branch', async () => {
        await countDown('(if (<= X 0) true (count-down (- X 1)))');
      });
      it('should optimize through nested if expressions', async () => {
        await countDown('(if (<= X 0) true (if true (count-down (- X 1)) false))');
      });
      it('should optimize through let body', async () => {
        await countDown('(if (<= X 0) true (let F 1 (count-down (- X F))))');
      });
      it('should optimize through a first cond consequent', async () => {
        await countDown('(cond ((> X 0) (count-down (- X 1))) (true true))');
      });
      it('should optimize through a last cond consequent', async () => {
        await countDown('(cond ((<= X 0) true) (true (count-down (- X 1))))');
      });
      it('should optimize through last expression in a do expression', async () => {
        await countDown('(do 0 (if (<= X 0) true (do 0 (count-down (- X 1)))))');
      });
      it('should optimize through handler of trap-error expression', async () => {
        await countDown('(trap-error (if (> X 0) (simple-error "recur") true) (lambda E (count-down (- X 1))))');
      });
      it('should optimize through freeze calls', async () => {
        await countDown('(if (<= X 0) true ((freeze (count-down (- X 1)))))');
      });
      it('should optimize through lambda calls', async () => {
        await countDown('(if (<= X 0) true ((lambda Y (count-down (- X Y))) 1))');
      });
      it('should optimize through nested lambdas', async () => {
        await countDown('(let F (lambda F (lambda X (if (<= X 0) true ((F F) (- X 1))))) ((F F) 20000))');
      });
      it('should be possible for mutually recursive functions without overflow', async () => {
        await exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
        await exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
        equal(s`true`, await exec('(even? 20000)'));
      });
    });
  });

  describe('scope capture', () => {
    describe('lambda', () => {
      it('should capture local variables', async () => {
        equal(1, await exec('(let X 1 (let F (lambda Y X) (F 0)))'));
      });
      it('should not have access to symbols outside lexical scope', async () => {
        equal(s`Y`, await exec('(let F (lambda X Y) (let Y 3 (F 0)))'));
      });
    });
    describe('freeze', () => {
      it('should capture local variables', async () => {
        equal(1, await exec('(let X 1 (let F (freeze X) (F)))'));
      });
      it('should not have access to symbols outside lexical scope', async () => {
        equal(s`Y`, await exec('(let F (freeze Y) (let Y 3 (F)))'));
      });
    });
    describe('escaping', () => {
      it('$ should be usable as a variable', async () => {
        equal(3, await exec('(let $ 2 (+ 1 $))'));
      });
    });
  });

  describe('applications', () => {
    it('argument expressions should be evaluated in order', async () => {
      await exec('((set x (lambda X (lambda Y (+ X Y)))) (set x 1) (set x 2))');
      equal(2, valueOf('x'));
    });
    it('partial application', async () => {
      equal(13, await exec('((+ 6) 7)'));
    });
    it('curried application', async () => {
      equal(13, await exec('((lambda X (lambda Y (+ X Y))) 6 7)'));
    });
    it('should raise error if too many arguments are applied', async () => {
      await rejects(exec('(+ 1 2 3)'));
    });
  });
});
