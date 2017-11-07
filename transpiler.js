class Context {
    static fromHead() {
        return new Context().inHead();
    }
    static fromTail() {
        const context = new Context();
        context.position = 'tail';
        return context;
    }
    constructor() {
        this.locals = [];
        this.scopeName = null;
        this.position = 'head';
    }
    clone() {
        const context = new Context();
        context.locals = this.locals.slice(0);
        context.scopeName = this.scopeName;
        context.position = this.position;
        return context;
    }
    isLocal(name) {
        return this.locals.includes(name);
    }
    let(name) {
        const context = this.clone();
        context.locals.push(name);
        return context;
    }
    lambda(name) {
        const context = this.clone();
        context.locals.push(name);
        context.position = 'tail';
        return context;
    }
    freeze() {
        const context = this.clone();
        context.position = 'tail';
        return context;
    }
    defun(name, params) {
        const context = this.clone();
        context.locals = params.slice(0);
        context.scopeName = name || null;
        context.position = 'tail';
        return context;
    }
    inHead() {
        const context = this.clone();
        context.position = 'head';
        return context;
    }
    invoke(f, args) {
        return `${this.position === 'head' ? 'Kl.headCall' : 'Kl.tailCall'}(${f}, [${args}])`;
    }
}

class Transpiler {
    static translateHead(expr) {
        return new Transpiler().translate(expr, Context.fromHead());
    }
    static translateTail(expr) {
        return new Transpiler().translate(expr, Context.fromTail());
    }
    contructor(context) {
        this.context = context;
    }
    static rename(name) {
        let result = "";
        for (let i = 0; i < name.length; ++i) {
            switch (name[i]) {
                case '-': { result += '_'; break; }
                case '_': { result += '$un'; break; }
                case '$': { result += '$dl'; break; }
                case '.': { result += '$do'; break; }
                case '+': { result += "$pl"; break; }
                case '*': { result += "$st"; break; }
                case '/': { result += "$sl"; break; }
                case '<': { result += "$lt"; break; }
                case '>': { result += "$gt"; break; }
                case '%': { result += "$pe"; break; }
                case '&': { result += "$am"; break; }
                case '^': { result += "$ca"; break; }
                case '=': { result += "$eq"; break; }
                case '!': { result += "$ex"; break; }
                case '?': { result += "$qu"; break; }
                default:  { result += name[i]; break; }
            }
        }
        return result;
    }
    static isForm(expr, keyword, length) {
        return isCons(expr) && (!length || consLength(expr) === length) && isSymbol(expr.hd) && expr.hd.name === keyword;
    }
    static ifExpr(c, x, y) {
        return `asJsBool(${c})?(${x}):(${y})`;
    }

    // TODO: track expression types to simplify code

    // TODO: use fn.length to do partial application/overapplication

    // TODO: convert Statements -> ExpressionContext with
    //       `function(){ ${butLastStmts.join(';')}; return ${lastStmt}; }()`

    // TODO: convert Expression -> StatementContext with
    //       `(${expr});`

    // function convertType(typedExpr, targetType) {
    //     if (typedExpr.type === 'js.bool' && targetType === 'kl.bool') return {expr: `asKlBool(${typedExpr})`, type: targetType};
    //     if (typedExpr.type === 'kl.bool' && targetType === 'js.bool') return {expr: `asJsBool(${typedExpr})`, type: targetType};
    //     return expr;
    // }

