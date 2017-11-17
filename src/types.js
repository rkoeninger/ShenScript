'use strict';

/* Type mapping:
 *
 * KL Type            JS Type
 * -------            -------
 * Empty              null
 * Number             number
 * String             string
 * Function           function
 * AbsVector          array
 * Error              Error
 * Symbol             Sym
 * Cons               Cons
 * Stream             Pipe
 */

class Trampoline {
    constructor(f, args) {
        this.f = f;
        this.args = args;
    }
}
class Sym {
    constructor(name) {
        this.name = name;
    }
    toString() {
        return this.name;
    }
}
class Cons {
    constructor(hd, tl) {
        this.hd = hd;
        this.tl = tl;
    }
}
class Pipe {
    constructor(name) {
        this.name = name;
    }
}
let err = x => { throw new Error(x); };
let consolePipe = new Pipe('console');
consolePipe.buffer = [];
consolePipe.close = () => err('console stream cannot be closed');
consolePipe.readByte = () => consolePipe.buffer.shift();
consolePipe.writeByte = b => {
    consolePipe.buffer.push(b);
    return b;
};
function openFile(path, isIn) {
    let pipe = new Pipe(path);
    pipe.open = true;
    pipe.close = () => {
        pipe.open = false;
        return null;
    };
    if (isIn) {
        pipe.readByte = () => {
            if (!pipe.open) err('cannot read from closed stream');
            return err('file read not implemented'); // TODO: implement
        };
        pipe.writeByte = b => {
            return err('cannot write to input streams');
        };
    } else {
        pipe.readByte = () => {
            return err('cannot read from output streams');
        };
        pipe.writeByte = b => {
            if (!pipe.open) err('cannot write to closed stream');
            return err('file write not implemented'); // TODO: implement
        };
    }
}
let klTrue  = new Sym('true');
let klFalse = new Sym('false');
let isTrampoline = x => x && x.constructor === Trampoline;
let isSymbol     = x => x && x.constructor === Sym;
let isCons       = x => x && x.constructor === Cons;
let isArray      = x => x && x.constructor === Array;
let isError      = x => x && x.constructor === Error;
let isPipe       = x => x && x.constructor === Pipe;
let isNumber     = x => typeof x === 'number';
let isString     = x => typeof x === 'string';
let isFunction   = x => typeof x === 'function';
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
    if (isPipe(x)) return `<Stream ${x.name}>`;
    return '' + x;
}
function asJsBool(x) {
    if (isSymbol(x)) {
        if (x.name === 'true') return true;
        if (x.name === 'false') return false;
    }
    err('not a boolean');
}
let asKlBool = x => x ? klTrue : klFalse;
let asKlNumber = x => isNumber(x) ? x : err('not a number');
let asKlString = x => isString(x) ? x : err('not a string');
let asKlSymbol = x => isSymbol(x) ? x : err('not a symbol');
let asKlVector = x => isArray(x) ? x : err('not an absvector');
let asKlCons = x => isCons(x) ? x : err('not a cons');
let asKlError = x => isError(x) ? x : err('not an error');
let asKlStream = x => isPipe(x) ? x : err('not a stream');
let asKlFunction = x => isFunction(x) ? x : err('not a function');
function asIndexOf(i, a) {
    if (!isNumber(i)) err('not a valid index: ' + i);
    if (i % 1 !== 0) err('not an integer: ' + i);
    if (i < 0 || i >= a.length) err('not in bounds: ' + i);
    return i;
}
function asKlValue(x) {
    if (x === true) return klTrue;
    if (x === false) return klFalse;
    if (isString(x) || isNumber(x) || isSymbol(x) || isCons(x) || isArray(x) || isPipe(x) || isFunction(x)) return x;
    return null; // TODO: No other values admissible to KL?
}
function arrayToCons(x) {
    let result = null;
    for (let i = x.length - 1; i >= 0; i--) result = new Cons(x[i], result);
    return result;
}
function consToArray(x) {
    const array = [];
    while (isCons(x)) {
        array.push(x.hd);
        x = x.tl;
    }
    if (x !== null) err('not a valid list');
    return array;
}
function consLength(x) {
    let length = 0;
    while (isCons(x)) {
        x = x.tl;
        length++;
    }
    if (x !== null) err('not a valid list');
    return length;
}
function concatAll(lists) {
    return lists.reduce((x, y) => x.concat(y), []);
}
function butLast(list) {
    return [list.slice(0, list.length - 1), list[list.length - 1]];
}

if (typeof module !== 'undefined') {
    module.exports = {
        Sym,
        Cons,
        Trampoline,
        Pipe,
        klTrue,
        klFalse,
        eq,
        toStr,
        arrayToCons,
        consLength,
        concatAll,
        butLast,
        consToArray,
        consolePipe,
        openFile,
        isArray,
        isNumber,
        isCons,
        isFunction,
        isSymbol,
        isString,
        isError,
        isPipe,
        isTrampoline,
        err,
        asKlBool,
        asKlNumber,
        asKlString,
        asKlSymbol,
        asKlVector,
        asKlCons,
        asKlError,
        asKlStream,
        asKlFunction,
        asIndexOf,
        asKlValue,
        asJsBool
    };
}

if (typeof window !== 'undefined') {
    window.klTrue = klTrue;
    window.klFalse = klFalse;
}

if (typeof global !== 'undefined') {
    global.klTrue = klTrue;
    global.klFalse = klFalse;
}
