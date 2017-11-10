if (typeof require !== 'undefined') {
    env = require('./env');
    Transpiler = require('./transpiler');
    const types = require('./types');
    Sym = types.Sym;
    Trampoline = types.Trampoline;
    arrayToCons = types.arrayToCons;
    isArray = types.isArray;
    isFunction = types.isFunction;
    isStream = types.isStream;
    isString = types.isString;
    isNumber = types.isNumber;
    isCons = types.isCons;
    isSymbol = types.isSymbol;
    isError = types.isError;
    isTrampoline = types.isTrampoline;
    consLength = types.consLength;
    concatAll = types.concatAll;
    butLast = types.butLast;
    consToArray = types.consToArray;
    err = types.err;
    asKlBool = types.asKlBool;
    asKlNumber = types.asKlNumber;
    asKlString = types.asKlString;
    asKlSymbol = types.asKlSymbol;
    asKlVector = types.asKlVector;
    asKlCons = types.asKlCons;
    asKlError = types.asKlError;
    asKlStream = types.asKlStream;
    asKlFunction = types.asKlFunction;
    asIndexOf = types.asIndexOf;
    asKlValue = types.asKlValue;
}

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
    static app(f, args) {
        if (args.length === f.arity) {
            return f.apply(null, args);
        } else if (args.length > f.arity) {
            return Kl.app(f.apply(null, args.slice(0, f.arity)), args.slice(f.arity));
        }
        return Kl.setArity(f.arity - args.length, function (...args2) {
            return Kl.app(f, args.concat(args2));
        });
    }
    static headCall(f, args) {
        return Kl.runAll(Kl.app(f, args));
    }
    static tailCall(f, args) {
        return new Trampoline(f, args);
    }
    static setArity(arity, f) {
        f.arity = arity;
        return f;
    }
    static runAll(t) {
        while (isTrampoline(t)) t = Kl.run(t);
        return t;
    }
    static run(t) {
        return Kl.app(t.f, t.args);
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

if (typeof module !== 'undefined') {
    module.exports = { Kl, kl };
}
