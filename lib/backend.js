const {
  Arrow, Binary, Block, Call, Catch, Conditional, Id, Iife, Literal,
  Member, Return, SafeId, Sequence, Template, Try, Unary, Vector,
  generate, isStatement
} = require('./ast.js');
const {
  AsyncFunction,
  flatMap, last, most, produce, produceState, raise, s
} = require('./utils.js');

class Cons {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
}

class Trampoline {
  constructor(f, args) {
    this.f = f;
    this.args = args;
  }
}

class Context {
  constructor(options) {
    Object.assign(this, options);
  }
  with(options)  { return new Context({ ...this, ...options }) }
  sync()         { return this.with({ async: false }); }
  now()          { return this.with({ head: true }); }
  later()        { return this.with({ head: false }); }
  add(...locals) { return this.with({ locals: new Map([...this.locals, ...locals]) }); }
  has(local)     { return this.locals.has(local); }
  get(local)     { return this.locals.get(local); }
  ann(local, dataType) {
    return this.with({ locals: new Map(this.locals).set(local, { ...(this.get(local) || {}), dataType }) });
  }
}

class Cell {
  constructor(name) {
    this.name = name;
    this.f = () => raise(`function "${name}" is not defined`);
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
}

// TODO: if fabrs compose statements again, can use inline js.for, js.while, js.return, etc
//       making it easier to write overrides in Shen/KL
class Fabrication {
  constructor(ast, subs = {}) {
    this.ast = ast;
    this.subs = subs;
  }
  get keys() { return Object.keys(this.subs); }
  get values() { return Object.values(this.subs); }
}

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const shenTrue   = s`true`;
const shenFalse  = s`false`;
const isObject   = x => !Array.isArray(x) && typeof x === 'object' && x !== null;
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

const funSync = (f, arity) =>
  (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? bounce(() => asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity))) :
    args.length === 0 ? funSync(f, arity) :
    Object.assign(funSync((...more) => f(...args, ...more), arity - args.length), { arity: f.arity - args.length });
