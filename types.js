
/* Type mapping:
 *
 * KL Type            JS Type
 * -------            -------
 * Empty              null
 * Number             number
 * String             string
 * Function           function
 * AbsVector          array
 * Symbol             Sym
 * Cons               Cons
 * Stream             Stream
 */

class Thunk {
    constructor(f, args) {
        this.f = f;
        this.args = args;
    }

    run() {
        return this.f.apply(null, this.args);
    }
}
class Sym {
    constructor(name) {
        this.name = name;
    }
}
class Cons {
    constructor(hd, tl) {
        this.hd = hd;
        this.tl = tl;
    }
}
class Stream {
    constructor(name) {
        this.name = name;
    }
}
let consoleStream = new Stream('console');
let isThunk    = x => x && x.constructor === Thunk;
let isSymbol   = x => x && x.constructor === Sym;
let isCons     = x => x && x.constructor === Cons;
let isArray    = x => x && x.constructor === Array;
let isError    = x => x && x.constructor === Error;
let isStream   = x => x && x.constructor === Stream;
let isNumber   = x => typeof x === 'number';
let isString   = x => typeof x === 'string';
let isFunction = x => typeof x === 'function';
function eq(x, y) {
    if (x === y) return true;
    if (isSymbol(x) && isSymbol(y)) return x.name === y.name;
    if (isCons(x) && isCons(y)) return eq(x.hd, y.hd) && eq(x.tl, y.tl);
    if (isArray(x) && isArray(y)) {
        if (x.length !== y.length) return false;
        for (var i = 0; i < x.length; ++i) {
            if (!eq(x[i], y[i])) return false;
        }
        return true;
    }
    return false;
}
function toStr(x) {
    if (x === null) return '[]';
    if (isSymbol(x)) return x.name;
    if (isString(x)) return `"${x}"`;
    if (isCons(x)) return `[${consToArray(x).map(toStr).join(' ')}]`;
    if (isFunction(x)) return `<Function ${x.name}>`;
    if (isArray(x)) return `<Vector ${x.length}>`;
    if (isError(x)) return `<Error "${x.message}">`;
    if (isStream(x)) return `<Stream ${x.name}>`;
    return '' + x;
}
function asJsBool(x) {
    if (isSymbol(x)) {
        if (x.name === 'true') return true;
        if (x.name === 'false') return false;
    }
    throw new Error('not a boolean');
}
let err = x => { throw new Error(x); };
let asKlBool = x => new Sym(x ? 'true' : 'false');
let asKlNumber = x => isNumber(x) ? x : err('not a number');
let asKlString = x => isString(x) ? x : err('not a string');
let asKlSymbol = x => isSymbol(x) ? x : err('not a symbol');
let asKlVector = x => isArray(x) ? x : err('not an absvector');
let asKlCons = x => isCons(x) ? x : err('not a cons');
let asKlError = x => isError(x) ? x : err('not an error');
let asKlStream = x => isStream(x) ? x : err('not a stream');
let asKlFunction = x => isFunction(x) ? x : err('not a function');
function asIndexOf(i, a) {
    if (isNumber(i)) {
        if (i % 1 === 0) {
            if (i >= 0 && i < a.length) {
                return i;
            }
            throw new Error('not in bounds: ' + i);
        }
        throw new Error('not an integer: ' + i);
    }
    throw new Error('not a valid index: ' + i);
}
function asKlValue(x) {
    if (x === true) return new Sym('true');
    if (x === false) return new Sym('false');
    if (isString(x) || isNumber(x) || isSymbol(x) || isCons(x)) return x;
    return x || null;
}