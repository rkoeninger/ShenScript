const { generate } = require('astring');

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
    Object.freeze(this);
  }
};

const ArrayCons = class {
  constructor(values, offset = 0) {
    this.values = values.slice();
    this.offset = offset;
    Object.freeze(this);
  }
  get head() {
    return this.values[this.offset];
  }
  get tail() {
    return this.offset < this.values.length - 1
      ? new ArrayCons(this.values, this.offset + 1)
      : null;
  }
};

const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
    Object.freeze(this);
  }
  run() {
    return this.f(...this.args);
  }
};

const Context = class {
  constructor(options) {
    Object.assign(this, options);
    Object.freeze(this);
  }
  now()       { return new Context({ ...this, head: true }); }
  later()     { return new Context({ ...this, head: false }); }
  clear()     { return new Context({ ...this, locals: new Set() }); }
  add(locals) { return new Context({ ...this, locals: new Set([...(this.locals || []), ...locals]) }); }
  has(local)  { return this.locals && this.locals.has(local); }
};

const flatMap = [].flatMap ? ((f, xs) => xs.flatMap(f)) : ((f, xs) => [].concat(...xs.map(f)));
const produce = (proceed, render, next, state) => {
  const array = [];
  while (proceed(state)) {
    array.push(render(state));
    state = next(state);
  }
  return array;
};

const raise = x => { throw new Error(x); };
const trap = (f, g) => {
  try {
    return f();
  } catch (e) {
    return g(e);
  }
};
const trapAsync = async (f, g) => {
  try {
    return f();
  } catch (e) {
    return g(e);
  }
};

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const shenTrue   = symbolOf('true');
const shenFalse  = symbolOf('false');
const isNumber   = x => typeof x === 'number' && isFinite(x);
const isString   = x => typeof x === 'string';
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => Array.isArray(x);
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons || x instanceof ArrayCons;
const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');

// TODO: remove debug stuff here
const asFunction = (x, y) => isFunction(x) ? x : raise('function expected: ' + (isSymbol(y) ? nameOf(y) : y));

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
  raise(`value ${x} is not a valid boolean`);

const cons             = (h, t) => new Cons(h, t);
const consFromArray    = a => a.length === 0 ? null : new ArrayCons(a);
const consToArray      = c => c instanceof ArrayCons ? c.values.slice() : produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree  = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);
const valueToArray     = x => isCons(x) ? consToArray(x) : x === null ? [] : x;
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x === null ? [] : x;

const equal = (x, y) =>
  x === y
  || isCons(x)  && isCons(y)  && equal(x.head, y.head) && equal(x.tail, y.tail)
  || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equal(v, y[i]));

const fun = (f, id = f.name, arity = f.length) =>
  Object.assign(
    (...args) =>
      args.length === arity ? f(...args) :
      args.length > arity ? f(...args.slice(0, arity))(args.slice(f.arity)) :
      fun((...more) => f(...args, ...more), `${id}(${args.length})`, arity - args.length),
    { id, arity });

const bounce = (f, args) => new Trampoline(f, args);
const settle = (f, args) => {
  let x = isFunction(f) ? f(...(args || [])) : f;
  while (x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};
const future = async (f, args) => {
  let x = isFunction(f) ? f(...(args || [])) : f;
  while (true) {
    const y = await x;
    if (y instanceof Trampoline) {
      x = y.run();
    } else {
      return y;
    }
  }
};

// TOOD: build async/await

const literal = value => ({ type: 'Literal', value });
const array = elements => ({ type: 'ArrayExpression', elements });
const identifier = name => ({ type: 'Identifier', name });
const wait = argument => ({ type: 'AwaitExpression', argument });
const spread = argument => ({ type: 'SpreadElement', argument });
const assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', left, right, operator });
const answer = argument => ({ type: 'ReturnStatement', argument });
const sequential = expressions => ({ type: 'SequenceExpression', expressions });
const arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body });
const invoke = (callee, arguments, async = false) => (async ? wait : (x => x))({ type: 'CallExpression', callee, arguments });
const conditional = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });
const ofEnv = name => access(identifier('$'), identifier(name));
const cast = (dataType, value) =>
  dataType === 'JsBool' && value === shenTrue
    ? literal(true)
    : invoke(ofEnv('as' + dataType), [value]);
const isForm = (expr, lead, length) => isArray(expr) && expr.length > 0 && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isConsForm = (expr, depth) => depth === 0 || isForm(expr, 'cons', 3) && isConsForm(expr[2], depth - 1);
const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const validCharactersRegex = /^[_A-Za-z][_A-Za-z0-9]*$/;
const validIdentifier = id => validCharactersRegex.test(nameOf(id));
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeIdentifier = id => identifier(nameOf(id).split('').map(escapeCharacter).join(''));
const idle = id => invoke(ofEnv('s'), [literal(nameOf(id))]);
const ofEnvFunctions = id => access(ofEnv('f'), (validIdentifier(id) ? identifier : literal)(nameOf(id)));
const buildCons = (context, expr) =>
  invoke(
    ofEnv('consFromArray'),
    [array(produce(x => isForm(x, 'cons', 3), x => build(context.now(), x[1]), x => x[2], expr))]);
