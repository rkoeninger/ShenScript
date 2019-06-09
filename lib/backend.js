const {
  adorn, ann, generate,
  Arrow, Assign, Binary, Block, Call, Catch, Conditional, Const, Identifier, If, Iife,
  Let, Literal, Member, RawIdentifier, Return, Sequence, Statement, Try, Unary, Vector
} = require('./ast');
const { AsyncFunction, butLast, last, flatMap, produce, produceState, raise, s } = require('./utils');

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
    Object.freeze(this);
  }
};

const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
    Object.freeze(this);
  }
  run() { return this.f(...this.args); }
};

const Context = class {
  constructor(options) {
    Object.assign(this, options);
    Object.freeze(this);
  }
  with(options) { return new Context({ ...this, ...options }) }
  now()         { return this.with({ head: true }); }
  later()       { return this.with({ head: false }); }

  // TODO: these won't be necessary for the initial solution?
  evaluated()   { return this.with({ situation: 'evaluated' }); }
  passed()      { return this.with({ situation: 'passed' }); } // might not be necessary/redundant with evaluated
  returned()    { return this.with({ situation: 'returned' }); }
  assigned()    { return this.with({ situation: 'assigned' }); }
  ignored()     { return this.with({ situation: 'ignored' }); }

  clear()       { return this.with({ locals: new Set() }); }
  add(locals)   { return this.with({ locals: new Set([...this.locals, ...locals]) }); }
  has(local)    { return this.locals.has(local); }
};

