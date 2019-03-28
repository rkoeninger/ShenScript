const { generate } = require('astring');

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

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
  add(locals) { return new Context({ ...this, locals: new Set([...this.locals, ...locals]) }); }
  has(local)  { return this.locals.has(local); }
};

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const shenTrue   = symbolOf('true');
const shenFalse  = symbolOf('false');
const isDefined  = x => x !== undefined;
const isNumber   = x => typeof x === 'number' && isFinite(x);
const isNzNumber = x => isNumber(x) && x !== 0;
const isString   = x => typeof x === 'string';
const isNeString = x => isString(x) && x.length > 0;
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => Array.isArray(x);
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons;
const asDefined  = x => isDefined(x)  ? x : raise('defined value expected');
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

const produce = (proceed, render, next, state) => {
  const array = [];
  while (proceed(state)) {
    array.push(render(state));
    state = next(state);
  }
  return array;
};

const cons             = (h, t) => new Cons(h, t);
const consFromArray    = a => a.reduceRight((t, h) => cons(h, t), null);
const consToArray      = c => produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree  = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);
const valueToArray     = x => isCons(x) ? consToArray(x) : x === null ? [] : x;
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x === null ? [] : x;

const equal = (x, y) =>
  x === y
  || isCons(x)  && isCons(y)  && equal(x.head, y.head) && equal(x.tail, y.tail)
  || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equal(v, y[i]))
//|| x.constructor === y.constructor && equal(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => equal(x[k], y[k]))
// TODO: what about NaN? do we want NaN to equal itself in shenscript? use Number.isNaN()

// TODO: need async variant of this function?
const fun = (f, id = f.id || f.name, arity = f.arity || f.length) =>
  Object.assign(
    (...args) => // TODO: this needs to be async
      args.length === arity ? f(...args) :
      // TODO: what if async? async curried application?
      args.length > arity ? asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity)) :
      // TODO: this needs to be async
      fun((...more) => f(...args, ...more), `${id}(${args.length})`, arity - args.length),
    { id, arity });

const raise = x => { throw new Error(x); };
const trap = (f, g) => {
  try {
    return f();
  } catch (e) {
    return g(e);
  }
};
const bait = async (f, g) => {
  try {
    return f(); // TODO: await here?
  } catch (e) {
    return g(e); // TODO: await here?
  }
};

const bounce = (f, args) => new Trampoline(f, args);
const settle = x => {
  while (x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};
const future = async x => {
  while (true) {
    const y = await x;
    if (y instanceof Trampoline) {
      x = y.run();
    } else {
      return y;
    }
  }
};

const literal = value => ({ type: 'Literal', value });
const array = elements => ({ type: 'ArrayExpression', elements });
const identifier = name => ({ type: 'Identifier', name });
const wait = argument => ({ type: 'AwaitExpression', argument });
const spread = argument => ({ type: 'SpreadElement', argument });
const assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', left, right, operator });
const answer = argument => ({ type: 'ReturnStatement', argument });
const sequential = expressions => ({ type: 'SequenceExpression', expressions });
const arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body });
// TOOD: pass async into invoke calls
const invoke = (callee, args, async = false) => (async ? wait : (x => x))({ type: 'CallExpression', callee, arguments: args });
const conditional = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });
const ofEnv = name => access(identifier('$'), identifier(name));
const invokeEnv = (name, args, async = false) => invoke(ofEnv(name), args, async);
const cast = (dataType, value) => dataType === 'JsBool' && value === shenTrue ? literal(true) : invokeEnv('as' + dataType, [value]);
const isForm = (expr, lead, length) => isArray(expr) && expr.length > 0 && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isConsForm = (expr, depth) => depth === 0 || isForm(expr, 'cons', 3) && isConsForm(expr[2], depth - 1);
const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const validCharactersRegex = /^[_A-Za-z][_A-Za-z0-9]*$/;
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeIdentifier = id => identifier(nameOf(id).split('').map(escapeCharacter).join(''));
const idle = id => invokeEnv('s', [literal(nameOf(id))]);
const globalFunction = id => access(ofEnv('f'), literal(nameOf(id)));
const complete = (context, ast) => invokeEnv(context.async ? 'future' : 'settle', [ast], context.async);
const completeOrReturn = (context, ast) => context.head ? complete(context, ast) : ast;
const completeOrBounce = (context, fAst, argsAsts) =>
  context.head ? complete(context, invoke(fAst, argsAsts)) : invokeEnv('bounce', [fAst, array(argsAsts)]);
const lambda = (context, name, params, body) =>
  invokeEnv('fun', [
    arrow(params.map(escapeIdentifier), build(context.later().add(params.map(asSymbol)), body), context.async),
    literal(name)]);
