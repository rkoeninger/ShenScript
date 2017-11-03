
function Context() {
    this.locals = [];
    this.scopeName = null;
    this.position = 'head';

    this.clone = function () {
        const x = new Context();
        x.locals = this.locals.slice(0);
        x.scopeName = this.scopeName;
        x.position = this.position;
        return x;
    };

    this.let = function (name) {
        const context = this.clone();
        context.locals.push(name);
        return context;
    };
    this.lambda = function (name) {
        const context = this.clone();
        context.locals.push(name);
        context.position = 'tail';
        return context;
    };
    this.defun = function (name, params) {
        const context = this.clone();
        context.locals = params.slice(0);
        context.scopeName = name || null;
        context.position = 'tail';
        return context;
    };
    this.inHead = function () {
        const context = this.clone();
        context.position = 'head';
        return context;
    };
    this.inTail = function () {
        const context = this.clone();
        context.position = 'tail';
        return context;
    };
    this.isHead = () => this.position === 'head';
    this.isTail = () => this.position === 'tail';
    this.invoke = () => this.isHead() ? 'Kl.headCall' : 'Kl.tailCall';
}

function nameKlToJs(name) {
    var result = "";
    for (var i = 0; i < name.length; ++i) {
        switch (name[i]) {
            case '-': { result += "_"; break; }
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
var ifExpr = (c, x, y) => `asJsBool(${c})?(${x}):(${y})`;
var concatAll = lists => lists.reduce((x, y) => x.concat(y), []);
var isDoExpr = expr => isCons(expr) && isSymbol(expr.hd) && expr.hd.name === 'do';
var flattenDo = expr => isDoExpr(expr) ? concatAll(consToArray(expr.tl).map(flattenDo)) : [expr];

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
function translate(code, context) {
    if (isArray(code) || isFunction(code) || isError(code) || isStream(code)) {
        err('vectors, functions, errors and streams are not valid syntax');
    }
    if (!context) context = new Context();
    if (code === null) return 'null';
    if (isNumber(code)) return '' + code;
    if (isString(code)) return `"${code}"`;
    if (isSymbol(code)) {
        if (context.locals.includes(code.name)) {
            return nameKlToJs(code.name);
        }
        return `new Sym("${code.name}")`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('and'))) {
        var left = translate(code.tl.hd, context.inHead());
        var right = translate(code.tl.tl.hd, context.inHead());
        return `asKlBool(asJsBool(${left}) && asJsBool(${right}))`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('or'))) {
        var left = translate(code.tl.hd, context.inHead());
        var right = translate(code.tl.tl.hd, context.inHead());
        return `asKlBool(asJsBool(${left}) || asJsBool(${right}))`;
    }

    // Conditional evaluation
    if (consLength(code) === 4 && eq(code.hd, new Sym('if'))) {
        return ifExpr(
            translate(code.tl.hd, context.inHead()),
            translate(code.tl.tl.hd, context),
            translate(code.tl.tl.tl.hd, context));
    }
    if (eq(code.hd, new Sym('cond'))) {
        function condRecur(code) {
            if (code === null) {
                return `kl.fns.${nameKlToJs('simple-error')}("No clause was true")`;
            } else {
                return ifExpr(
                    translate(code.hd.hd, context.inHead()),
                    translate(code.hd.tl.hd, context),
                    condRecur(code.tl));
            }
        }
        return condRecur(code.tl);
    }

    // Local variable binding
    if (consLength(code) === 4 && eq(code.hd, new Sym('let'))) {
        // TODO: flatten immeditaley nested let's into a single iife

        // TODO: actually, since there are no loops, uniquifying local
        //       variable names should be enough to deal with
        //       nested and parallel re-definitions of the same local/parameter

        // TODO: actually, just use let/const

        /*
            (let X 1 (let X 2 (let X 3 X)))

            (function () {
                var X = 1;
                return (function () {
                    var X = 2;
                    return (function () {
                        var X = 3;
                        return X;
                    })();
                })();
            })()

            (function () {
                var X$1, X$2, X$3;
                X$1 = 1;
                X$2 = 2;
                X$3 = 3;
                return X$3;
            })()

            $do = () => arguments.last;

            (function () {
                var X$1, X$2, X$3;
                return $do(X$1 = 1, X$2 = 2, X$3 = 3, X$3);
            })()
         */
        var varName = code.tl.hd.name;
        var value = translate(code.tl.tl.hd, context.inHead());
        var body = translate(code.tl.tl.tl.hd, context.let(varName));
        return `(function () {
                  const ${nameKlToJs(varName)} = ${value};
                  return ${body};
                })()`;
    }

    // Global function definition
    if (consLength(code) === 4 && eq(code.hd, new Sym('defun'))) {
        var defunName = code.tl.hd.name;
        var paramNames = consToArray(code.tl.tl.hd).map((expr) => expr.name);
        var arity = paramNames.length;
        var translatedParams = paramNames.map(nameKlToJs).join();
        var body = translate(code.tl.tl.tl.hd, context.defun(defunName, paramNames));
        return `kl.defun('${defunName}', ${arity}, function (${translatedParams}) {
                  return ${body};
                })`;
    }

    // 1-arg anonymous function
    if (consLength(code) === 3 && eq(code.hd, new Sym('lambda'))) {
        var param = nameKlToJs(code.tl.hd.name);
        var body = translate(code.tl.tl.hd, context.lambda(code.tl.hd.name));
        return `function (${param}) {
                  return ${body};
                }`;
    }

    // 0-arg anonymous function
    if (consLength(code) === 2 && eq(code.hd, new Sym('freeze'))) {
        var body = translate(code.tl.hd, context.inTail());
        return `function () {
                  return ${body};
                }`;
    }

    // Error handling
    if (consLength(code) === 3 && eq(code.hd, new Sym('trap-error'))) {
        var body = translate(code.tl.hd, context);
        var handler = translate(code.tl.tl.hd, context);
        return `(function () {
                  try {
                    return ${body};
                  } catch ($err) {
                    return ${handler}($err);
                  }
                })()`;
    }

    // Flattened, sequential, side-effecting expressions
    if (eq(code.hd, new Sym('do'))) {
        var statements = flattenDo(code).map(expr => translate(expr, context));
        var butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
        var lastStatement = statements[statements.length - 1];
        return `(function () {
                  ${butLastStatements};
                  return ${lastStatement};
                })()`;
    }

    // Inlined global symbol assign
    if (consLength(code) === 3 &&
        eq(code.hd, new Sym('set')) &&
        isSymbol(code.tl.hd) &&
        !context.locals.includes(code.tl.hd.name)) {

        return `kl.symbols.${nameKlToJs(code.tl.hd.name)} = ${translate(code.tl.tl.hd, context.inHead())}`;
    }

    // Inlined global symbol retrieve
    if (consLength(code) === 2 &&
        eq(code.hd, new Sym('value')) &&
        isSymbol(code.tl.hd) &&
        !context.locals.includes(code.tl.hd.name) &&
        kl.isSymbolDefined(code.tl.hd.name)) {

        return `kl.symbols.${nameKlToJs(code.tl.hd.name)}`;
    }

    var translatedArgs = consToArray(code.tl).map((expr) => translate(expr, context.inHead())).join();

    if (isSymbol(code.hd)) {

        // JS-injection form
        if (code.hd.name === 'js.') {
            if (consLength(code.length) === 1) {
                return 'null';
            }
            var statements = consToArray(code.tl);
            var butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
            var lastStatement = statements[statements.length - 1];
            return `(function () {
                      ${butLastStatements};
                      return asKlValue(${lastStatement});
                    })()`;
        }

        // JS-namespace function call
        if (code.hd.name.indexOf('js.') === 0) {
            var name = code.hd.name.slice(3);
            return `${name}(${translatedArgs})`;
        }

        // KL function call
        var name = nameKlToJs(code.hd.name);
        if (context.locals.includes(code.hd.name)) {
            return `${context.invoke()}(${name}, [${translatedArgs}])`;
        } else {
            return `${context.invoke()}(kl.fns.${name}, [${translatedArgs}])`;
        }
    }

    // Application of function value
    var f = translate(code.hd, context);
    return `${context.invoke()}(asKlFunction(${f}), [${translatedArgs}])`;
}