    // Value{Num, Str, Sym, Cons} -> JsString
    translate(code, context) {
        if (isArray(code) || isFunction(code) || isError(code) || isStream(code)) {
            err('vectors, functions, errors and streams are not valid syntax');
        }

        if (!context) context = this.context;

        // Literals
        if (code === null) return 'null';
        if (isNumber(code)) return '' + code;
        if (isString(code)) return `"${code}"`;

        // Local variables and idle symbols
        if (isSymbol(code)) {
            if (context.isLocal(code.name)) {
                return Transpiler.rename(code.name);
            }
            return `new Sym("${code.name}")`;
        }

        // Conjunction and disjunction
        if (Transpiler.isForm(code, 'and', 3)) {
            const left = this.translate(code.tl.hd, context.inHead());
            const right = this.translate(code.tl.tl.hd, context.inHead());
            return `asKlBool(asJsBool(${left}) && asJsBool(${right}))`;
        }
        if (Transpiler.isForm(code, 'or', 3)) {
            const left = this.translate(code.tl.hd, context.inHead());
            const right = this.translate(code.tl.tl.hd, context.inHead());
            return `asKlBool(asJsBool(${left}) || asJsBool(${right}))`;
        }

        // Conditional evaluation
        if (Transpiler.isForm(code, 'if', 4)) {
            return Transpiler.ifExpr(
                this.translate(code.tl.hd, context.inHead()),
                this.translate(code.tl.tl.hd, context),
                this.translate(code.tl.tl.tl.hd, context));
        }
        if (Transpiler.isForm(code, 'cond')) {
            function condRecur(code) {
                if (code === null) {
                    return `kl.fns.${Transpiler.rename('simple-error')}("No clause was true")`;
                } else {
                    return Transpiler.ifExpr(
                        this.translate(code.hd.hd, context.inHead()),
                        this.translate(code.hd.tl.hd, context),
                        condRecur(code.tl));
                }
            }
            return condRecur(code.tl);
        }

        // Local variable binding
        if (Transpiler.isForm(code, 'let', 4)) {
            const bindings = [];

            while (Transpiler.isForm(code, 'let', 4)) {
                const name = code.tl.hd.name;
                bindings.push({
                    name,
                    value: this.translate(code.tl.tl.hd, context),
                    redefinition: bindings.some(x => x.name === name)
                });
                context = context.let(name);
                code = code.tl.tl.tl.hd;
            }

            let body = `return ${this.translate(code, context)};`;

            for (let i = bindings.length - 1; i >= 0; --i) {
                body = `const ${Transpiler.rename(bindings[i].name)} = ${bindings[i].value};
                        ${body}`;
                if (bindings[i].redefinition) {
                    body = `{
                        ${body}
                    }`;
                }
            }

            return `(function () {
                      ${body}
                    })()`;
        }

        // Global function definition
        if (Transpiler.isForm(code, 'defun', 4)) {
            const defunName = code.tl.hd.name;
            const paramNames = consToArray(code.tl.tl.hd).map(expr => expr.name);
            const arity = paramNames.length;
            const translatedParams = paramNames.map(Transpiler.rename).join();
            const body = this.translate(code.tl.tl.tl.hd, context.defun(defunName, paramNames));
            return `kl.defun('${defunName}', ${arity}, function (${translatedParams}) {
                      return ${body};
                    })`;
        }

        // 1-arg anonymous function
        if (Transpiler.isForm(code, 'lambda', 3)) {
            const param = Transpiler.rename(code.tl.hd.name);
            const body = this.translate(code.tl.tl.hd, context.lambda(code.tl.hd.name));
            return `Kl.setArity(1, function (${param}) {
                      return ${body};
                    })`;
        }

        // 0-arg anonymous function
        if (Transpiler.isForm(code, 'freeze', 2)) {
            const body = this.translate(code.tl.hd, context.freeze());
            return `Kl.setArity(0, function () {
                      return ${body};
                    })`;
        }

        // Error handling
        if (Transpiler.isForm(code, 'trap-error', 3)) {
            const body = this.translate(code.tl.hd, context);
            const handler = this.translate(code.tl.tl.hd, context);
            return `(function () {
                      try {
                        return ${body};
                      } catch ($err) {
                        return ${handler}($err);
                      }
                    })()`;
        }

        // Flattened, sequential, side-effecting expressions
        if (Transpiler.isForm(code, 'do')) {
            function flattenDo(expr) {
                return Transpiler.isForm(expr, 'do') ? concatAll(consToArray(expr.tl).map(flattenDo)) : [expr];
            }

            const statements = flattenDo(code).map(expr => this.translate(expr, context));
            const butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
            const lastStatement = statements[statements.length - 1];
            return `(function () {
                      ${butLastStatements};
                      return ${lastStatement};
                    })()`;
        }

        // Inlined global symbol assign
        if (Transpiler.isForm(code, 'set', 3) && !context.isLocal(code.tl.hd.name)) {
            const [, sym, value] = consToArray(code);
            return `kl.symbols.${Transpiler.rename(sym.name)} = ${this.translate(value, context.inHead())}`;
        }

        // Inlined global symbol retrieve
        if (Transpiler.isForm(code, 'value', 2) && !context.isLocal(code.tl.hd.name) && kl.isSymbolDefined(code.tl.hd.name)) {
            const [, sym] = consToArray(code);
            return `kl.symbols.${Transpiler.rename(sym.name)}`;
        }

        const fexpr = code.hd;
        const translatedArgs = consToArray(code.tl).map(expr => this.translate(expr, context.inHead())).join();

        if (isSymbol(fexpr)) {

            // JS-injection form
            if (fexpr.name === 'js.') {
                if (consLength(code.length) === 1) {
                    return 'null';
                }
                const statements = consToArray(code.tl);
                const butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
                const lastStatement = statements[statements.length - 1];
                return `(function () {
                          ${butLastStatements};
                          return asKlValue(${lastStatement});
                        })()`;
            }

            // JS-namespace function call
            if (fexpr.name.indexOf('js.') === 0) {
                const name = fexpr.name.slice(3);
                return `${name}(${translatedArgs})`;
            }

            // KL function call
            const name = Transpiler.rename(fexpr.name);
            if (context.isLocal(fexpr.name)) {
                return context.invoke(name, translatedArgs);
            } else {
                return context.invoke(`kl.fns.${name}`, translatedArgs);
            }
        }

        // Application of function value
        const f = this.translate(fexpr, context.inHead());
        return context.invoke(`asKlFunction(${f})`, translatedArgs);
    }
}