const buildAndOr = (operator, context, [_, left, right]) =>
  cast('ShenBool',
    logical(operator,
      cast('JsBool', build(context.now(), left)),
      cast('JsBool', build(context.now(), right))));
const buildIf = (context, [_, test, consequent, alternate]) =>
  conditional(
    cast('JsBool', build(context.now(), test)),
    build(context, consequent),
    build(context, alternate));
const buildCond = (context, [_, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [symbolOf('if'), test, consequent, alternate],
    [symbolOf('simple-error'), 'no condition was true']));
const buildLet = (context, [_, id, value, body]) =>
  invoke(
    arrow([escapeIdentifier(id)], build(context.add([asSymbol(id)]), body), context.async),
    [build(context.now(), value)]);
const buildTrap = (context, [_, body, handler]) =>
  invoke(
    ofEnv(context.async ? 'trapAsync' : 'trap'),
    [arrow([], build(context.now(), body)), build(context.now(), handler)]);
const buildLambda = (context, name, params, body) =>
  // TODO: group nested lambdas into single 2+ arity function? ex. (lambda X (lambda Y Q)) ==> (lambda (X Y) Q)
  invoke(ofEnv('fun'), [
    arrow(params.map(escapeIdentifier), build(context.later().add(params.map(asSymbol)), body), context.async),
    literal(name)]);
const buildDefun = (context, [_, id, params, body]) =>
  sequential([assign(ofEnvFunctions(id), buildLambda(context.clear(), nameOf(id), params, body)), idle(id)]);

// TODO: remove this debug stuff and from buildApp
const showArray = x =>
  isArray(x) ? `[${x.map(showArray).join(', ')}]` :
  isSymbol(x) ? x.toString() :
  ('' + x);

const buildApp = (context, [f, ...args]) =>
  invoke(ofEnv(context.head ? (context.async ? 'future' : 'settle') : 'bounce'), [
    context.has(f) ? cast('Function', escapeIdentifier(f)) :
    // isArray(f)     ? cast('Function', build(context.now(), f)) :

    // TODO: remove debug code here
    isArray(f)     ? invoke(ofEnv('asFunction'), [build(context.now(), f), literal(showArray(f))]) :

    isSymbol(f)    ? ofEnvFunctions(f) :
    raise('not a valid application form'),
    array(args.map(x => build(context.now(), x)))]);
const build = (context, expr) =>
  expr === null || isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (context.has(expr) ? escapeIdentifier : idle)(expr) :
  isArray(expr) ? (
    expr.length === 0             ? literal(null) :
    isForm(expr, 'and', 3)        ? buildAndOr('&&', context, expr) :
    isForm(expr, 'or',  3)        ? buildAndOr('||', context, expr) :
    isForm(expr, 'if', 4)         ? buildIf(context, expr) :
    isForm(expr, 'cond')          ? buildCond(context, expr) :
    isForm(expr, 'let', 4)        ? buildLet(context, expr) :
    isForm(expr, 'trap-error', 3) ? buildTrap(context, expr) :
    isForm(expr, 'lambda', 3)     ? buildLambda(context, 'lambda', [expr[1]], expr[2]) :
    isForm(expr, 'freeze', 2)     ? buildLambda(context, 'freeze', [], expr[1]) :
    isForm(expr, 'defun', 4)      ? buildDefun(context, expr) :
    isConsForm(expr, 8)           ? buildCons(context, expr) :
    buildApp(context, expr)
  ) : raise('not a valid form');

