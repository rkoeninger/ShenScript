if (typeof require !== 'undefined') {
    const types = require('./types');
    Sym = types.Sym;
    Cons = types.Cons;
    arrayToCons = types.arrayToCons;
    isArray = types.isArray;
    isFunction = types.isFunction;
    isPipe = types.isPipe;
    isString = types.isString;
    isNumber = types.isNumber;
    isCons = types.isCons;
    isSymbol = types.isSymbol;
    isError = types.isError;
    consLength = types.consLength;
    concatAll = types.concatAll;
    butLast = types.butLast;
    consToArray = types.consToArray;
    elementCount = types.elementCount;
    asJsBool = types.asJsBool;
    eq = types.eq;
}

class Scope {
    static fromHead() {
        return new Scope().inHead();
    }
    static fromTail() {
        const scope = new Scope();
        scope.position = 'tail';
        return scope;
    }
    constructor() {
        this.locals = [];
        this.scopeName = '$_toplevel';
        this.position = 'head';
    }
    clone() {
        const scope = new Scope();
        scope.locals = this.locals.slice(0);
        scope.scopeName = this.scopeName;
        scope.position = this.position;
        return scope;
    }
    isLocal(name) {
        if (isSymbol(name)) name = name.name;
        return this.locals.includes(name);
    }
    let(name) {
        if (isSymbol(name)) name = name.name;
        const scope = this.clone();
        scope.locals.push(name);
        return scope;
    }
    lambda(param) {
        if (isSymbol(param)) param = param.name;
        const scope = this.clone();
        scope.locals.push(param);
        scope.position = 'tail';
        return scope;
    }
    freeze() {
        const scope = this.clone();
        scope.position = 'tail';
        return scope;
    }
    defun(name, params) {
        if (isSymbol(name)) name = name.name;
        const scope = this.clone();
        scope.locals = params.slice(0);
        scope.scopeName = name;
        scope.position = 'tail';
        return scope;
    }
    inHead() {
        const scope = this.clone();
        scope.position = 'head';
        return scope;
    }
    invoke(f, args) {
        return `${this.position === 'head' ? 'Kl.headCall' : 'Kl.tailCall'}(${f}, [${args}])`;
    }
}

class Transpiler {
    static translateHead(expr) {
        return new Transpiler().translate(expr, Scope.fromHead());
    }
    static translateTail(expr) {
        return new Transpiler().translate(expr, Scope.fromTail());
    }
    contructor(scope) {
        this.scope = scope;
    }
    static rename(name) {
        if (isSymbol(name)) name = name.name;
        let result = '';
        for (let i = 0; i < name.length; ++i) {
            switch (name[i]) {
                case '-': { result += '_'; break; }
                case '_': { result += '$un'; break; }
                case '$': { result += '$dl'; break; }
                case '.': { result += '$do'; break; }
                case ',': { result += '$cm'; break; }
                case '`': { result += '$bt'; break; }
                case "'": { result += '$ap'; break; }
                case '+': { result += '$pl'; break; }
                case '*': { result += '$st'; break; }
                case '<': { result += '$lt'; break; }
                case '>': { result += '$gt'; break; }
                case '%': { result += '$pe'; break; }
                case '&': { result += '$am'; break; }
                case '^': { result += '$ca'; break; }
                case '=': { result += '$eq'; break; }
                case '!': { result += '$ex'; break; }
                case '?': { result += '$qu'; break; }
                case '@': { result += '$at'; break; }
                case '~': { result += '$ti'; break; }
                case '#': { result += '$ha'; break; }
                case '|': { result += '$pi'; break; }
                case ':': { result += '$co'; break; }
                case ';': { result += '$sc'; break; }
                case '/': { result += '$sl'; break; }
                case '{': { result += '$lc'; break; }
                case '}': { result += '$rc'; break; }
                case '[': { result += '$ls'; break; }
                case ']': { result += '$rs'; break; }
                case '\\': { result += '$bs'; break; }
                default:  { result += name[i]; break; }
            }
        }
        return result;
    }
    static escape(s) {
        if (isSymbol(s)) s = s.name;
        let result = '';
        for (let i = 0; i < s.length; ++i) {
            switch (s[i]) {
                case '\\': { result += '\\\\'; break; }
                case '\0': { result += '\\0'; break; }
                case '\b': { result += '\\b'; break; }
                case '\f': { result += '\\f'; break; }
                case '\n': { result += '\\n'; break; }
                case '\r': { result += '\\r'; break; }
                case '\t': { result += '\\t'; break; }
                case '\v': { result += '\\v'; break; }
                case '\"': { result += '\\"'; break; }
                case '\'': { result += "\\'"; break; }
                default: { result += s[i]; break; }
            }
        }
        return result;
    }
    static isForm(expr, keyword, length) {
        return isCons(expr) && (!length || consLength(expr) === length) && isSymbol(expr.hd) && expr.hd.name === keyword;
    }
    ifExpr(condition, x, y, scope) {
        if (isSymbol(condition) && condition.name === 'true') return x;
        if (isSymbol(condition) && condition.name === 'false') return y;
        const c = this.translate(condition, scope.inHead());
        return `asJsBool(${c})?(${x}):(${y})`;
    }
    renderLet(bindings, body) {
        if (isCons(bindings)) {
            let renamed = Transpiler.rename(bindings.hd.sym);
            if (bindings.hd.redefCount > 0) renamed += `_${bindings.hd.redefCount}`
            body = `const ${renamed} = ${bindings.hd.value};
                    ${body}`;
            return this.renderLet(bindings.tl, body);
        }
        return `(function () {
                  ${body}
                })()`;
    }
    translateLet(bindings, expr, scope) {
        if (Transpiler.isForm(expr, 'let', 4)) {
            const [_let, local, value, body] = consToArray(expr);
            const binding = {
                sym: local,
                redefCount: elementCount(scope.locals, x => x === local.name),
                value: this.translate(value, scope.inHead())
            };
            return this.translateLet(new Cons(binding, bindings), body, scope.let(local));
        }
        return this.renderLet(bindings, `return ${this.translate(expr, scope)};`);
    }
    condRecur(code, scope) {
        if (code === null) {
            return `kl.fns.${Transpiler.rename('simple-error')}("No clause was true")`;
        } else {
            const [condition, consequent] = consToArray(code.hd);
            return this.ifExpr(
                condition,
                this.translate(consequent, scope),
                this.condRecur(code.tl, scope),
                scope);
        }
    }
    flattenNested(expr, keyword, length) {
        if (Transpiler.isForm(expr, keyword, length)) {
            return concatAll(consToArray(expr.tl).map(x => this.flattenNested(x, keyword, length)));
        }
        return [expr];
    }

