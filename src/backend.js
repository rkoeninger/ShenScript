const {
  adorn, ann, generate,
  Arrow, Assign, Await, Binary, Block, Call, Catch, Do, Identifier, If, Iife,
  Literal, Member, RawIdentifier, Return, Try, Unary, Vector
} = require('./ast');

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
  with(opts)  { return new Context({ ...this, ...opts }) }
  now()       { return this.with({ head: true }); }
  later()     { return this.with({ head: false }); }
  clear()     { return this.with({ locals: new Set() }); }
  add(locals) { return this.with({ locals: new Set([...this.locals, ...locals]) }); }
  has(local)  { return this.locals.has(local); }
};

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const s          = (x, y) => symbolOf(String.raw(x, y));
const shenTrue   = s`true`;
const shenFalse  = s`false`;
const isObject   = x => typeof x === 'object' && x !== null;
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
const consToArray      = c => produce(isCons, c => c.head,                   c => c.tail, c);
const consToArrayTree  = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);
const valueToArray     = x => isCons(x) ? consToArray(x)     : x === null ? [] : x;
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x === null ? [] : x;

const equal = (x, y) =>
  x === y
  || isCons(x)   && isCons(y)   && equal(x.head, y.head) && equal(x.tail, y.tail)
  || isArray(x)  && isArray(y)  && x.length === y.length && x.every((v, i) => equal(v, y[i]))
  || isObject(x) && isObject(y) && x.constructor === y.constructor
    && equal(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => equal(x[k], y[k]));

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

const raise = x => { throw new Error(x); };
const bounce = (f, ...args) => new Trampoline(f, args);
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

const accessEnv = name => Member(RawIdentifier('$'), Identifier(name));
const invokeEnv = (name, args, async = false) => Call(accessEnv(name), args, async);
const cast = (dataType, ast) => dataType !== ast.dataType ? Object.assign(invokeEnv('as' + dataType, [ast]), { dataType }) : ast;
const uncast = ast => ast.dataType === 'JsBool' ? cast('ShenBool', ast) : ast;
const isForm = (expr, lead, length) => isArray(expr) && expr.length > 0 && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isConsForm = (expr, depth) => depth === 0 || isForm(expr, 'cons', 3) && isConsForm(expr[2], depth - 1);
const validCharactersRegex = /^[_A-Za-z][_A-Za-z0-9]*$/;
const validIdentifier = id => validCharactersRegex.test(nameOf(id));
const idle = id => ann('Symbol', adorn(accessEnv('s'), nameOf(id)));
const globalFunction = id => Member(accessEnv('f'), (validIdentifier(id) ? Identifier : Literal)(nameOf(id)));
const complete = (context, ast) => invokeEnv(context.async ? 'u' : 't', [ast], context.async);
const completeOrReturn = (context, ast) => context.head ? complete(context, ast) : ast;
const completeOrBounce = (context, fAst, argsAsts) =>
  context.head ? complete(context, Call(fAst, argsAsts)) : invokeEnv('b', [fAst, ...argsAsts]);
const symbolKey = (context, expr) =>
  isSymbol(expr) && !context.has(expr)
    ? Literal(nameOf(expr))
    : invokeEnv('nameOf', [cast('Symbol', build(context.now(), expr))]);
const lambda = (context, name, params, body) =>
  ann('Function',
    invokeEnv('fun', [
      Arrow(
        params.map(x => Identifier(nameOf(x))),
        uncast(build(context.later().add(params.map(asSymbol)), body)),
        context.async)]));