const funAsync = (f, arity) =>
  async (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? bounce(async () => asFunction(await settle(f(...args.slice(0, arity))))(...args.slice(arity))) :
    args.length === 0 ? funAsync(f, arity) :
    Object.assign(funAsync((...more) => f(...args, ...more), arity - args.length), { arity: f.arity - args.length });
const fun = (f, arity = f.arity || f.length) =>
  Object.assign((f instanceof AsyncFunction ? funAsync : funSync)(f, arity), { arity });

const bounce = (f, ...args) => new Trampoline(f, args);
const future = async x => {
  while (x = await x, x instanceof Trampoline) {
    x = x.f(...x.args);
  }
  return x;
};
const settle = x => {
  for (;;) {
    if (x instanceof Trampoline) {
      x = x.f(...x.args);
    } else if (x instanceof Promise) {
      return future(x);
    } else {
      return x;
    }
  }
};

const Member$ = name => Member(Id('$'), Id(name));
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
const canInline = (context, expr) => {
  if (isNeArray(expr) && isSymbol(expr[0])) {
    const inliner = context.inlines.get(nameOf(expr[0]));
    return inliner && inliner.arity === expr.length - 1;
  }
  return false;
};
const calls = expr =>
  isForm(expr, 4, 'if') ? flatMap(expr.slice(1), calls) :
  isForm(expr, 0, 'cond') ? flatMap(flatMap(expr.slice(1), x => x), calls) :
  isForm(expr, 4, 'let') ? flatMap(expr.slice(2), calls) :
  isForm(expr, 3, 'lambda') ? calls(expr[2]) :
  isForm(expr, 2, 'function') && isSymbol(expr[1]) ? [expr[1]] :
  isNeArray(expr) ? [expr[0], ...flatMap(expr.slice(1), calls)] :
  [];
const primitives = [
  s`+`, s`-`, s`*`, s`/`, s`=`, s`<`, s`>`, s`<=`, s`>=`,
  s`cn`, s`str`, s`tlstr`, s`pos`, s`n->string`, s`string->n`, s`cons`, s`hd`, s`tl`,
  s`cons?`, s`number?`, s`string?`, s`absvector?`, s`abvector`, s`<-address`, s`address->`,
  s`set`, s`value`, s`type`, s`simple-error`, s`error-to-string`, s`get-time`,
  s`and`, s`or`, s`if`, s`cond`, s`let`, s`do`,

  // overrides
  s`shen.pvar?`, s`@p`, s`shen.byte->digit`, s`shen.numbyte?`, s`integer?`, s`symbol?`,
  s`variable?`, s`shen.fillvector`, s`shen.initialise_arity_table`, s`put`,
  s`shen.dict`, s`shen.dict?`, s`shen.dict-count`, s`shen.dict->`,
  s`shen.<-dict`, s`shen.dict-rm`, s`shen.dict-keys`, s`shen.dict-values`
];
const hasExternalCalls = (f, body) => {
  const externals = new Set(calls(body));
  externals.delete(f);
  for (const primitive of primitives) {
    externals.delete(primitive);
  }
  return externals.size > 0;
};
const fabricate = (x, subs) =>
  !(x instanceof Fabrication) ? new Fabrication(x, subs) :
  subs                        ? new Fabrication(x.ast, Object.assign({}, x.subs, subs)) :
  x;
const assemble = (f, ...xs) => {
  const fabrs = xs.map(x => fabricate(x));
  return fabricate(f(...fabrs.map(x => x.ast)), Object.assign({}, ...fabrs.map(x => x.subs)));
};
const inject = (name, f) => {
  const placeholder = SafeId(name, '$c');
  return fabricate(f(placeholder), { [placeholder.name]: Call(Member$('c'), [Literal(name)]) });
};
const variable = (context, symbol) => ann(context.get(symbol).dataType, SafeId(nameOf(symbol)));
const idle = symbol => {
  const name = nameOf(symbol);
  const placeholder = ann('Symbol', SafeId(name, '$s'));
  return fabricate(placeholder, { [placeholder.name]: Template(Member$('s'), name) });
};
const inlineName = (context, symbol) =>
  isSymbol(symbol) && !context.has(symbol)
    ? fabricate(Literal(nameOf(symbol)))
    : assemble(
        x => Call$('nameOf', [cast('Symbol', x)]),
        build(context.now(), symbol));
const strictlyEqualTypes = new Set(['Number', 'String', 'Symbol', 'Stream', 'Null', 'ShenBool']);
const referenceEquatable = (x, y) => strictlyEqualTypes.has(x.dataType) || strictlyEqualTypes.has(y.dataType);
const recognisors = new Map([
  ['absvector?', 'Array'],
  ['boolean?',   'ShenBool'],
  ['cons?',      'Cons'],
  ['number?',    'Number'],
  ['string?',    'String'],
  ['symbol?',    'Symbol']
]);
const recognise = (context, expr) => {
  if (isArray(expr) && expr.length === 2 && isSymbol(expr[0]) && context.has(expr[1])) {
    const type = recognisors.get(nameOf(expr[0]));
    return type ? context.ann(expr[1], type) : context;
  }
  return context;
};
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
const buildFunction = (context, params, body) =>
  assemble(
    b => Call$('l', [Arrow(params.map(x => isSymbol(x) ? SafeId(nameOf(x)) : x), b, context.async)]),
    uncast(build(context.later().add(...params.filter(isSymbol).map(x => [x, {}])), body)));
const buildNestedLambda = (context, params, body) =>
  isForm(body, 3, 'lambda')
    ? buildNestedLambda(context, [...params.map((p, i) => p === body[1] ? Id(`$${i}$`) : p), body[1]], body[2])
    : buildFunction(context, params, body);
const buildLambda = (context, [_lambda, param, body]) => buildNestedLambda(context, [param], body);
const buildFreeze = (context, [_freeze, body]) => buildFunction(context, [], body);
const buildDefun = (context, [_defun, symbol, params, body]) =>
  assemble(
    (s, b) => Call$('d', [s, b]),
    inlineName(context, symbol),
    buildFunction(hasExternalCalls(symbol, body) ? context : context.sync(), params, body));
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
        (s, v) => Call(Member(Call(Member$('c'), [s]), Id('set')), [v]),
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
    (...xs) => context.inlines.get(nameOf(fExpr))(...xs),
    ...argExprs.map(x => build(context.now(), x)));