    // TODO: track expression types to simplify code
    // function convertType(typedExpr, targetType) {
    //     if (typedExpr.type === 'js.bool' && targetType === 'kl.bool') return {expr: `asKlBool(${typedExpr})`, type: targetType};
    //     if (typedExpr.type === 'kl.bool' && targetType === 'js.bool') return {expr: `asJsBool(${typedExpr})`, type: targetType};
    //     return expr;
    // }

    // TODO: inline template can be set on function object

    // Value of Num | Str | Sym | Cons -> JsString
    translate(code, scope) {
        if (isArray(code) || isFunction(code) || isError(code) || isPipe(code)) {
            err('vectors, functions, errors and streams are not valid syntax');
        }

        if (!scope) scope = this.scope;

        // Literals
        if (code === null) return 'null';
        if (isNumber(code)) return `${code}`;
        if (isString(code)) return `"${Transpiler.escape(code)}"`;

        // Local variables and idle symbols
        if (isSymbol(code)) {
            if (code.name === 'true') return 'klTrue';
            if (code.name === 'false') return 'klFalse';
            if (scope.isLocal(code)) {
                const redefCount = elementCount(scope.locals, x => x === code.name) - 1;
                let renamed = Transpiler.rename(code);
                if (redefCount > 0) renamed += `_${redefCount}`;
                return renamed;
            }
            return `new Sym("${Transpiler.escape(code)}")`;
        }

        // Conjunction and disjunction
        if (Transpiler.isForm(code, 'and', 3)) {
            return `asKlBool(${this.flattenNested(code, 'and', 3).map(x => `asJsBool(${this.translate(x, scope.inHead())})`).join(' && ')})`;
        }
        if (Transpiler.isForm(code, 'or', 3)) {
            return `asKlBool(${this.flattenNested(code, 'or', 3).map(x => `asJsBool(${this.translate(x, scope.inHead())})`).join(' || ')})`;
        }

        // Conditional evaluation
        if (Transpiler.isForm(code, 'if', 4)) {
            const [_if, condition, consequent, alternative] = consToArray(code);
            return this.ifExpr(
                condition,
                this.translate(consequent, scope),
                this.translate(alternative, scope),
                scope);
        }
        if (Transpiler.isForm(code, 'cond')) {
            return this.condRecur(code.tl, scope);
        }

        // Local variable binding
        if (Transpiler.isForm(code, 'let', 4)) {
            return this.translateLet(null, code, scope);
        }

        // Global function definition
        if (Transpiler.isForm(code, 'defun', 4)) {
            const [_defun, name, params, body] = consToArray(code);
            const paramNames = consToArray(params).map(expr => expr.name);
            return `kl.defun("${Transpiler.escape(name)}", ${paramNames.length}, function (${paramNames.map(Transpiler.rename).join(', ')}) {
                      return ${this.translate(body, scope.defun(name, paramNames))};
                    })`;
        }

        // 1-arg anonymous function
        if (Transpiler.isForm(code, 'lambda', 3)) {
            const [_lambda, param, body] = consToArray(code);
            const redefCount = elementCount(scope.locals, x => x === param.name);
            let renamed = Transpiler.rename(param);
            if (redefCount > 0) renamed += `_${redefCount}`;
            return `Kl.setArity("${Transpiler.escape(scope.scopeName)}_lambda", 1, function (${renamed}) {
                      return ${this.translate(body, scope.lambda(param))};
                    })`;
        }

        // 0-arg anonymous function
        if (Transpiler.isForm(code, 'freeze', 2)) {
            const [_freeze, body] = consToArray(code);
            return `Kl.setArity("${Transpiler.escape(scope.scopeName)}_freeze", 0, function () {
                      return ${this.translate(body, scope.freeze())};
                    })`;
        }

        // Error handling
        if (Transpiler.isForm(code, 'trap-error', 3)) {
            const [_trapError, body, handler] = consToArray(code);
            if (Transpiler.isForm(handler, 'lambda', 3)) {
                const [_lambda, handlerParam, handlerBody] = consToArray(handler);
                return `(function () {
                          try {
                            return ${this.translate(body, scope.inHead())};
                          } catch (${Transpiler.rename(handlerParam)}) {
                            return ${this.translate(handlerBody, scope.let(handlerParam))};
                          }
                        })()`;
            }
            return `(function () {
                      try {
                        return ${this.translate(body, scope.inHead())};
                      } catch ($err) {
                        return ${this.translate(handler, scope)}($err);
                      }
                    })()`;
        }

        // Flattened, sequential, side-effecting expressions
        if (Transpiler.isForm(code, 'do')) {
            const [voids, last] = butLast(this.flattenNested(code, 'do', 3));
            const translatedVoids = voids.map(expr => this.translate(expr, scope.inHead())).join(';\n');
            const translatedLast = this.translate(last, scope);
            return `(function () {
                      ${translatedVoids};
                      return ${translatedLast};
                    })()`;
        }

        // Inlined global symbol assign
        if (Transpiler.isForm(code, 'set', 3)) {
            const [_set, sym, value] = consToArray(code);
            if (isSymbol(sym) && !scope.isLocal(sym)) {
                return `kl.symbols.${Transpiler.rename(sym)} = ${this.translate(value, scope.inHead())}`;
            }
        }

        // Inlined global symbol retrieve
        if (Transpiler.isForm(code, 'value', 2)) {
            const [_value, sym] = consToArray(code);
            if (isSymbol(sym) && !scope.isLocal(sym) && kl.isSymbolDefined(sym)) {
                return `kl.symbols.${Transpiler.rename(sym)}`;
            }
        }

        const [fexpr, ...argExprs] = consToArray(code);
        const translatedArgs = argExprs.map(expr => this.translate(expr, scope.inHead())).join(', ');

        if (isSymbol(fexpr)) {

            // JS-injection form
            if (fexpr.name === 'js.') {
                if (consLength(code) === 1) return 'null';
                const [voids, last] = butLast(consToArray(code.tl));
                return `(function () {
                          ${voids.join(';\n')};
                          return asKlValue(${last});
                        })()`;
            }

            // JS-namespace function call
            if (fexpr.name.indexOf('js.') === 0) {
                return `${fexpr.name.slice(3)}(${translatedArgs})`;
            }

            // Application of local variable function
            const name = Transpiler.rename(fexpr);
            if (scope.isLocal(fexpr)) {
                return scope.invoke(name, translatedArgs);
            }

            // Application of primitive
            const klf = kl.fns[name];
            if (klf && klf.primitive) {

                // Full application
                if (klf.arity === argExprs.length) {
                    return `kl.fns.${name}(${translatedArgs})`;
                }

                // Partial application
                return `Kl.app(kl.fns.${name}, [${translatedArgs}])`;
            }

            // Application of any other named function
            return scope.invoke(`kl.fns.${name}`, translatedArgs);
        }

        // Application of function-typed expression
        return scope.invoke(`asKlFunction(${this.translate(fexpr, scope.inHead())})`, translatedArgs);
    }
}

if (typeof module !== 'undefined') {
    module.exports = Transpiler;
}

if (typeof window !== 'undefined') {
    window.Scope = Scope;
    window.Transpiler = Transpiler;
}