exports.kl = (options = {}) => {
  // TODO: have shen-script.*instream-supported*, shen-script.*outstream-supported* flags?
  const isInStream  = options.isInStream  || (() => false);
  const isOutStream = options.isOutStream || (() => false);
  const asInStream  = x => isInStream(x)  ? x : raise('input stream expected');
  const asOutStream = x => isOutStream(x) ? x : raise('output stream expected');
  const isStream = x => isInStream(x) || isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || (() => new Date().getTime());
  const startTime = clock();
  const getTime = mode =>
    mode === 'unix' ? clock() :
    mode === 'run'  ? clock() - startTime :
    raise(`get-time only accepts symbols unix or run, not ${mode}`);
  const openRead  = options.openRead  || (() => raise('open(in) not supported'));
  const openWrite = options.openWrite || (() => raise('open(out) not supported'));
  const open = (path, mode) =>
    mode === 'in'  ? openRead(path) :
    mode === 'out' ? openWrite(path) :
    raise(`open only accepts symbols in or out, not ${mode}`);
  const show = x =>
    x === null    ? '[]' :
    isString(x)   ? `"${x}"` :
    isSymbol(x)   ? nameOf(x) :
    isCons(x)     ? `[${consToArray(x).map(show).join(' ')}]` :
    isFunction(x) ? `<Function ${x.id}>` :
    isArray(x)    ? `<Vector ${x.length}>` :
    isError(x)    ? `<Error "${x.message}">` :
    isStream(x)   ? `<Stream ${x.name}>` :
    `${x}`;
  const symbols = {
    '*language*':       'JavaScript',
    '*implementation*': options.implementation || 'Unknown',
    '*release*':        options.release        || 'Unknown',
    '*os*':             options.os             || 'Unknown',
    '*port*':           options.port           || 'Unknown',
    '*porters*':        options.porters        || 'Unknown',
    '*stinput*':        options.stinput        || (() => raise('standard input not supported')),
    '*stoutput*':       options.stoutput       || (() => raise('standard output not supported')),
    '*sterror*':        options.sterror        || (() => raise('standard error not supported')),
    '*home-directory*': options.homeDirectory  || ''
  };
  const functions = {};
  const context = new Context({ async: options.async, head: true });
  const env = {
    cons, consFromArray, consToArray, consToArrayTree, valueToArray, valueToArrayTree, asJsBool, asShenBool,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, show, equal, raise, trap, trapAsync, fun, bounce, settle, future, symbols, functions,
    build: x => build(context, x), f: functions, s: symbolOf
  };
  // TODO: remove this undefined check
  env.evalKl = expr => expr === undefined ? raise('undefined expr') : Function('$', generate(answer(build(context, valueToArrayTree(expr)))))(env);
  [
    ['if',              (b, x, y) => asJsBool(b) ? x : y],
    ['and',             (x, y) => asShenBool(asJsBool(x) && asJsBool(y))],
    ['or',              (x, y) => asShenBool(asJsBool(x) || asJsBool(y))],
    ['open',            (p, m) => open(asString(p), nameOf(asSymbol(m)))],
    ['close',           s => asStream(s).close()],
    ['read-byte',       s => asInStream(s).read()],
    ['write-byte',      (b, s) => (asOutStream(s).write(asNumber(b)), b)],
    ['number?',         x => asShenBool(isNumber(x))],
    ['string?',         x => asShenBool(isString(x))],
    ['symbol?',         x => asShenBool(isSymbol(x))],
    ['absvector?',      x => asShenBool(isArray(x))],
    ['cons?',           x => asShenBool(isCons(x))],
    ['hd',              c => asCons(c).head],
    ['tl',              c => asCons(c).tail],
    ['cons',            cons],
    ['tlstr',           s => asString(s).substring(1)],
    ['cn',              (s, t) => asString(s) + asString(t)],
    ['string->n',       s => asString(s).charCodeAt(0)],
    ['n->string',       n => String.fromCharCode(asNumber(n))],
    ['pos',             (s, i) => asString(s)[asIndex(i, s)]],
    ['str',             show],
    ['absvector',       n => new Array(asNumber(n)).fill(null)],
    ['<-address',       (a, i) => asArray(a)[asIndex(i, a)]],
    ['address->',       (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a)],
    ['+',               (x, y) => asNumber(x) + asNumber(y)],
    ['-',               (x, y) => asNumber(x) - asNumber(y)],
    ['*',               (x, y) => asNumber(x) * asNumber(y)],
    ['/',               (x, y) => asNumber(x) / asNumber(y)],
    ['>',               (x, y) => asShenBool(asNumber(x) >  asNumber(y))],
    ['<',               (x, y) => asShenBool(asNumber(x) <  asNumber(y))],
    ['>=',              (x, y) => asShenBool(asNumber(x) >= asNumber(y))],
    ['<=',              (x, y) => asShenBool(asNumber(x) <= asNumber(y))],
    ['=',               (x, y) => asShenBool(equal(x, y))],
    ['intern',          s => symbolOf(asString(s))],
    ['get-time',        m => getTime(nameOf(asSymbol(m)))],
    ['simple-error',    s => raise(asString(s))],
    ['error-to-string', e => asError(e).message],
    ['set',             (s, x) => symbols[nameOf(asSymbol(s))] = x],
    ['value',           s => symbols[nameOf(asSymbol(s))]],
    ['type',            (x, _) => x],
    ['eval-kl',         env.evalKl]
  ].forEach(([id, f]) => functions[id] = fun(f, id));
  return env;
};

// TODO: need override for (function F) : symbol -> function, can remove special function form
