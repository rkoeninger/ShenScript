function getOperatingSystem() {
    if (navigator) {
        if (navigator.platform.toLowerCase() === 'win32') return "Windows";
        if (navigator.appVersion.indexOf("Win") != -1) return "Windows";
        if (navigator.appVersion.indexOf("Mac") != -1) return "macOS";
        if (navigator.appVersion.indexOf("X11") != -1) return "Unix";
        if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
    }
    if (process) {
        if (process.platform === 'win32') return 'Windows';
        if (process.platform === 'darwin') return 'macOS';
        if (process.platform === 'linux') return 'Linux';
    }
    return "Unknown";
}
function skipWhitespace(state) {
    while (!isDone(state) && /\s/.test(current(state))) {
        skip(state);
    }
}
function current(state) { return state.text[state.pos]; }
function isDone(state) { return state.pos >= state.text.length; }
function skip(state) { state.pos++; }
function isDigitOrSign(ch) {
    return /[\d]/.test(ch);
}
function isSymbolChar(ch) {
    return /\S/.test(ch) && ch !== '(' && ch !== ')';
}
function readString(state) {
    skip(state);
    var start = state.pos;
    while (current(state) !== '"') {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    skip(state);
    return state.text.substring(start, end);
}
function readNumber(state) {
    var start = state.pos;
    while (isDigitOrSign(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    return parseFloat(state.text.substring(start, end));
}
function readSymbol(state) {
    var start = state.pos;
    while (isSymbolChar(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    return new Sym(state.text.substring(start, end));
}
function parse(state) {
    skipWhitespace(state);
    if (isDone(state)) {
        throw new Error('unexpected end of input');
    }
    if (current(state) === '(') {
        var children = [];
        skip(state);
        var child = parse(state);
        while (child !== undefined) {
            children.push(child);
            child = parse(state);
        }
        return children;
    }
    if (current(state) === ')') {
        skip(state);
        return undefined;
    }
    if (current(state) === '"') {
        return readString(state);
    }
    if (isDigitOrSign(current(state))) {
        return readNumber(state);
    }
    return readSymbol(state);
}
function State(text) {
    this.text = text;
    this.pos = 0;
}
function Sym(name) {
    this.name = name;
}
function Cons(hd, tl) {
    this.hd = hd;
    this.tl = tl;
}
function isSymbol(x) { return x instanceof Sym; }
function isCons(x) { return x instanceof Cons; }
function isNumber(x) { return typeof x == 'number'; }
function isString(x) { return typeof x == 'string'; }
function eq(x, y) {
    if (isSymbol(x) && isSymbol(y)) {
        return x.name === y.name;
    }
    if (isNumber(x) && isNumber(y)) {
        return x === y;
    }
    if (isString(x) && isString(y)) {
        return x === y;
    }
    return false;
}
function asJsBool(x) {
    if (isSymbol(x)) {
        if (x.name === 'true') return true;
        if (x.name === 'false') return false;
    }
    throw new Error("not a boolean");
}
function asKlBool(x) {
    return x ? new Sym('true') : new Sym('false');
}
function asKlValue(x) {
    if (x === true) return new Sym('true');
    if (x === false) return new Sym('false');
    if (isString(x) || isNumber(x) || isSymbol(x) || isCons(x)) return x;
    return x || null;
}
function pushLocal(name, locals) {
    return locals.slice(0).push(name);
}
function nameKlToJs(name) {
    var result = "";
    for (var i = 0; i < name.length; ++i) {
        switch (name[i]) {
            case '$': { result += '$do'; break; }
            case '+': { result += "$pl"; break; }
            case '-': { result += "$mi"; break; }
            case '*': { result += "$st"; break; }
            case '/': { result += "$sl"; break; }
            case '<': { result += "$lt"; break; }
            case '>': { result += "$gt"; break; }
            case '=': { result += "$eq"; break; }
            case '?': { result += "$qu"; break; }
            default:  { result += name[i]; break; }
        }
    }
    return result;
}
function nameJsToKl(name) {
    var result = "";
    for (var i = 0; i < name.length;) {
        switch (name.slice(i, i + 3)) {
            case '$do': { result += '$'; i += 3; break; }
            case '$pl': { result += '+'; i += 3; break; }
            case '$mi': { result += '-'; i += 3; break; }
            case '$st': { result += '*'; i += 3; break; }
            case '$sl': { result += '/'; i += 3; break; }
            case '$lt': { result += '<'; i += 3; break; }
            case '$gt': { result += '>'; i += 3; break; }
            case '$eq': { result += '='; i += 3; break; }
            case '$qu': { result += '?'; i += 3; break; }
            default:  { result += name[i]; i++; break; }
        }
    }
    return result;
}

// TODO: include current function name in context object

function translate(code, locals) {
    if (!locals) locals = [];
    if (isNumber(code)) {
        return '' + code;
    }
    if (isString(code)) {
        return '"' + code + '"';
    }
    if (isSymbol(code)) {
        if (locals.includes(code.name)) {
            return nameKlToJs(code.name);
        }
        return '(new Sym("' + code.name + '"))';
    }
    if (code.length == 0) {
        return null;
    }
    if (code.length == 3 && eq(code[0], new Sym('and'))) {
        return 'asKlBool(asJsBool(' + translate(code[1], locals) + ') && asJsBool(' + translate(code[2], locals) + '))';
    }
    if (code.length == 3 && eq(code[0], new Sym('or'))) {
        return 'asKlBool(asJsBool(' + translate(code[1], locals) + ') || asJsBool(' + translate(code[2], locals) + '))';
    }
    if (eq(code[0], new Sym('cond'))) {
        function condRecur(i) {
            if (i < code.length) {
                var condition = code[i][0];
                var consequent = code[i][1];
                return '(asJsBool(' + translate(condition, locals) + ')?(' + translate(consequent, locals) + '):(' + condRecur(i + 1) + '))'
            } else {
                return 'kl.fns.' + nameKlToJs('simple-error') + '("No clause was true")';
            }
        }
        return condRecur(1);
    }
    if (code.length == 4 && eq(code[0], new Sym('if'))) {
        return '(asJsBool(' + translate(code[1], locals) + ')?(' + translate(code[2], locals) + '):(' + translate(code[3], locals) + '))';
    }
    if (code.length == 4 && eq(code[0], new Sym('let'))) {
        // TODO: scoping on let bindings
        //nameKlToJs(code[1].name)
    }
    if (code.length == 4 && eq(code[0], new Sym('defun'))) {
        var paramNames = code[2].map(function (expr) { return expr.name; });
        return '(kl.fns.' + nameKlToJs(code[1].name) + '=function(' + paramNames.join() + '){return(' + translate(code[3], paramNames) + ');})'
    }
    if (code.length == 3 && eq(code[0], new Sym('lambda'))) {
        return '(function (' + nameKlToJs(code[1].name) + '){return(' + translate(code[2], [code[1].name]) +');})';
    }
    if (code.length == 2 && eq(code[0], new Sym('freeze'))) {
        return '(function (){return(' + translate(code[1]) +');})';
    }
    if (code.length == 3 && eq(code[0], new Sym('trap-error'))) {
        return '(function(){try { return (' + translate(code[1], locals) + '); } catch ($err) { return (' + translate(code[2], locals) + ')($err); }})()';
    }
    var translatedArgs = code.slice(1).map(function (expr) { return translate(expr, locals); }).join();
    if (isSymbol(code[0])) {
        if (code[0].name === 'js.') {
            if (code.length === 1) {
                return 'null';
            }
            return '(function(){' + code.slice(1).map(function (s, i) { return i === code.length - 2 ? 'return asKlValue(' + s + ')' : s; }).join(';') + ';})()';
        }
        if (code[0].name.indexOf('js.') === 0) {
            return code[0].name.slice(3) + '(' + translatedArgs + ')';
        }
        return 'kl.fns.' + nameKlToJs(code[0].name) + '(' + translatedArgs + ')';
    }
    return '(' + translate(code[0], locals) + ')(' + translatedArgs + ')';
}
kl = {
    symbols: {},
    fns: {}
};
kl.symbols[nameKlToJs('*language*')] = 'JavaScript';
kl.symbols[nameKlToJs('*implementation*')] = 'node.js'; // TODO: identify impl
kl.symbols[nameKlToJs('*release*')] = 'v1.2.3'; // TODO: identify ver
kl.symbols[nameKlToJs('*os*')] = getOperatingSystem();
kl.symbols[nameKlToJs('*port*')] = '0.1';
kl.symbols[nameKlToJs('*porters*')] = 'Robert Koeninger';
kl.symbols[nameKlToJs('*stinput*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*stoutput*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*sterror*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*home-directory*')] = ''; // TODO: current url
kl.fns[nameKlToJs('if')] = function (c, x, y) { return c ? x : y; };
kl.fns[nameKlToJs('and')] = function (x, y) { return asKlBool(x && y); };
kl.fns[nameKlToJs('or')] = function (x, y) { return asKlBool(x || y); };
kl.fns[nameKlToJs('+')] = function (x, y) { return x + y; };
kl.fns[nameKlToJs('-')] = function (x, y) { return x - y; };
kl.fns[nameKlToJs('*')] = function (x, y) { return x * y; };
kl.fns[nameKlToJs('/')] = function (x, y) { return x / y; };
kl.fns[nameKlToJs('<')] = function (x, y) { return asKlBool(x < y); };
kl.fns[nameKlToJs('>')] = function (x, y) { return asKlBool(x > y); };
kl.fns[nameKlToJs('<=')] = function (x, y) { return asKlBool(x <= y); };
kl.fns[nameKlToJs('>=')] = function (x, y) { return asKlBool(x >= y); };
kl.fns[nameKlToJs('=')] = function (x, y) { return asKlBool(eq(x, y)); };
kl.fns[nameKlToJs('number?')] = function (x) { return asKlBool(typeof x === 'number'); };
kl.fns[nameKlToJs('cons')] = function (x, y) { return new Cons(x, y); };
kl.fns[nameKlToJs('cons?')] = function (x) { return asKlBool(isCons(x)); };
kl.fns[nameKlToJs('hd')] = function (x) { return x.hd; };
kl.fns[nameKlToJs('tl')] = function (x) { return x.tl; };
kl.fns[nameKlToJs('set')] = function (sym, x) { return kl.symbols[sym.name] = x; };
kl.fns[nameKlToJs('value')] = function (sym) { return kl.symbols[sym.name]; };
kl.fns[nameKlToJs('intern')] = function (x) { return new Sym(x); };
kl.fns[nameKlToJs('string?')] = function (x) { return asKlBool(typeof x === 'string'); };
kl.fns[nameKlToJs('str')] = function (x) { return "" + x; };
kl.fns[nameKlToJs('pos')] = function (s, x) { return s[x]; };
kl.fns[nameKlToJs('tlstr')] = function (s) { return s.slice(1); };
kl.fns[nameKlToJs('cn')] = function (x, y) { return "" + x + y; };
kl.fns[nameKlToJs('string->n')] = function (x) { return x.charCodeAt(0); };
kl.fns[nameKlToJs('n->string')] = function (x) { return String.fromCharCode(x); };
kl.fns[nameKlToJs('absvector')] = function (n) { var a = []; a.length = x; return a; };
kl.fns[nameKlToJs('<-address')] = function (a, i) { return a[i]; };
kl.fns[nameKlToJs('address->')] = function (a, i, x) { a[i] = x; return a; };
kl.fns[nameKlToJs('absvector?')] = function (a) { return asKlBool(a.constructor === Array); };
kl.fns[nameKlToJs('type')] = function (x, t) { return x; };
kl.fns[nameKlToJs('eval-kl')] = function (x) { return eval(translate(x)); };
kl.fns[nameKlToJs('simple-error')] = function (x) { throw new Error(x); };
kl.fns[nameKlToJs('error-to-string')] = function (x) { return x.message; };
// TODO: get-time
// TODO: open
// TODO: close
// TODO: read-byte
// TODO: write-byte

// TODO: kl name and inline template can be set as properties on function objects
