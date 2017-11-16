if (typeof require !== 'undefined') {
    env = require('./env');
    Transpiler = require('./transpiler');
    const types = require('./types');
    Sym = types.Sym;
    Trampoline = types.Trampoline;
    arrayToCons = types.arrayToCons;
    consolePipe = types.consolePipe;
    openFile = types.openFile;
    isArray = types.isArray;
    isFunction = types.isFunction;
    isPipe = types.isPipe;
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
    toStr = types.toStr;
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

//
// Init KL environment
//

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
    primitve(name, f) {
        this.defun(name, f.length, f);
        f.primitive = true;
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
kl.set('*port*', '0.1.0');
kl.set('*porters*', 'Robert Koeninger');
kl.set('*stinput*', consolePipe);
kl.set('*stoutput*', consolePipe);
kl.set('*sterror*', consolePipe);
kl.set('*home-directory*', ''); // TODO: does this need a value?
kl.primitve('if', (c, x, y) => asJsBool(c) ? x : y);
kl.primitve('and', (x, y) => asKlBool(asJsBool(x) && asJsBool(y)));
kl.primitve('or', (x, y) => asKlBool(asJsBool(x) || asJsBool(y)));
kl.primitve('+', (x, y) => asKlNumber(x) + asKlNumber(y));
kl.primitve('-', (x, y) => asKlNumber(x) - asKlNumber(y));
kl.primitve('*', (x, y) => asKlNumber(x) * asKlNumber(y));
kl.primitve('/', (x, y) => asKlNumber(x) / asKlNumber(y));
kl.primitve('<', (x, y) => asKlBool(x < y));
kl.primitve('>', (x, y) => asKlBool(x > y));
kl.primitve('<=', (x, y) => asKlBool(x <= y));
kl.primitve('>=', (x, y) => asKlBool(x >= y));
kl.primitve('=', (x, y) => asKlBool(eq(x, y)));
kl.primitve('number?', x => asKlBool(isNumber(x)));
kl.primitve('cons', (x, y) => new Cons(x, y));
kl.primitve('cons?', x => asKlBool(isCons(x)));
kl.primitve('hd', x => asKlCons(x).hd);
kl.primitve('tl', x => asKlCons(x).tl);
kl.primitve('set', (sym, x) => kl.set(asKlSymbol(sym).name, asKlValue(x)));
kl.primitve('value', sym => kl.value(asKlSymbol(sym).name));
kl.primitve('intern', x => new Sym(asKlString(x)));
kl.primitve('string?', x => asKlBool(isString(x)));
kl.primitve('str', x => toStr(asKlValue(x)));
kl.primitve('pos', (s, x) => asKlString(s)[asIndexOf(x, s)]);
kl.primitve('tlstr', s => {
    const ss = asKlString(s);
    return ss.length > 0 ? ss.slice(1) : err('tlstr requires non-empty string');
});
kl.primitve('cn', (x, y) => asKlString(x) + asKlString(y));
kl.primitve('string->n', x => asKlString(x).charCodeAt(0));
kl.primitve('n->string', x => String.fromCharCode(asKlNumber(x)));
kl.primitve('absvector', n => new Array(n).fill(null));
kl.primitve('<-address', (a, i) => asKlVector(a)[asIndexOf(i, a)]);
kl.primitve('address->', (a, i, x) => {
    asKlVector(a)[asIndexOf(i, a)] = asKlValue(x);
    return a;
});
kl.primitve('absvector?', a => asKlBool(isArray(a)));
kl.primitve('type', (x, _) => x);
kl.primitve('eval-kl', x => eval(Transpiler.translateHead(asKlValue(x))));
kl.primitve('simple-error', x => err(asKlString(x)));
kl.primitve('error-to-string', x => asKlError(x).message);
kl.primitve('get-time', mode => {
    asKlSymbol(mode);
    if (mode.name === 'unix') return new Date().getTime();
    if (mode.name === 'run') return new Date().getTime() - kl.startTime;
    err("get-time only accepts 'unix or 'run");
});
kl.primitve('open', (path, mode) => {
    asKlString(path);
    asKlSymbol(mode);
    if (mode.name === 'in') return openFile(path, true);
    if (mode.name === 'out') return openFile(path, false);
    err("open only accepts 'in and 'out as stream directions");
});
kl.primitve('close', s => asKlStream(s).close());
kl.primitve('read-byte', s => asKlStream(s).readByte());
kl.primitve('write-byte', (s, b) => asKlStream(s).writeByte(b));

if (typeof document !== 'undefined') {
    setTimeout(function () {
        for (let i = 0; i < document.scripts.length; ++i) {
            const script = document.scripts[i];
            if (script.executed) continue;
            if (script.type.toLowerCase() === 'text/klambda') {
                script.executed = true;
                if (script.text) {
                    Parser.parseAllString(script.text).map(Transpiler.translateHead).map(eval);
                    continue;
                }
                console.warn('text/klambda script tags must have embedded code');
                continue;
            }
            if (script.type.toLowerCase() === 'text/shen') {
                script.executed = true;
                if (script.text) {
                    const parsedShen = Kl.headCall(kl.fns[Transpiler.rename('read-from-string')], [script.text]);
                    const parsedKl = Kl.headCall(kl.fns[Transpiler.rename('shen.elim-def')], [parsedShen]);
                    consToArray(parsedKl).map(Transpiler.translateHead).map(eval);
                    continue;
                }
                console.warn('text/shen script tags must have embedded code');
                continue;
            }
        }
    }, 0);
}

if (typeof module !== 'undefined') {
    module.exports = { Kl, kl };
}

if (typeof window !== 'undefined') {
    window.Kl = Kl;
    window.kl = kl;
}