const build = (context, expr) =>
  isNumber(expr) ? ann('Number', Literal(expr)) :
  isString(expr) ? ann('String', Literal(expr)) :
  isSymbol(expr) ? (context.has(expr) ? Identifier(nameOf(expr)) : idle(expr)) :
  isArray(expr) ? (
    expr.length === 0 ? ann('Null', Literal(null)) :
    isForm(expr, 'if', 4) ? (
      expr[1] === shenTrue
        ? uncast(build(context, expr[2]))
        : If(cast('JsBool', build(context.now(), expr[1])), ...expr.slice(2).map(x => uncast(build(context, x))))) :
    isForm(expr, 'cond') ?
      uncast(build(context, expr.slice(1).reduceRight(
        (alternate, [test, consequent]) => [s`if`, test, consequent, alternate],
        [s`simple-error`, 'no condition was true']))) :
    isForm(expr, 'do', 3) ? Do([build(context.now(), expr[1]), uncast(build(context, expr[2]))]) :
    isForm(expr, 'let', 4) ?
      Call(
        Arrow(
          [Identifier(nameOf(expr[1]))],
          uncast(build(context.add([asSymbol(expr[1])]), expr[3])),
          context.async),
        [uncast(build(context.now(), expr[2]))],
        context.async) :
    isForm(expr, 'trap-error', 3) ?
      completeOrReturn(
        context,
        Iife(Block([
          Try(
            Block([Return(uncast(build(context.now(), expr[1])))]),
            isForm(expr[2], 'lambda', 3)
              ? Catch(
                  Identifier(nameOf(expr[2][1])),
                  Block([Return(uncast(build(context.later().add([asSymbol(expr[2][1])]), expr[2][2])))]))
              : Catch(
                  RawIdentifier('e$'),
                  Block([Return(Call(uncast(build(context.later(), expr[2])), [RawIdentifier('e$')]))])))]),
          context.async)) :
    isForm(expr, 'lambda', 3) ? lambda(context, 'lambda', [expr[1]], expr[2]) :
    isForm(expr, 'freeze', 2) ? lambda(context, 'freeze', [], expr[1]) :
    isForm(expr, 'defun', 4) ?
      Do([
        Assign(globalFunction(expr[1]), lambda(context.clear(), nameOf(expr[1]), expr[2], expr[3])),
        idle(expr[1])]) :
    isConsForm(expr, 8) ?
      ann('Cons',
        invokeEnv('consFromArray',
          [Vector(produce(x => isForm(x, 'cons', 3), x => uncast(build(context.now(), x[1])), x => x[2], expr))])) :
    isSymbol(expr[0]) && context.primitives.hasOwnProperty(nameOf(expr[0]))
                      && context.primitives[nameOf(expr[0])].length === expr.length - 1 ?
      context.primitives[nameOf(expr[0])](...expr.slice(1).map(x => build(context.now(), x))) :
    isForm(expr, 'set', 3) ?
      Assign(Member(accessEnv('symbols'), symbolKey(context, expr[1])), uncast(build(context.now(), expr[2]))) :
    isForm(expr, 'value', 2) ?
      invokeEnv('valueOf', [symbolKey(context, expr[1])]) :
    completeOrBounce(
      context,
      context.has(expr[0]) ? Identifier(nameOf(expr[0])) :
      isArray(expr[0])     ? uncast(build(context.now(), expr[0])) :
      isSymbol(expr[0])    ? globalFunction(expr[0]) :
      raise('not a valid application form'),
      expr.slice(1).map(arg => uncast(build(context.now(), arg))))
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
  const clock = options.clock || (() => Date.now() / 1000);
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
    isFunction(x) ? `<Function ${x.arity}>` :
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
  const atomicTypes = ['Number', 'String', 'Symbol', 'Stream', 'Null'];
  const primitives = {
    '=': (x, y) =>
      ann('JsBool',
        atomicTypes.includes(x.dataType) ? Binary('===', x, uncast(y)) :
        atomicTypes.includes(y.dataType) ? Binary('===', y, uncast(x)) :
        invokeEnv('equal', [x, y].map(uncast))),
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
    'str':             x => ann('String', invokeEnv('show',     [uncast(x)])),
    'intern':          x => ann('Symbol', invokeEnv('symbolOf', [cast('String', x)])),
    'number?':         x => ann('JsBool', invokeEnv('isNumber', [uncast(x)])),
    'string?':         x => ann('JsBool', invokeEnv('isString', [uncast(x)])),
    'cons?':           x => ann('JsBool', invokeEnv('isCons',   [uncast(x)])),
    'absvector?':      x => ann('JsBool', invokeEnv('isArray',  [uncast(x)])),
    'cons':       (x, y) => ann('Cons',   invokeEnv('cons',     [x, y].map(uncast))),
    'hd':              x => Member(cast('Cons', x), Identifier('head')),
    'tl':              x => Member(cast('Cons', x), Identifier('tail')),
    'error-to-string': x => ann('String', Member(cast('Error', x), Identifier('message'))),
    'simple-error':    x => invokeEnv('raise', [cast('String', x)]),
    'read-byte':       x => ann('Number', Call(globalFunction(s`read-byte`), [uncast(x)])),
    'write-byte': (x, y) => ann('Number', Call(globalFunction(s`write-byte`), [x, y].map(uncast))),
    'get-time':   (x, y) => ann('Number', Call(globalFunction(s`get-time`), [x, y].map(uncast))),
    'string->n':       x => ann('Number', Call(globalFunction(s`string->n`), [uncast(x)])),
    'n->string':       x => ann('String', Call(globalFunction(s`n->string`), [uncast(x)])),
    'tlstr':           x => ann('String', Call(globalFunction(s`tlstr`), [uncast(x)])),
    'pos':        (x, y) => ann('String', Call(globalFunction(s`pos`), [x, y].map(uncast)))
  };
  const valueOf = x => symbols.hasOwnProperty(x) ? symbols[x] : raise(`global "${x}" is not defined`);
  const functions = {};
  const context = new Context({ async: options.async, head: true, locals: new Set(), primitives });
  const compile = expr => uncast(build(context, expr));
  const $ = {
    cons, consFromArray, consToArray, consToArrayTree, valueToArray, valueToArrayTree,
    asJsBool, asShenBool, asNzNumber, asNeString, asDefined,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equal, raise, fun, bounce, settle, future, symbols, functions, compile,
    f: functions, s, b: bounce, t: settle, u: future
  };
  const Func = context.async ? AsyncFunction : Function;
  $.evalKl = expr => Func('$', generate(Return(compile(valueToArrayTree(expr)))))($);
  [
    ['if',        (b, x, y) => asJsBool(b) ? x : y],
    ['and',          (x, y) => asShenBool(asJsBool(x) && asJsBool(y))],
    ['or',           (x, y) => asShenBool(asJsBool(x) || asJsBool(y))],
    ['open',         (p, m) => open(asString(p), nameOf(asSymbol(m)))],
    ['close',             x => (asStream(x).close(), null)],
    ['read-byte',         x => asInStream(x).read()],
    ['write-byte',   (b, x) => (asOutStream(x).write(asNumber(b)), b)],
    ['number?',           x => asShenBool(isNumber(x))],
    ['string?',           x => asShenBool(isString(x))],
    ['absvector?',        x => asShenBool(isArray(x))],
    ['cons?',             x => asShenBool(isCons(x))],
    ['hd',                c => asCons(c).head],
    ['tl',                c => asCons(c).tail],
    ['cons',                   cons],
    ['tlstr',             x => asNeString(x).substring(1)],
    ['cn',           (x, y) => asString(x) + asString(y)],
    ['string->n',         x => asNeString(x).charCodeAt(0)],
    ['n->string',         n => String.fromCharCode(asNumber(n))],
    ['pos',          (x, i) => asString(x)[asIndex(i, x)]],
    ['str',                    show],
    ['absvector',         n => new Array(asNumber(n)).fill(null)],
    ['<-address',    (a, i) => asArray(a)[asIndex(i, a)]],
    ['address->', (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a)],
    ['+',            (x, y) => asNumber(x) + asNumber(y)],
    ['-',            (x, y) => asNumber(x) - asNumber(y)],
    ['*',            (x, y) => asNumber(x) * asNumber(y)],
    ['/',            (x, y) => asNumber(x) / asNzNumber(y)],
    ['>',            (x, y) => asShenBool(asNumber(x) >  asNumber(y))],
    ['<',            (x, y) => asShenBool(asNumber(x) <  asNumber(y))],
    ['>=',           (x, y) => asShenBool(asNumber(x) >= asNumber(y))],
    ['<=',           (x, y) => asShenBool(asNumber(x) <= asNumber(y))],
    ['=',            (x, y) => asShenBool(equal(x, y))],
    ['intern',            x => symbolOf(asString(x))],
    ['get-time',          x => getTime(nameOf(asSymbol(x)))],
    ['simple-error',      x => raise(asString(x))],
    ['error-to-string',   x => asError(x).message],
    ['set',          (x, y) => symbols[nameOf(asSymbol(x))] = y],
    ['value',             x => valueOf(nameOf(asSymbol(x)))],
    ['type',         (x, _) => x],
    ['eval-kl',                $.evalKl]
  ].forEach(([id, f]) => functions[id] = fun(f));
  return $;
};