const buildApp = (context, [fExpr, ...argExprs]) =>
  assemble(
    (f, ...args) => context.head
      ? Call$('t', [Call(f, args)], context.async)
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
  isForm(expr, 3, 'lambda')     ? buildLambda(context, expr) :
  isForm(expr, 2, 'freeze')     ? buildFreeze(context, expr) :
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
  const context = new Context({ async: true, head: true, locals: new Map(), inlines: new Map() });
  const construct = expr => uncast(build(context, expr));
  const compile = expr => hoist(construct(expr), true);
  const globals = new Map();
  const lookup = name => {
    let cell = globals.get(name);
    if (!cell) {
      cell = new Cell(name);
      globals.set(name, cell);
    }
    return cell;
  };
  const valueOf = x => lookup(x).get();
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
    isFunction(x) ? `<Function ${x.arity || '?'}>` :
    isArray(x)    ? `<Vector ${x.length}>` :
    isError(x)    ? `<Error "${x.toString()}">` :
    isStream(x)   ? `<Stream ${x.name}>` :
    `${x}`;
  const assign = (name, value) => lookup(name).set(value);
  const defun = (name, f) => (lookup(name).f = f.arity ? f : fun(f), symbolOf(name));
  const inline = (name, dataType, paramTypes, f) => {
    const inliner = (...args) => {
      const ast = f(...args.map((a, i) => paramTypes[i] ? cast(paramTypes[i], a) : uncast(a)));
      return dataType ? ann(dataType, ast) : ast;
    };
    inliner.arity = f.length;
    context.inlines.set(name, inliner);
    return inliner;
  };
  const $ = {
    cons, toArray, toArrayTree, toList, toListTree,
    asJsBool, asShenBool, isEArray, isNeArray, asNeString, asNzNumber, globals, lookup, assign, defun, inline,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isList, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asList, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equate, raise, fun, bounce, settle, assemble, construct, compile,
    b: bounce, d: defun, l: fun, r: toList, s, t: settle, c: lookup
  };
  $.evalJs = ast => AsyncFunction('$', generate(isStatement(ast) ? Block(ast) : Return(ast)))($);
  $.evalKl = expr => $.evalJs(compile(toArrayTree(expr)));
  const out = options.stoutput;
  assign('*language*',       'JavaScript');
  assign('*implementation*', options.implementation || 'Unknown');
  assign('*release*',        options.release        || 'Unknown');
  assign('*os*',             options.os             || 'Unknown');
  assign('*port*',           options.port           || 'Unknown');
  assign('*porters*',        options.porters        || 'Unknown');
  assign('*stinput*',        options.stinput        || (() => raise('standard input not supported')));
  assign('*stoutput*',       out                    || (() => raise('standard output not supported')));
  assign('*sterror*',        options.sterror || out || (() => raise('standard output not supported')));
  assign('*home-directory*', options.homeDirectory  || '');
  assign('shen-script.*instream-supported*',  asShenBool(options.isInStream  || options.InStream));
  assign('shen-script.*outstream-supported*', asShenBool(options.isOutStream || options.OutStream));
  defun('eval-kl',                $.evalKl);
  defun('if',        (b, x, y) => asJsBool(b) ? x : y);
  defun('and',          (x, y) => asShenBool(asJsBool(x) && asJsBool(y)));
  defun('or',           (x, y) => asShenBool(asJsBool(x) || asJsBool(y)));
  defun('open',         (p, m) => open(asString(p), nameOf(asSymbol(m))));
  defun('close',             x => (asStream(x).close(), null));
  defun('read-byte',         x => asInStream(x).read());
  defun('write-byte',   (b, x) => (asOutStream(x).write(asNumber(b)), b));
  defun('number?',           x => asShenBool(isNumber(x)));
  defun('string?',           x => asShenBool(isString(x)));
  defun('absvector?',        x => asShenBool(isArray(x)));
  defun('cons?',             x => asShenBool(isCons(x)));
  defun('hd',                c => asCons(c).head);
  defun('tl',                c => asCons(c).tail);
  defun('cons',                   cons);
  defun('tlstr',             x => asNeString(x).substring(1));
  defun('cn',           (x, y) => asString(x) + asString(y));
  defun('string->n',         x => asNeString(x).charCodeAt(0));
  defun('n->string',         n => String.fromCharCode(asNumber(n)));
  defun('pos',          (x, i) => asString(x)[asIndex(i, x)]);
  defun('str',                    show);
  defun('absvector',         n => new Array(asNumber(n)).fill(null));
  defun('<-address',    (a, i) => asArray(a)[asIndex(i, a)]);
  defun('address->', (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a));
  defun('+',            (x, y) => asNumber(x) + asNumber(y));
  defun('-',            (x, y) => asNumber(x) - asNumber(y));
  defun('*',            (x, y) => asNumber(x) * asNumber(y));
  defun('/',            (x, y) => asNumber(x) / asNzNumber(y));
  defun('>',            (x, y) => asShenBool(asNumber(x) >  asNumber(y)));
  defun('<',            (x, y) => asShenBool(asNumber(x) <  asNumber(y)));
  defun('>=',           (x, y) => asShenBool(asNumber(x) >= asNumber(y)));
  defun('<=',           (x, y) => asShenBool(asNumber(x) <= asNumber(y)));
  defun('=',            (x, y) => asShenBool(equate(x, y)));
  defun('intern',            x => symbolOf(asString(x)));
  defun('get-time',          x => getTime(nameOf(asSymbol(x))));
  defun('simple-error',      x => raise(asString(x)));
  defun('error-to-string',   x => asError(x).message);
  defun('set',          (x, y) => lookup(nameOf(asSymbol(x))).set(y));
  defun('value',             x => valueOf(nameOf(asSymbol(x))));
  defun('type',         (x, _) => x);
  inline('=', 'JsBool', [null, null], (x, y) =>
    referenceEquatable(x, y) ? Binary('===', x, y) : Call$('equate', [x, y]));
  inline('not',             'JsBool', ['JsBool'],                  x => Unary('!', x));
  inline('or',              'JsBool', ['JsBool', 'JsBool'],   (x, y) => Binary('||', x, y));
  inline('+',               'Number', ['Number', 'Number'],   (x, y) => Binary('+',  x, y));
  inline('-',               'Number', ['Number', 'Number'],   (x, y) => Binary('-',  x, y));
  inline('*',               'Number', ['Number', 'Number'],   (x, y) => Binary('*',  x, y));
  inline('/',               'Number', ['Number', 'NzNumber'], (x, y) => Binary('/',  x, y));
  inline('<',               'JsBool', ['Number', 'Number'],   (x, y) => Binary('<',  x, y));
  inline('>',               'JsBool', ['Number', 'Number'],   (x, y) => Binary('>',  x, y));
  inline('<=',              'JsBool', ['Number', 'Number'],   (x, y) => Binary('<=', x, y));
  inline('>=',              'JsBool', ['Number', 'Number'],   (x, y) => Binary('>=', x, y));
  inline('cn',              'String', ['String', 'String'],   (x, y) => Binary('+',  x, y));
  inline('str',             'String', [null],                      x => Call$('show', [x]));
  inline('intern',          'Symbol', ['String'],                  x => Call$('symbolOf', [x]));
  inline('number?',         'JsBool', [null],                      x => Call$('isNumber', [x]));
  inline('string?',         'JsBool', [null],                      x => Call$('isString', [x]));
  inline('cons?',           'JsBool', [null],                      x => Call$('isCons', [x]));
  inline('absvector?',      'JsBool', [null],                      x => Call$('isArray', [x]));
  inline('cons',            'Cons',   [null, null],           (x, y) => Call$('cons', [x, y]));
  inline('hd',               null,    ['Cons'],                    x => Member(x, Id('head')));
  inline('tl',               null,    ['Cons'],                    x => Member(x, Id('tail')));
  inline('error-to-string', 'String', ['Error'],                   x => Member(x, Id('message')));
  inline('simple-error',     null,    ['String'],                  x => Call$('raise', [x]));
  inline('read-byte',       'Number', ['InStream'],                x => Call(Member(x, Id('read')), []));
  inline('write-byte',      'Number', [null, null],           (x, y) => Call$f('write-byte', [x, y]));
  inline('get-time',        'Number', [null],                      x => Call$f('get-time', [x]));
  inline('string->n',       'Number', ['NeString'],                x => Call(Member(x, Id('charCodeAt')), [Literal(0)]));
  inline('n->string',       'String', ['Number'],                  x => Call(Member(Id('String'), Id('fromCharCode')), [x]));
  inline('tlstr',           'String', ['NeString'],                x => Call(Member(x, Id('substring')), [Literal(1)]));
  inline('pos',             'String', [null, null],           (x, y) => Call$f('pos', [x, y]));
  inline('absvector',       'Array',  [null],                      x => Call$f('absvector', [x]));
  inline('address->',       'Array',  [null, null, null],  (x, y, z) => Call$f('address->', [x, y, z]));
  return $;
};
