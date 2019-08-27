const {
  Arrow, Assign, Binary, Block, Call, Catch, Conditional, Id, Iife, Literal,
  Member, Return, SafeId, Sequence, Template, Try, Unary, Vector,
  generate
} = require('./ast');
const {
  AsyncFunction,
  butLast, last, produce, produceState, raise, s
} = require('./utils');

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
};

const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
  }
};

const Context = class {
  constructor(options) {
    Object.assign(this, options);
  }
  with(options)  { return new Context({ ...this, ...options }) }
  now()          { return this.with({ head: true }); }
  later()        { return this.with({ head: false }); }
  clear()        { return this.with({ locals: new Map() }); }
  add(...locals) { return this.with({ locals: new Map([...this.locals, ...locals]) }); }
  has(local)     { return this.locals.has(local); }
  get(local)     { return this.locals.get(local); }
  ann(local, dataType) {
    return this.get(local) ?
      this.with({
        locals: new Map([
          ...this.locals,
          [local, { ...(this.get(local) || {}), dataType }]
        ])
      }) :
      this;
  }
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
const isList     = x => x === null || isCons(x);
const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asNzNumber = x => isNzNumber(x) ? x : raise('non-zero number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asNeString = x => isNeString(x) ? x : raise('non-empty string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');
const asFunction = x => isFunction(x) ? x : raise('function expected');
const asArray    = x => isArray(x)    ? x : raise('array expected');
const asCons     = x => isCons(x)     ? x : raise('cons expected');
const asList     = x => isList(x)     ? x : raise('list expected');
const asError    = x => isError(x)    ? x : raise('error expected');
const asIndex    = (i, a) =>
  !Number.isInteger(i)   ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with array bounds of [0, ${a.length})`) :
  i;
const asShenBool = x => x ? shenTrue : shenFalse;
const asJsBool   = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise('Shen boolean expected, not: ' + (isSymbol(x) ? nameOf(x) : x));

const cons        = (h, t) => new Cons(h, t);
const toArray     = x => isList(x) ? produce(isCons, c => c.head, c => c.tail, x) : x;
const toArrayTree = x => isList(x) ? toArray(x).map(toArrayTree) : x;
const toList      = (x, tail = null) => isArray(x) ? x.reduceRight((t, h) => cons(h, t), tail) : x;
const toListTree  = x => isArray(x) ? toList(x.map(toListTree)) : x;

const equateType = (x, y) => x.constructor === y.constructor && equate(Object.keys(x), Object.keys(y));
const equate     = (x, y) =>
  x === y
  || isCons(x)   && isCons(y)   && equate(x.head, y.head) && equate(x.tail, y.tail)
  || isArray(x)  && isArray(y)  && x.length === y.length  && x.every((v, i) => equate(v, y[i]))
  || isObject(x) && isObject(y) && equateType(x, y)       && Object.keys(x).every(k => equate(x[k], y[k]));

const funSync = (f, arity) =>
  (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funSync((...more) => f(...args, ...more), arity - args.length);
const funAsync = (f, arity) =>
  async (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(await future(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funAsync((...more) => f(...args, ...more), arity - args.length); // TODO: does this need to be async?
const fun = (f, arity = f.arity || f.length) =>
  Object.assign((f instanceof AsyncFunction ? funAsync : funSync)(f, arity), { arity, fund: true });

const bounce = (f, ...args) => new Trampoline(f, args);
const settle = x => {
  while (x instanceof Trampoline) {
    x = x.f(...x.args);
  }
  return x;
};
const future = async x => {
  while (x = await x, x instanceof Trampoline) {
    x = x.f(...x.args);
  }
  return x;
};

const Member$ = name => Member(Id('$'), Id(name));
const Member$f = name => Member(Member$('f'), Literal(name));
const Call$ = (name, args, async = false) => Call(Member$(name), args, async);
const Call$f = (name, args, async = false) => Call(Member$f(name), args, async);
const ann = (dataType, ast) => Object.assign(ast, { dataType }); // TODO: could try breaking type analysis into separate file
const cast = (dataType, ast) => dataType !== ast.dataType ? Object.assign(Call$('as' + dataType, [ast]), { dataType }) : ast;
const uncast = ast => ast.dataType === 'JsBool' ? cast('ShenBool', ast) : ast;
const isForm = (expr, lead, length) => isNeArray(expr) && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isInline = (context, expr) =>
  isNeArray(expr) &&
  isSymbol(expr[0]) &&
  context.inlines.hasOwnProperty(nameOf(expr[0])) &&
  context.inlines[nameOf(expr[0])].length === expr.length - 1;
const isPre = (context, expr) =>
  isNeArray(expr) &&
  isSymbol(expr[0]) &&
  context.preprocessors.hasOwnProperty(nameOf(expr[0])) &&
  context.preprocessors[nameOf(expr[0])].length === expr.length - 1;
const variable = (context, symbol) => ann(context.get(symbol).dataType, SafeId(nameOf(symbol)));
const idle = symbol => ann('Symbol', Template(Member$('s'), nameOf(symbol)));
const complete = (context, fAst, argsAsts, async = context.async) =>
  context.head
    ? Call$(async ? 'u' : 't', [Call(fAst, argsAsts)], async)
    : Call$('b', [fAst, ...argsAsts]);
const inlineName = (context, symbol) =>
  isSymbol(symbol) && !context.has(symbol)
    ? Literal(nameOf(symbol))
    : Call$('nameOf', [cast('Symbol', build(context.now(), symbol))]);
const recognisors = {
  'absvector?': 'Array',
  'boolean?':   'ShenBool',
  'cons?':      'Cons',
  'number?':    'Number',
  'string?':    'String',
  'symbol?':    'Symbol'
};
const recognise = (context, expr) =>
  isArray(expr) &&
  expr.length === 2 &&
  isSymbol(expr[0]) &&
  isSymbol(expr[1]) &&
  recognisors.hasOwnProperty(nameOf(expr[0]))
    ? context.ann(expr[1], recognisors[nameOf(expr[0])])
    : context;
// $.asCons($.asCons($.asCons(X).tail).tail).tail
// $.tls(3, X)
const buildAnd = (context, [_and, left, right]) =>
  ann('JsBool', Binary('&&',
    cast('JsBool', build(context.now(), left)),
    cast('JsBool', build(recognise(context.now(), left), right))));
const buildIf = (context, [_if, condition, ifTrue, ifFalse]) =>
  condition === shenTrue
    ? uncast(build(context, ifTrue))
    : Conditional(
        cast('JsBool', build(context.now(), condition)),
        uncast(build(recognise(context, condition), ifTrue)),
        uncast(build(context, ifFalse)));
const buildCond = (context, [_cond, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [s`if`, test, consequent, alternate],
    [s`simple-error`, 'no condition was true']));
const buildDo = (context, [_do, ...exprs]) =>
  Sequence(...butLast(exprs).map(x => build(context.now(), x)), uncast(build(context, last(exprs))));
const buildLet = (context, [_let, symbol, binding, body]) => {
  const bodyAst = uncast(build(context.add([asSymbol(symbol), {}]), body));
  return Call(Arrow([SafeId(nameOf(symbol))], bodyAst, context.async), [build(context.now(), binding)], context.async);
};
const buildLambda = (context, params, body) => {
  const bodyAst = uncast(build(context.later().add(...params.map(x => [asSymbol(x), {}])), body));
  return Call$('l', [Arrow(params.map(x => SafeId(nameOf(x))), bodyAst, context.async)]);
};
const buildTrap = (context, expr) =>
  Iife(
    Block(Try(
      Block(Return(uncast(build(context.now(), expr[1])))),
      Catch(Id('e$'), Block(Return(Call(uncast(build(context, expr[2])), [Id('e$')])))))),
    context.async);
const buildDefun = (context, [_defun, symbol, params, body]) =>
  Call$('d', [inlineName(context, symbol), buildLambda(context.clear(), params, body)]);
const buildCons = (context, expr) => {
  const { result, state } = produceState(x => isForm(x, 'cons', 3), x => x[1], x => x[2], expr);
  const elements = Vector(result.map(x => uncast(build(context.now(), x))));
  return ann('Cons', Call$('r',
    isEArray(state) || state === null
      ? [elements]
      : [elements, uncast(build(context.now(), state))]));
};
const buildSet = (context, [_set, symbol, value]) =>
  Assign(
    Member(Member$('symbols'), inlineName(context, symbol)),
    uncast(build(context.now(), value)));
const buildValue = (context, [_value, symbol]) =>
  Call$('valueOf', [inlineName(context, symbol)]);
const buildInline = (context, [fExpr, ...argExprs]) =>
  context.inlines[nameOf(fExpr)](...argExprs.map(x => build(context.now(), x)));
const buildPre = (context, [fExpr, ...argExprs]) =>
  context.preprocessors[nameOf(fExpr)](...argExprs); // TODO: needs to wrap in Await?
const buildApp = (context, [fExpr, ...argExprs]) =>
  complete(context,
    context.has(fExpr) ? SafeId(nameOf(fExpr)) :
    isArray(fExpr)     ? uncast(build(context.now(), fExpr)) :
    isSymbol(fExpr)    ? Member$f(nameOf(fExpr)) :
    raise('not a valid application form'),
    argExprs.map(x => uncast(build(context.now(), x))),
    context.async);
const build = (context, expr) =>
  isNumber(expr) ? ann('Number', Literal(expr)) :
  isString(expr) ? ann('String', Literal(expr)) :
  isEArray(expr) ? ann('Null',   Literal(null)) :
  isSymbol(expr) ? (context.has(expr) ? variable(context, expr) : idle(expr)) :
  isForm(expr, 'and', 3)        ? buildAnd   (context, expr) :
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
  isPre(context, expr)          ? buildPre   (context, expr) :
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
    isCons(x)     ? `[${toArray(x).map(show).join(' ')}]` :
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
  const inlines = {
    '=': (x, y) =>
      atomicTypes.includes(x.dataType) || atomicTypes.includes(y.dataType)
        ? ann('JsBool', Binary('===', ...[x, y].map(uncast)))
        : ann('JsBool', Call$('equate',  [x, y].map(uncast))),
    'not':               x => ann('JsBool', Unary('!', cast('JsBool', x))),
    'or':           (x, y) => ann('JsBool', Binary('||', cast('JsBool', x), cast('JsBool', y))),
    '+':            (x, y) => ann('Number', Binary('+',  cast('Number', x), cast('Number', y))),
    '-':            (x, y) => ann('Number', Binary('-',  cast('Number', x), cast('Number', y))),
    '*':            (x, y) => ann('Number', Binary('*',  cast('Number', x), cast('Number', y))),
    '/':            (x, y) => ann('Number', Binary('/',  cast('Number', x), cast('NzNumber', y))),
    '<':            (x, y) => ann('JsBool', Binary('<',  cast('Number', x), cast('Number', y))),
    '>':            (x, y) => ann('JsBool', Binary('>',  cast('Number', x), cast('Number', y))),
    '<=':           (x, y) => ann('JsBool', Binary('<=', cast('Number', x), cast('Number', y))),
    '>=':           (x, y) => ann('JsBool', Binary('>=', cast('Number', x), cast('Number', y))),
    'cn':           (x, y) => ann('String', Binary('+',  cast('String', x), cast('String', y))),
    'str':               x => ann('String', Call$('show',     [x].map(uncast))),
    'intern':            x => ann('Symbol', Call$('symbolOf', [cast('String', x)])),
    'number?':           x => ann('JsBool', Call$('isNumber', [x].map(uncast))),
    'string?':           x => ann('JsBool', Call$('isString', [x].map(uncast))),
    'cons?':             x => ann('JsBool', Call$('isCons',   [x].map(uncast))),
    'absvector?':        x => ann('JsBool', Call$('isArray',  [x].map(uncast))),
    'cons':         (x, y) => ann('Cons',   Call$('cons',     [x, y].map(uncast))),
    'hd':                x => Member(cast('Cons', x), Id('head')),
    'tl':                x => Member(cast('Cons', x), Id('tail')),
    'error-to-string':   x => ann('String', Member(cast('Error', x), Id('message'))),
    'simple-error':      x => Call$('raise', [cast('String', x)]),
    'read-byte':         x => ann('Number', Call$f('read-byte',  [x].map(uncast))),
    'write-byte':   (x, y) => ann('Number', Call$f('write-byte', [x, y].map(uncast))),
    'get-time':     (x, y) => ann('Number', Call$f('get-time',   [x, y].map(uncast))),
    'string->n':         x => ann('Number', Call$f('string->n',  [x].map(uncast))),
    'n->string':         x => ann('String', Call$f('n->string',  [x].map(uncast))),
    'tlstr':             x => ann('String', Call$f('tlstr',      [x].map(uncast))),
    'pos':          (x, y) => ann('String', Call$f('pos',        [x, y].map(uncast))),
    'absvector':         x => ann('Array',  Call$f('absvector',  [x].map(uncast))),
    'address->': (x, y, z) => ann('Array',  Call$f('address->',  [x, y, z].map(uncast))),
    '<-address':    (x, y) => Call$f('<-address', [x, y].map(uncast))
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
  const preprocessors = {};
  // TODO: remove preprocessors and just make js.ast.inline a special case?
  const context = new Context({
    async: options.async, head: true, locals: new Map(), inlines, preprocessors
  });
  const compile = expr => uncast(build(context, expr));
  const defun = (name, f) => (functions[name] = f.fund ? f : fun(f), symbolOf(name));
  const $ = {
    cons, toArray, toArrayTree, toList, toListTree,
    asJsBool, asShenBool, asNzNumber, asNeString, symbols, inlines, preprocessors, functions,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isList, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asList, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equate, raise, fun, bounce, settle, future, compile, defun,
    async: !!options.async, b: bounce, d: defun, f: functions, l: fun, r: toList, s, t: settle, u: future
  };
  // TODO: we can decide between AsyncFunction and Function
  //       using the same criteria for rendering the defuns
  const F = context.async ? AsyncFunction : Function;
  const evalJs = ast => F('$', generate(ast.isStmt ? Block(ast) : Return(ast)))($);
  const evalKl = expr => evalJs(compile(toArrayTree(expr)));
  functions['eval-kl'] = fun(evalKl);
  return Object.assign($, { evalKl, evalJs });
};
