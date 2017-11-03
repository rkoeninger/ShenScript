

function check(f) {
    if (!f()) console.error('fail');
}

function exec(x) {
    return eval(translate(parse(x)));
}

function tests() {
    check(() => eq(parse('"abc"'), 'abc'));
    check(() => eq(parse('(abc)').hd, new Sym('abc')));
    check(() => parse('5') === 5);
    check(() => exec('(+ 1 2)') === 3);
    check(() => exec('(value *language*)') === 'JavaScript');
    check(() => exec('(let X 123 X)') === 123);
    check(() => exec('(let X 1 (let X 2 (let X 3 X)))') === 3);
    check(() => {
        exec('(defun fac (N) (if (= 0 N) 1 (* N (fac (- N 1)))))');
        return (exec('(fac 5)') === 120) && (exec('(fac 7)') === 5040);
    });
    check(() => {
        exec('(defun do (_ X) X)');
        return exec('(do (let X 1 X) (let X 2 X))') === 2;
    });
    check(() => {
        exec('(defun count-down (X) (if (= 0 X) "done" (count-down (- X 1))))');
        return exec('(count-down 20000)') === 'done';
    });
    check(() => {
        exec('(defun even? (X) (if (= 0 X) true  (odd?  (- X 1))))');
        exec('(defun odd?  (X) (if (= 0 X) false (even? (- X 1))))');
        return asJsBool(exec('(even? 20000)'));
    });
    check(() => {
        return true;
    });
    check(() => {
        return true;
    });
    console.log('done');
}

tests();