const Fabrication = class {
  constructor(expression, statements) {
    this.expression = expression;
    this.statements = statements;
    Object.freeze(this);
  }
  anyStatements() { return this.statements.length > 0; }
};

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const shenTrue   = s`true`;
const shenFalse  = s`false`;
const isObject   = x => typeof x === 'object' && x !== null;
const isNumber   = x => typeof x === 'number' && Number.isFinite(x);
const isNzNumber = x => isNumber(x) && x !== 0;
const isString   = x => typeof x === 'string' || x instanceof String;
const isNeString = x => isString(x) && x.length > 0;
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => Array.isArray(x);
const isEArray   = x => isArray(x) && x.length === 0;
const isNeArray  = x => isArray(x) && x.length > 0;
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons;
const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asNzNumber = x => isNzNumber(x) ? x : raise('non-zero number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asNeString = x => isNeString(x) ? x : raise('non-empty string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');
const asFunction = x => isFunction(x) ? x : raise('function expected');
const asArray    = x => isArray(x)    ? x : raise('array expected');
const asCons     = x => isCons(x)     ? x : raise('cons expected');
const asError    = x => isError(x)    ? x : raise('error expected');
const asIndex    = (i, a) =>
  !Number.isInteger(i)   ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with array bounds of [0, ${a.length})`) :
  i;
const asShenBool = x => x ? shenTrue : shenFalse;
const asJsBool   = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise('Shen boolean expected');

const cons               = (h, t) => new Cons(h, t);
const valueFromArray     = x => isArray(x) ? consFromArray(x) : x;
const valueFromArrayTree = x => isArray(x) ? consFromArrayTree(x) : x;
const consFromArray      = (a, z = null) => a.reduceRight((t, h) => cons(h, t), z);
const consFromArrayTree  = a => consFromArray(a.map(valueFromArrayTree));
const consToArray        = c => produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree    = c => consToArray(c).map(valueToArrayTree);
const valueToArray       = x => isCons(x) ? consToArray(x)     : x === null ? [] : x;
const valueToArrayTree   = x => isCons(x) ? consToArrayTree(x) : x === null ? [] : x;

const equateType = (x, y) => x.constructor === y.constructor && equate(Object.keys(x), Object.keys(y));
const equate = (x, y) =>
  x === y
  || isCons(x)   && isCons(y)   && equate(x.head, y.head) && equate(x.tail, y.tail)
  || isArray(x)  && isArray(y)  && x.length === y.length  && x.every((v, i) => equate(v, y[i]))
  || isObject(x) && isObject(y) && equateType(x, y)       && Object.keys(x).every(k => equate(x[k], y[k]));

// TODO: use Function.bind for partial applications
const funSync = (f, arity) =>
  (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funSync((...more) => f(...args, ...more), arity - args.length);
const funAsync = (f, arity) =>
  async (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(await future(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funAsync(async (...more) => f(...args, ...more), arity - args.length);
const fun = (f, arity = f.arity || f.length) =>
  Object.assign((f instanceof AsyncFunction ? funAsync : funSync)(f, arity), { arity });

const bounce = (f, ...args) => new Trampoline(f, args);
const settle = x => {
  while (x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};
const future = async x => {
  while (x = await x, x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};

let counter = 0;
const tempId = () => RawIdentifier(`R${counter++}$`);
const placeholder = () => {
  const id = tempId();
  return [id, x => Statement(Assign(id, x))];
};

const Member$ = name => Member(RawIdentifier('$'), RawIdentifier(name));
const Member$f = name => Member(Member$('f'), Literal(name));
const Call$ = (name, args, async = false) => Call(Member$(name), args, async);
const Call$f = (name, args) => Call(Member$f(name), args);
const cast = (dataType, ast) =>
  ast instanceof Fabrication
    ? fab(cast(dataType, ast.expression), ast.statements)
    : (dataType !== ast.dataType ? Object.assign(Call$('as' + dataType, [ast]), { dataType }) : ast);
// TODO: clean this up
const uncast = ast =>
  ast instanceof Fabrication
    ? fab(uncast(ast.expression), ast.statements)
    : (ast.dataType === 'JsBool' ? cast('ShenBool', ast) : ast);
const isForm = (expr, lead, length) => isNeArray(expr) && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isInline = (context, expr) => isNeArray(expr) && isSymbol(expr[0]) && context.primitives.hasOwnProperty(nameOf(expr[0])) && context.primitives[nameOf(expr[0])].length === expr.length - 1;
const idle = id => ann('Symbol', adorn(Member$('s'), nameOf(id)));
const fab = (expression, statements = []) => new Fabrication(expression, statements);
const assemble = (combine, ...fabs) => fab(combine(...fabs.map(x => x.expression)), flatMap(fabs, x => x.statements));
const complete = (context, ast) => Call$(context.async ? 'u' : 't', [ast], context.async);
const completeOrReturn = (context, ast) => context.head ? complete(context, ast) : ast;
const completeOrBounce = (context, fAst, argsAsts) =>
  context.head ? complete(context, Call(fAst, argsAsts)) : Call$('b', [fAst, ...argsAsts]);
const symbolKey = ast => Call$('nameOf', [cast('Symbol', ast)]); // TODO: no longer optimizes literal symbols
const buildIf = (context, expr) => {
  if (expr[1] === shenTrue) {
    return uncast(build(context, expr[2]));
  }
  const condFab = cast('JsBool', build(context.now(), expr[1]));
  const trueFab = build(context, expr[2]);
  const falseFab = build(context, expr[3]);
  if (trueFab.anyStatements() || falseFab.anyStatements()) {
    const [resultId, output] = placeholder();
    return fab(
      resultId, [
        Let(resultId),
        If(
          condFab.expression,
          trueFab.anyStatements()  ? Block(...trueFab.statements,  output(trueFab.expression))  : output(trueFab.expression),
          falseFab.anyStatements() ? Block(...falseFab.statements, output(falseFab.expression)) : output(falseFab.expression))]);
  }
  return fab(Conditional(condFab.expression, trueFab.expression, falseFab.expression), condFab.statements);
};
const buildCond = (context, expr) =>
  // TODO: does this uncast do anything? should there be uncasts on the branches of if instead?
  uncast(build(context, expr.slice(1).reduceRight(
    (alternate, [test, consequent]) => [s`if`, test, consequent, alternate],
    [s`simple-error`, 'no condition was true'])));
const buildDo = (context, [_do, ...exprs]) => {
  // TODO: flatten do's
  const exprFabs = exprs.map(x => uncast(build(context, x)));
  if (exprFabs.some(x => x.anyStatements())) {
    return fab(
      uncast(last(exprFabs).expression), [
        ...flatMap(butLast(exprFabs), x => [...x.statements, Statement(x.expression)]),
        last(exprFabs).statements]);
  }
  return fab(Sequence(...exprFabs.map(x => x.expression)));
};
const buildLet = (context, [_let, symbol, binding, body]) => {
  const bindingFab = uncast(build(context.now(), binding));
  const bodyFab = uncast(build(context.add([asSymbol(symbol)]), body));
  const symbolId = Identifier(nameOf(symbol));
  const constStmt = Const(symbolId, bindingFab.expression);
  if (context.has(symbol)) {
    const [resultId, output] = placeholder();
    return fab(resultId, [
      Let(resultId),
      Block(...bindingFab.statements, constStmt, ...bodyFab.statements, output(bodyFab.expression))]);
  }
  return fab(bodyFab.expression, [...bindingFab.statements, constStmt, ...bodyFab.statements]);
};
const buildHandler = (context, handler, output) => {
  if (isForm(handler, 'lambda', 3)) {
    const handlerFab = uncast(build(context.add([handler[1]]), handler[2]));
    return Catch(Identifier(nameOf(handler[1])), Block(...handlerFab.statements, output(handlerFab.expression)));
  } else {
    const handlerFab = uncast(build(context, handler));
    const errorId = RawIdentifier('e$');
    return Catch(errorId, Block(...handlerFab.statements, output(Call(handlerFab.expression, [errorId], context.async))));
  }
};
const buildTrap = (context, [_trap, body, handler]) => {
  const [resultId, output] = placeholder();
  const bodyFab = uncast(build(context, body));
  return fab(resultId, [
    Let(resultId),
    Try(
      Block(...bodyFab.statements, output(bodyFab.expression)),
      buildHandler(context, handler, output))]);
};
const buildLambda = (context, params, body) => {
  const bodyFab = uncast(build(context.later().add(params.map(asSymbol)), body));
  return fab(Call$('fun', [Arrow(
    params.map(x => Identifier(nameOf(x))),
    bodyFab.anyStatements() ? Block(...bodyFab.statements, Return(bodyFab.expression)) : bodyFab.expression,
    context.async)]));
};
const buildDefun = (context, [_defun, symbol, params, body]) =>
  // TODO: in ignore situation, the idle symbol and be dropped
  // NOTE: buildLambda should never return a fab with statements,
  //       factor out code to emit JsExpr instead of Fab to another function?
  fab(Sequence(Assign(Member$f(nameOf(symbol)), buildLambda(context.clear(), params, body).expression), idle(symbol)));
const buildCons = (context, expr) => {
  const { result, state } = produceState(x => isForm(x, 'cons', 3), x => x[1], x => x[2], expr);
  return assemble(
    (...xs) => ann('Cons', Call$('consFromArray', [Vector(butLast(xs)), last(xs)])),
    ...[...result, state].map(x => uncast(build(context.now(), x))));
};
const buildSet = (context, [_set, symbol, value]) =>
  assemble(
    (sym, val) => Assign(Member(Member$('symbols'), symbolKey(sym)), val),
    build(context.now(), symbol),
    uncast(build(context.now(), value)));
const buildValue = (context, [_value, symbol]) =>
  assemble(
    sym => Call$('valueOf', [symbolKey(sym)]),
    build(context.now(), symbol));
const buildInline = (context, [fExpr, ...argExprs]) =>
  assemble(
    context.primitives[nameOf(fExpr)],
    ...argExprs.map(x => build(context.now(), x)));
const buildApp = (context, [fExpr, ...argExprs]) =>
  assemble(
    (f, ...args) => completeOrBounce(context, f, args),
    context.has(fExpr) ? fab(Identifier(nameOf(fExpr))) :
    isArray(fExpr)     ? build(context.now(), fExpr) :
    isSymbol(fExpr)    ? fab(Member$f(nameOf(fExpr))) :
    raise('not a valid application form'),
    ...argExprs.map(x => uncast(build(context.now(), x))));
const build = (context, expr) =>
  isNumber(expr) ? fab(ann('Number', Literal(expr))) :
  isString(expr) ? fab(ann('String', Literal(expr))) :
  isEArray(expr) ? fab(ann('Null',   Literal(null))) :
  isSymbol(expr) ? fab(context.has(expr) ? Identifier(nameOf(expr)) : idle(expr)) :
  isForm(expr, 'if', 4)         ? buildIf    (context, expr) :
  isForm(expr, 'cond')          ? buildCond  (context, expr) :
  isForm(expr, 'do', 3)         ? buildDo    (context, expr) :
  isForm(expr, 'let', 4)        ? buildLet   (context, expr) :
  isForm(expr, 'trap-error', 3) ? buildTrap  (context, expr) :
  isForm(expr, 'lambda', 3)     ? buildLambda(context, [expr[1]], expr[2]) :
  isForm(expr, 'freeze', 2)     ? buildLambda(context, [], expr[1]) :
  isForm(expr, 'defun', 4)      ? buildDefun (context, expr) :
  isForm(expr, 'cons', 3)       ? buildCons  (context, expr) :
  isForm(expr, 'set', 3)        ? buildSet   (context, expr) :
  isForm(expr, 'value', 2)      ? buildValue (context, expr) :
  isInline(context, expr)       ? buildInline(context, expr) :
  isArray(expr)                 ? buildApp   (context, expr) :
  raise('not a valid form');

module.exports = (options = {}) => {
  const isInStream  = options.isInStream  || (options.InStream  && (x => x instanceof options.InStream))  || (() => false);
  const isOutStream = options.isOutStream || (options.OutStream && (x => x instanceof options.OutStream)) || (() => false);
  const asInStream  = x => isInStream(x)  ? x : raise('input stream expected');
  const asOutStream = x => isOutStream(x) ? x : raise('output stream expected');
  const isStream = x => isInStream(x) || isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || (() => Date.now() / 1000);
  const startTime = clock();
  const getTime = mode =>
    mode === 'unix' ? clock() :
    mode === 'run'  ? clock() - startTime :
    raise(`get-time only accepts symbols unix or run, not ${mode}`);
  const show = x =>
    x === null    ? '[]' :
    isString(x)   ? `"${x}"` :
    isSymbol(x)   ? nameOf(x) :
    isCons(x)     ? `[${consToArray(x).map(show).join(' ')}]` :
    isFunction(x) ? `<Function ${x}>` :
    isArray(x)    ? `<Vector ${x.length}>` :
    isError(x)    ? `<Error "${x.toString()}">` :
    isStream(x)   ? `<Stream ${x.name}>` :
    `${x}`;
  const out = options.stoutput;
  const symbols = {
    '*language*':       'JavaScript',
    '*implementation*': options.implementation || 'Unknown',
    '*release*':        options.release        || 'Unknown',
    '*os*':             options.os             || 'Unknown',
    '*port*':           options.port           || 'Unknown',
    '*porters*':        options.porters        || 'Unknown',
    '*stinput*':        options.stinput        || (() => raise('standard input not supported')),
    '*stoutput*':       out                    || (() => raise('standard output not supported')),
    '*sterror*':        options.sterror || out || (() => raise('standard output not supported')),
    '*home-directory*': options.homeDirectory  || '',
    'shen-script.*async*':               asShenBool(options.async),
    'shen-script.*instream-supported*':  asShenBool(options.isInStream  || options.InStream),
    'shen-script.*outstream-supported*': asShenBool(options.isOutStream || options.OutStream)
  };
  const atomicTypes = ['Number', 'String', 'Symbol', 'Stream', 'Null'];
  const primitives = {
    '=': (x, y) =>
      atomicTypes.includes(x.dataType) || atomicTypes.includes(y.dataType)
        ? ann('JsBool', Binary('===', ...[x, y].map(uncast)))
        : ann('JsBool', Call$('equate',  [x, y].map(uncast))),
    'not':             x => ann('JsBool', Unary('!', cast('JsBool', x))),
    'and':        (x, y) => ann('JsBool', Binary('&&', cast('JsBool', x), cast('JsBool', y))),
    'or':         (x, y) => ann('JsBool', Binary('||', cast('JsBool', x), cast('JsBool', y))),
    '+':          (x, y) => ann('Number', Binary('+',  cast('Number', x), cast('Number', y))),
    '-':          (x, y) => ann('Number', Binary('-',  cast('Number', x), cast('Number', y))),
    '*':          (x, y) => ann('Number', Binary('*',  cast('Number', x), cast('Number', y))),
    '/':          (x, y) => ann('Number', Binary('/',  cast('Number', x), cast('NzNumber', y))),
    '<':          (x, y) => ann('JsBool', Binary('<',  cast('Number', x), cast('Number', y))),
    '>':          (x, y) => ann('JsBool', Binary('>',  cast('Number', x), cast('Number', y))),
    '<=':         (x, y) => ann('JsBool', Binary('<=', cast('Number', x), cast('Number', y))),
    '>=':         (x, y) => ann('JsBool', Binary('>=', cast('Number', x), cast('Number', y))),
    'cn':         (x, y) => ann('String', Binary('+',  cast('String', x), cast('String', y))),
    'str':             x => ann('String', Call$('show',     [x].map(uncast))),
    'intern':          x => ann('Symbol', Call$('symbolOf', [cast('String', x)])),
    'number?':         x => ann('JsBool', Call$('isNumber', [x].map(uncast))),
    'string?':         x => ann('JsBool', Call$('isString', [x].map(uncast))),
    'cons?':           x => ann('JsBool', Call$('isCons',   [x].map(uncast))),
    'absvector?':      x => ann('JsBool', Call$('isArray',  [x].map(uncast))),
    'cons':       (x, y) => ann('Cons',   Call$('cons',     [x, y].map(uncast))),
    'hd':              x => Member(cast('Cons', x), Identifier('head')),
    'tl':              x => Member(cast('Cons', x), Identifier('tail')),
    'error-to-string': x => ann('String', Member(cast('Error', x), Identifier('message'))),
    'simple-error':    x => Call$('raise', [cast('String', x)]),
    'read-byte':       x => ann('Number', Call$f('read-byte',  [x].map(uncast))),
    'write-byte': (x, y) => ann('Number', Call$f('write-byte', [x, y].map(uncast))),
    'get-time':   (x, y) => ann('Number', Call$f('get-time',   [x, y].map(uncast))),
    'string->n':       x => ann('Number', Call$f('string->n',  [x].map(uncast))),
    'n->string':       x => ann('String', Call$f('n->string',  [x].map(uncast))),
    'tlstr':           x => ann('String', Call$f('tlstr',      [x].map(uncast))),
    'pos':        (x, y) => ann('String', Call$f('pos',        [x, y].map(uncast)))
  };
  const valueOf = x => symbols.hasOwnProperty(x) ? symbols[x] : raise(`global "${x}" is not defined`);
  const openRead  = options.openRead  || (() => raise('open(in) not supported'));
  const openWrite = options.openWrite || (() => raise('open(out) not supported'));
  const open = (path, mode) =>
    mode === 'in'  ? openRead (asString(valueOf('*home-directory*')) + path) :
    mode === 'out' ? openWrite(asString(valueOf('*home-directory*')) + path) :
    raise(`open only accepts symbols in or out, not ${mode}`);
  const functions = {
    'if':        (b, x, y) => asJsBool(b) ? x : y,
    'and':          (x, y) => asShenBool(asJsBool(x) && asJsBool(y)),
    'or':           (x, y) => asShenBool(asJsBool(x) || asJsBool(y)),
    'open':         (p, m) => open(asString(p), nameOf(asSymbol(m))),
    'close':             x => (asStream(x).close(), null),
    'read-byte':         x => asInStream(x).read(),
    'write-byte':   (b, x) => (asOutStream(x).write(asNumber(b)), b),
    'number?':           x => asShenBool(isNumber(x)),
    'string?':           x => asShenBool(isString(x)),
    'absvector?':        x => asShenBool(isArray(x)),
    'cons?':             x => asShenBool(isCons(x)),
    'hd':                c => asCons(c).head,
    'tl':                c => asCons(c).tail,
    'cons':                   cons,
    'tlstr':             x => asNeString(x).substring(1),
    'cn':           (x, y) => asString(x) + asString(y),
    'string->n':         x => asNeString(x).charCodeAt(0),
    'n->string':         n => String.fromCharCode(asNumber(n)),
    'pos':          (x, i) => asString(x)[asIndex(i, x)],
    'str':                    show,
    'absvector':         n => new Array(asNumber(n)).fill(null),
    '<-address':    (a, i) => asArray(a)[asIndex(i, a)],
    'address->': (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a),
    '+':            (x, y) => asNumber(x) + asNumber(y),
    '-':            (x, y) => asNumber(x) - asNumber(y),
    '*':            (x, y) => asNumber(x) * asNumber(y),
    '/':            (x, y) => asNumber(x) / asNzNumber(y),
    '>':            (x, y) => asShenBool(asNumber(x) >  asNumber(y)),
    '<':            (x, y) => asShenBool(asNumber(x) <  asNumber(y)),
    '>=':           (x, y) => asShenBool(asNumber(x) >= asNumber(y)),
    '<=':           (x, y) => asShenBool(asNumber(x) <= asNumber(y)),
    '=':            (x, y) => asShenBool(equate(x, y)),
    'intern':            x => symbolOf(asString(x)),
    'get-time':          x => getTime(nameOf(asSymbol(x))),
    'simple-error':      x => raise(asString(x)),
    'error-to-string':   x => asError(x).message,
    'set':          (x, y) => symbols[nameOf(asSymbol(x))] = y,
    'value':             x => valueOf(nameOf(asSymbol(x))),
    'type':         (x, _) => x
  };
  Object.keys(functions).forEach(name => functions[name] = fun(functions[name]));
  const context = new Context({ async: options.async, head: true, locals: new Set(), primitives });
  // TODO: needs to be in evaluated situation and if it returns prereq statements put in an iife?
  const compile = expr => uncast(build(context, expr));
  const $ = {
    cons, valueFromArray, valueFromArrayTree, consFromArray, consFromArrayTree,
    consToArray, consToArrayTree, valueToArray, valueToArrayTree,
    asJsBool, asShenBool, asNzNumber, asNeString, symbols, primitives, functions,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equate, raise, fun, bounce, settle, future, compile,
    f: functions, s, b: bounce, t: settle, u: future, async: options.async

    // TODO: remove these, they're here for temp debugging
    , build, context, cast, uncast, generate
  };
  const Func = context.async ? AsyncFunction : Function;
  functions['eval-kl'] = fun($.evalKl = expr => {
    const exprFab = compile(valueToArrayTree(expr));
    return Func('$', generate(Block(...exprFab.statements, Return(exprFab.expression))))($);
  });
  return $;
};
