const {
  Arrow, Binary, Block, Call, Catch, Conditional, Id, Iife, Literal,
  Member, Return, SafeId, Sequence, Template, Try, Unary, Vector,
  generate, isStatement
} = require('./ast');
const {
  AsyncFunction,
  last, most, produce, produceState, raise, s
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
  // TODO: in addition to locals, need types lookup for expression types, both get cleared and overwritten at the same time
  ann(local, dataType) { // TODO: if use Assoc, then locals can have types for expressions
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

const Cell = class {
  constructor(name) {
    this.name = name;
    this.f = undefined;
    this.value = undefined;
    this.valueExists = false;
  }
  set(x) {
    this.value = x;
    this.valueExists = true;
    return x;
  }
  get() {
    return this.valueExists ? this.value : raise(`global "${this.name}" is not defined`);
  }
};

// TODO: use fabrs to carry dataType instead of tacking it on asts
//       maybe isStmt as well?
const Fabrication = class {
  constructor(ast, subs = {}) {
    this.ast = ast;
    this.subs = subs;
  }
  get keys() { return Object.keys(this.subs); }
  get values() { return Object.values(this.subs); }
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
  raise('Shen boolean expected');

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

// TODO: replace these with apply() function?
// TODO: alternatively, curry all functions and applications
const funSync = (f, arity) =>
  (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funSync((...more) => f(...args, ...more), arity - args.length);
const funAsync = (f, arity) =>
  async (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(await future(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funAsync((...more) => f(...args, ...more), arity - args.length);
const fun = (f, arity = f.arity || f.length) =>
  Object.assign((f instanceof AsyncFunction ? funAsync : funSync)(f, arity), { arity, fund: true });

// TODO: combine an apply() function with settle/future as these follow all head position calls
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
const Member$e = name => Call(Member$('e'), [Literal(name)]);
const Call$ = (name, args, async = false) => Call(Member$(name), args, async);
const Call$f = (name, args, async = false) => inject(name, x => Call(Member(x, Id('f')), args, async));
const ann = (dataType, ast) =>
  ast instanceof Fabrication ? assemble(x => ann(dataType, x), ast) :
  Object.assign(ast, { dataType });
const cast = (dataType, ast) =>
  ast instanceof Fabrication ? assemble(x => cast(dataType, x), ast) :
  dataType !== ast.dataType ? Object.assign(Call$('as' + dataType, [ast]), { dataType }) :
  ast;
const uncast = ast =>
  ast instanceof Fabrication ? assemble(x => uncast(x), ast) :
  ast.dataType === 'JsBool' ? cast('ShenBool', ast) :
  ast;
const isForm = (expr, length, lead) =>
  isNeArray(expr) && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const canInline = (context, expr) =>
  isNeArray(expr) &&
  isSymbol(expr[0]) &&
  context.inlines.hasOwnProperty(nameOf(expr[0])) &&
  context.inlines[nameOf(expr[0])].length === expr.length - 1;
const fabricate = (x, subs) =>
  !(x instanceof Fabrication) ? new Fabrication(x, subs) :
  subs                        ? new Fabrication(x.ast, Object.assign({}, x.subs, subs)) :
  x;
const assemble = (f, ...xs) => {
  const fabrs = xs.map(x => fabricate(x));
  return fabricate(f(...fabrs.map(x => x.ast)), Object.assign({}, ...fabrs.map(x => x.subs)));
};
const inject = (name, f) => {
  const placeholder = SafeId(name, '$e$');
  return fabricate(f(placeholder), { [placeholder.name]: Member$e(name) });
};
const variable = (context, symbol) => ann(context.get(symbol).dataType, SafeId(nameOf(symbol)));
const idle = symbol => {
  const name = nameOf(symbol);
  const firstCharCode = name.charCodeAt(0);
  if (firstCharCode >= 65 && firstCharCode <= 90 || firstCharCode >= 97 && firstCharCode <= 122) {
    const placeholder = ann('Symbol', SafeId(name, '$s$'));
    return fabricate(placeholder, { [placeholder.name]: Template(Member$('s'), name) });
  } else {
    // TODO: reintroduce hoisting of idle symbols starting with non-alpha characters
    //       doing this broke idle symbols in some contexts, there were free variables
    //       and functions that weren't getting properly defined
    return fabricate(Template(Member$('s'), name));
  }
};
const inlineName = (context, symbol) =>
  isSymbol(symbol) && !context.has(symbol)
    ? fabricate(Literal(nameOf(symbol)))
    : assemble(
        x => Call$('nameOf', [cast('Symbol', x)]),
        build(context.now(), symbol));
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
const buildAnd = (context, [_and, left, right]) =>
  assemble(
    (x, y) => ann('JsBool', Binary('&&', cast('JsBool', x), cast('JsBool', y))),
    build(context.now(), left),
    build(recognise(context.now(), left), right));
const buildIf = (context, [_if, condition, ifTrue, ifFalse]) =>
  condition === shenTrue
    ? uncast(build(context, ifTrue))
    : assemble(
        (x, y, z) => Conditional(cast('JsBool', x), y, z),
        build(context.now(), condition),
        uncast(build(recognise(context, condition), ifTrue)),
        uncast(build(context, ifFalse)));
const buildCond = (context, [_cond, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [s`if`, test, consequent, alternate],
    [s`simple-error`, 'no condition was true']));
const buildDo = (context, [_do, ...exprs]) =>
  assemble(
    Sequence,
    ...most(exprs).map(x => build(context.now(), x)),
    uncast(build(context, last(exprs))));
const buildLet = (context, [_let, symbol, binding, body]) =>
  assemble(
    (y, z) => Call(Arrow([SafeId(nameOf(symbol))], z, context.async), [y], context.async),
    uncast(build(context.now(), binding)),
    uncast(build(context.add([asSymbol(symbol), {}]), body)));
const buildLambda = (context, params, body) =>
  assemble(
    b => Call$('l', [Arrow(params.map(x => SafeId(nameOf(x))), b, context.async)]),
    uncast(build(context.later().add(...params.map(x => [asSymbol(x), {}])), body)));
const buildTrap = (context, [_trap, body, handler]) =>
  isForm(handler, 3, 'lambda')
    ? assemble(
        (x, y) =>
          Iife([], [], Block(Try(
            Block(Return(x)),
            Catch(SafeId(nameOf(handler[1])), Block(Return(y))))), context.async),
        uncast(build(context.now(), body)),
        uncast(build(context.add([asSymbol(handler[1]), { dataType: 'Error' }]), handler[2])))
    : assemble(
        (x, y) =>
          Iife([], [], Block(Try(
            Block(Return(x)),
            Catch(Id('e$'), Block(Return(Call(y, [Id('e$')])))))), context.async),
        uncast(build(context.now(), body)),
        uncast(build(context, handler)));
const buildDefun = (context, [_defun, symbol, params, body]) =>
  assemble(
    (s, b) => Call$('d', [s, b]),
    inlineName(context, symbol),
    buildLambda(context.clear(), params, body));
const buildCons = (context, expr) => {
  const { result, state } = produceState(x => isForm(x, 3, 'cons'), x => x[1], x => x[2], expr);
  return isEArray(state) || state === null
    ? assemble(
        (...xs) => ann('Cons', Call$('r', [Vector(xs)])),
        ...result.map(x => uncast(build(context.now(), x))))
    : assemble(
        (x, ...xs) => ann('Cons', Call$('r', [Vector(xs), x])),
        uncast(build(context.now(), state)),
        ...result.map(x => uncast(build(context.now(), x))));
};
const buildSet = (context, [_set, symbol, value]) =>
  isSymbol(symbol) && !context.has(symbol)
    ? assemble(
        v => inject(nameOf(symbol), x => Call(Member(x, Id('set')), [v])),
        uncast(build(context.now(), value)))
    : assemble(
        (s, v) => Call(Member(Call(Member$('e'), [s]), Id('set')), [v]),
        inlineName(context, symbol),
        uncast(build(context.now(), value)));
const buildValue = (context, [_value, symbol]) =>
  isSymbol(symbol) && !context.has(symbol)
    ? inject(nameOf(symbol), x => Call(Member(x, Id('get')), []))
    : assemble(
        s => Call$('valueOf', [s]),
        inlineName(context, symbol));
const buildInline = (context, [fExpr, ...argExprs]) =>
  assemble(
    (...xs) => context.inlines[nameOf(fExpr)](...xs),
    ...argExprs.map(x => build(context.now(), x)));
const buildApp = (context, [fExpr, ...argExprs]) =>
  assemble(
    (f, ...args) => context.head
      ? Call$(context.async ? 'u' : 't', [Call(f, args)], context.async)
      : Call$('b', [f, ...args]),
    context.has(fExpr) ? fabricate(SafeId(nameOf(fExpr))) :
    isArray(fExpr)     ? uncast(build(context.now(), fExpr)) :
    isSymbol(fExpr)    ? inject(nameOf(fExpr), x => Member(x, Id('f'))) :
    raise('not a valid application form'),
    ...argExprs.map(x => uncast(build(context.now(), x))));
const build = (context, expr) =>
  isNumber(expr) ? fabricate(ann('Number', Literal(expr))) :
  isString(expr) ? fabricate(ann('String', Literal(expr))) :
  isEArray(expr) ? fabricate(ann('Null',   Literal(null))) :
  isSymbol(expr) ? (context.has(expr) ? fabricate(variable(context, expr)) : idle(expr)) :
  isForm(expr, 3, 'and')        ? buildAnd   (context, expr) :
  isForm(expr, 4, 'if')         ? buildIf    (context, expr) :
  isForm(expr, 0, 'cond')       ? buildCond  (context, expr) :
  isForm(expr, 3, 'do')         ? buildDo    (context, expr) :
  isForm(expr, 4, 'let')        ? buildLet   (context, expr) :
  isForm(expr, 3, 'trap-error') ? buildTrap  (context, expr) :
  isForm(expr, 3, 'lambda')     ? buildLambda(context, [expr[1]], expr[2]) :
  isForm(expr, 2, 'freeze')     ? buildLambda(context, [], expr[1]) :
  isForm(expr, 4, 'defun')      ? buildDefun (context, expr) :
  isForm(expr, 3, 'cons')       ? buildCons  (context, expr) :
  isForm(expr, 3, 'set')        ? buildSet   (context, expr) :
  isForm(expr, 2, 'value')      ? buildValue (context, expr) :
  canInline(context, expr)      ? buildInline(context, expr) :
  isArray(expr)                 ? buildApp   (context, expr) :
  raise('not a valid form');
const hoist = (fabr, async = false) =>
  fabr.keys.length === 0 ? fabr.ast : Iife(fabr.keys.map(x => Id(x)), fabr.values, fabr.ast, async);

module.exports = (options = {}) => {
  const globals = new Map();
  const eternal = name => {
    let cell = globals.get(name);
    if (!cell) {
      cell = new Cell(name);
      globals.set(name, cell);
    }
    return cell;
  };
  const valueOf = x => eternal(x).get();
  const openRead  = options.openRead  || (() => raise('open(in) not supported'));
  const openWrite = options.openWrite || (() => raise('open(out) not supported'));
  const open = (path, mode) =>
    mode === 'in'  ? openRead (asString(valueOf('*home-directory*')) + path) :
    mode === 'out' ? openWrite(asString(valueOf('*home-directory*')) + path) :
    raise(`open only accepts symbols in or out, not ${mode}`);
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
  const showCons = x => {
    const { result, state } = produceState(isCons, x => x.head, x => x.tail, x);
    return `[${result.map(show).join(' ')}${state === null ? '' : ` | ${show(state)}`}]`;
  };
  const show = x =>
    x === null    ? '[]' :
    isString(x)   ? `"${x}"` :
    isSymbol(x)   ? nameOf(x) :
    isCons(x)     ? showCons(x) :
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
  Object.entries(symbols).forEach(([name, v]) => eternal(name).set(v));
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
    'set':          (x, y) => eternal(nameOf(asSymbol(x))).set(y),
    'value':             x => valueOf(nameOf(asSymbol(x))),
    'type':         (x, _) => x
  };
  Object.entries(functions).forEach(([name, f]) => eternal(name).f = fun(f));
  const strictlyEqualTypes = new Set(['Number', 'String', 'Symbol', 'Stream', 'Null']);
  const inlines = {
    '=': (x, y) =>
      strictlyEqualTypes.has(x.dataType) || strictlyEqualTypes.has(y.dataType)
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
    'get-time':          x => ann('Number', Call$f('get-time',   [x].map(uncast))),
    'string->n':         x => ann('Number', Call$f('string->n',  [x].map(uncast))),
    'n->string':         x => ann('String', Call$f('n->string',  [x].map(uncast))),
    'tlstr':             x => ann('String', Call$f('tlstr',      [x].map(uncast))),
    'pos':          (x, y) => ann('String', Call$f('pos',        [x, y].map(uncast))),
    'absvector':         x => ann('Array',  Call$f('absvector',  [x].map(uncast))),
    'address->': (x, y, z) => ann('Array',  Call$f('address->',  [x, y, z].map(uncast))),
    '<-address':    (x, y) => Call$f('<-address', [x, y].map(uncast))
  };
  const context = new Context({
    async: options.async, head: true, locals: new Map(), inlines
  });
  const construct = expr => uncast(build(context, expr));
  const compile = expr => hoist(construct(expr), context.async);
  const defun = (name, f) => (eternal(name).f = f.fund ? f : fun(f), symbolOf(name));
  const $ = {
    cons, toArray, toArrayTree, toList, toListTree,
    asJsBool, asShenBool, asNzNumber, asNeString, inlines, globals, eternal,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isList, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asList, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equate, raise, fun, bounce, settle, future, assemble, construct, compile, defun,
    async: !!options.async, b: bounce, d: defun, l: fun, r: toList, s, t: settle, u: future, e: eternal
  };
  const F = context.async ? AsyncFunction : Function; // TODO: if fabr carries async, we can decide between constructors
  const evalJs = ast => F('$', generate(isStatement(ast) ? Block(ast) : Return(ast)))($);
  const evalKl = expr => evalJs(compile(toArrayTree(expr)));
  eternal('eval-kl').f = fun(evalKl);
  return Object.assign($, { evalKl, evalJs });
};