const build = (context, expr) =>
  expr === null || isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (context.has(expr) ? escapeIdentifier : idle)(expr) :
  isArray(expr) ? (
    expr.length === 0 ? literal(null) :
    isForm(expr, 'and', 3) || isForm(expr, 'or', 3) ?
      cast('ShenBool',
        logical(expr[0] === symbolOf('and') ? '&&' : '||',
          cast('JsBool', build(context.now(), expr[1])),
          cast('JsBool', build(context.now(), expr[2])))) :
    isForm(expr, 'if', 4) ?
      conditional(
        cast('JsBool', build(context.now(), expr[1])),
        build(context, expr[2]),
        build(context, expr[3])) :
    isForm(expr, 'cond') ?
      build(context, expr.slice(1).reduceRight(
        (alternate, [test, consequent]) => [symbolOf('if'), test, consequent, alternate],
        [symbolOf('simple-error'), 'no condition was true'])) :
    isForm(expr, 'do', 3) ?
      sequential([build(context.now(), expr[1]), build(context, expr[2])]) :
    isForm(expr, 'let', 4) ?
      invoke(
        arrow([escapeIdentifier(expr[1])], build(context.add([asSymbol(expr[1])]), expr[3]), context.async),
        [build(context.now(), expr[2])],
        context.async) :
    isForm(expr, 'trap-error', 3) ?
      completeOrReturn(
        context,
        invokeEnv(context.async ? 'bait' : 'trap',
          [arrow([], build(context.now(), expr[1]), context.async), build(context.now(), expr[2])],
          context.async)) :
    isForm(expr, 'lambda', 3) ? lambda(context, 'lambda', [expr[1]], expr[2]) :
    isForm(expr, 'freeze', 2) ? lambda(context, 'freeze', [], expr[1]) :
    isForm(expr, 'defun', 4) ?
      sequential([
        assign(globalFunction(expr[1]), lambda(context.clear(), nameOf(expr[1]), expr[2], expr[3])),
        idle(expr[1])]) :
    isConsForm(expr, 8) ?
      invokeEnv('consFromArray',
        [array(produce(x => isForm(x, 'cons', 3), x => build(context.now(), x[1]), x => x[2], expr))],
        context.async) :
    completeOrBounce(
      context,
      cast('Function', (
        context.has(expr[0]) ? escapeIdentifier(expr[0]) :
        isArray(expr[0])     ? build(context.now(), expr[0]) :
        isSymbol(expr[0])    ? globalFunction(expr[0]) :
        raise('not a valid application form'))),
      expr.slice(1).map(arg => build(context.now(), arg)))
  ) : raise('not a valid form');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?
module.exports = (options = {}) => {
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
    isError(x)    ? `<Error "${x.toString() + x.stack}">` :
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
    '*home-directory*': options.homeDirectory  || ''
  };
  const functions = {};
  const context = new Context({ async: options.async, head: true, locals: new Set() });
  const compile = expr => build(context, expr);
  const env = {
    cons, consFromArray, consToArray, consToArrayTree, valueToArray, valueToArrayTree, asJsBool, asShenBool,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, show, equal, raise, trap, bait, fun, bounce, settle, future, symbols, functions,
    compile, f: functions, s: symbolOf
  };
  const Func = context.async ? AsyncFunction : Function;
  env.evalKl = expr => Func('$', generate(answer(compile(valueToArrayTree(expr)))))(env);
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
    ['absvector?',      x => asShenBool(isArray(x))],
    ['cons?',           x => asShenBool(isCons(x))],
    ['hd',              c => asCons(c).head],
    ['tl',              c => asCons(c).tail],
    ['cons',            cons],
    ['tlstr',           s => asNeString(s).substring(1)],
    ['cn',              (s, t) => asString(s) + asString(t)],
    ['string->n',       s => asNeString(s).charCodeAt(0)],
    ['n->string',       n => String.fromCharCode(asNumber(n))],
    ['pos',             (s, i) => asString(s)[asIndex(i, s)]],
    ['str',             show],
    ['absvector',       n => new Array(asNumber(n)).fill(null)],
    ['<-address',       (a, i) => asArray(a)[asIndex(i, a)]],
    ['address->',       (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a)],
    ['+',               (x, y) => asNumber(x) + asNumber(y)],
    ['-',               (x, y) => asNumber(x) - asNumber(y)],
    ['*',               (x, y) => asNumber(x) * asNumber(y)],
    ['/',               (x, y) => asNumber(x) / asNzNumber(y)],
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
    ['value',           s => asDefined(symbols[nameOf(asSymbol(s))])],
    ['type',            (x, _) => x],
    ['eval-kl',         env.evalKl]
  ].forEach(([id, f]) => functions[id] = fun(f, id));
  return env;
};
