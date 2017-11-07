'use strict';

// TODO: https://github.com/lukehoban/es6features

//
// Init KL environment
//

// TODO: inline template can be set on function object

// TODO: all functions need to have arity property set

class Kl {
    constructor() {
        this.startTime = new Date().getTime();
        this.uniqueSuffix = 0;
        this.symbols = {};
        this.fns = {};
    }

    defun(name, arity, f) {
        f.klName = name;
        f.arity = arity;
        this.fns[Transpiler.rename(name)] = f;
        return f;
    }

    isSymbolDefined(name) {
        return this.symbols.hasOwnProperty(Transpiler.rename(name));
    }

    set(name, value) {
        return this.symbols[Transpiler.rename(name)] = value;
    }

    value(name) {
        return this.isSymbolDefined(name) ? this.symbols[Transpiler.rename(name)] : err('symbol not defined');
    }

    // static app(f, ...args) {
    //     // Partial application
    //     if (args.length < f.arity) {
    //         const pf = (...moreArgs) => Kl.app(f, args.concat(moreArgs));
    //         pf.arity = f.arity - args.length;
    //         return pf;
    //     }

    //     // Curried application
    //     if (args.length > f.arity) {
    //         return Kl.app(f.apply(args.slice(0, f.length)), args.slice(f.length));
    //     }

    //     // Normal application
    //     return f.apply(null, args);
    // }

    static wrapf(f) {
        const g = function (...args) {
            if (args.length === f.arity) return f.apply(null, args);
            if (args.length < f.arity) {
                const h = Kl.wrapf(function (...args2) { return f.apply(args.concat(args2)); });
                h.arity = f.arity - args.length;
                return h;
            }
            return f.apply(null, args.slice(0, f.arity)).apply(null, args.slice(f.arity));
        };
        g.arity = f.arity;
        return g;
    }
    static headCall(f, args) {
        return Trampoline.runAll(f.apply(null, args));
    }
    static tailCall(f, args) {
        return new Trampoline(f, args);
    }
}

let kl = new Kl();

//
// Set primitive functions and values
//

// TODO: as* calls should be injected selectively at
//       transpile-time using type analysis

kl.set('*language*', 'JavaScript');
kl.set('*implementation*', env.name());
kl.set('*release*', env.version());
kl.set('*os*', env.os());
kl.set('*port*', '0.1');
kl.set('*porters*', 'Robert Koeninger');
kl.defun('if', 3, (c, x, y) => asJsBool(c) ? x : y);
kl.defun('and', 2, (x, y) => asKlBool(asJsBool(x) && asJsBool(y)));
kl.defun('or', 2, (x, y) => asKlBool(asJsBool(x) || asJsBool(y)));
kl.defun('+', 2, (x, y) => asKlNumber(x) + asKlNumber(y));
kl.defun('-', 2, (x, y) => asKlNumber(x) - asKlNumber(y));
kl.defun('*', 2, (x, y) => asKlNumber(x) * asKlNumber(y));
kl.defun('/', 2, (x, y) => asKlNumber(x) / asKlNumber(y));
kl.defun('<', 2, (x, y) => asKlBool(x < y));
kl.defun('>', 2, (x, y) => asKlBool(x > y));
kl.defun('<=', 2, (x, y) => asKlBool(x <= y));
kl.defun('>=', 2, (x, y) => asKlBool(x >= y));
kl.defun('=', 2, (x, y) => asKlBool(eq(x, y)));
kl.defun('number?', 1, x => asKlBool(isNumber(x)));
kl.defun('cons', 2, (x, y) => new Cons(x, y));
kl.defun('cons?', 1, x => asKlBool(isCons(x)));
kl.defun('hd', 1, x => asKlCons(x).hd);
kl.defun('tl', 1, x => asKlCons(x).tl);
kl.defun('set', 2, (sym, x) => kl.set(asKlSymbol(sym).name, asKlValue(x)));
kl.defun('value', 1, sym => kl.value(asKlSymbol(sym).name));
kl.defun('intern', 1, x => new Sym(asKlString(x)));
kl.defun('string?', 1, x => asKlBool(isString(x)));
kl.defun('str', 1, x => toStr(asKlValue(x)));
kl.defun('pos', 2, (s, x) => asKlString(s)[asIndexOf(x, s)]);
kl.defun('tlstr', 1, s => {
    const ss = asKlString(s);
    return ss.length === 0 ? new Sym('shen.eos') : ss.slice(1);
});
kl.defun('cn', 2, (x, y) => asKlString(x) + asKlString(y));
kl.defun('string->n', 1, x => asKlString(x).charCodeAt(0));
kl.defun('n->string', 1, x => String.fromCharCode(asKlString(x)));
kl.defun('absvector', 1, n => new Array(n).fill(null));
kl.defun('<-address', 2, (a, i) => asKlVector(a)[asIndexOf(i, a)]);
kl.defun('address->', 3, (a, i, x) => {
    asKlVector(a)[asIndexOf(i, a)] = asKlValue(x);
    return a;
});
kl.defun('absvector?', 1, a => asKlBool(isArray(a)));
kl.defun('type', 2, (x, _) => x);
kl.defun('eval-kl', 1, x => eval(translate(asKlValue(x))));
kl.defun('simple-error', 1, x => err(asKlString(x)));
kl.defun('error-to-string', 1, x => asKlError(x).message);
kl.defun('get-time', 1, x => {
    if (x.name === 'unix') return new Date().getTime();
    if (x.name === 'run') return new Date().getTime() - kl.startTime;
    err("get-time only accepts 'unix or 'run");
});

// TODO: implement these:
kl.set('*stinput*', ''); // TODO: console
kl.set('*stoutput*', ''); // TODO: console
kl.set('*sterror*', ''); // TODO: console
kl.set('*home-directory*', ''); // TODO: current url
kl.defun('open', 2, (path, d) => err('not implemented'));
kl.defun('close', 1, s => err('not implemented'));
kl.defun('read-byte', 1, s => err('not implemented'));
kl.defun('write-byte', 2, (s, b) => err('not implemented'));
