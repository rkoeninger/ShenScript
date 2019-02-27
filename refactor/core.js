const { generate } = require('astring');

/* Empty        null     *
 * Number       number   *
 * String       string   *
 * Symbol       symbol   *
 * Function     function *
 * AbsVector    array    *
 * Error        Error    *
 * Cons         Cons     *
 * Stream       ________ */

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
    return app(this.f, this.args || []);
  }
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
const isCons     = x => x instanceof Cons;
const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');
const asFunction = x => isFunction(x) ? x : raise('function expected');
const asArray    = x => isArray(x)    ? x : raise('array expected');
const asCons     = x => isCons(x)     ? x : raise('cons expected');
const asError    = x => isError(x)    ? x : raise('error expected');
const asIndex    = (i, a) =>
  !Number.isInteger(i)   ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with array bounds of [0, ${a.length})`) :
  i;

const isShenTrue  = x => x === shenTrue;
const isShenFalse = x => x === shenFalse;
const isShenBool  = x => x === shenTrue || x === shenFalse;
const asShenBool  = x => x ? shenTrue : shenFalse;
const asJsBool    = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise(`value ${x} is not a valid boolean`);

const cons             = (h, t) => new Cons(h, t);
const consFromArray    = a => a.reduceRight((t, h) => cons(h, t), null);
const consToArray      = c => produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree  = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);
const valueToArray     = x => isCons(x) ? consToArray(x) : x;
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x;

// TODO: build calling `app` into each function so it can be called naturally

const func = (f, id, arity) => Object.assign(f, {
  arity: arity !== undefined ? arity : f.length,
  id: id !== undefined ? id : f.name
});

const app = (f, args) =>
  f.arity === undefined || f.arity === args.length ? f(...args) :
  f.arity < args.length ? app(f(...args.slice(0, f.arity)), args.slice(f.arity)) :
  func((...more) => app(f, [...args, ...more]), f.id, args.length - f.arity);

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
const settleApp = (f, args) => settle(app(f, args));
const futureApp = (f, args) => future(app(f, args));

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
const unary = (operator, argument, prefix = true) => ({ type: 'UnaryExpression', prefix, operator, argument });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });

const butLocals = (x, locals) => ({ ...x, locals: new Set(locals) });
const addLocals = (x, locals) => ({ ...x, locals: new Set([...x.locals, ...locals]) });
const ofDataType = (dataType, x) => ({ ...x, dataType });
const ensure = (dataType, expr) =>
  ofDataType(dataType, expr.dataType === dataType ? expr : invoke(buildEnvAccess('as' + dataType), [expr]));

const inHead = x => ({ ...x, position: 'head' });
const inTail = x => ({ ...x, position: 'tail' });
const inDataType = (dataType, x) => ({ ...x, dataType });

const isForm = (expr, lead, length) =>
  expr[0] === symbolOf(lead) && (!length || expr.length === length || raise(`${lead} must have ${length - 1} argument forms`));
const flattenForm = (expr, lead) => isForm(expr, lead) ? flatMap(x => flattenForm(x, lead), expr.slice(1)) : [expr];

const isReferenced = (symbol, expr) =>
  expr === symbol
  || isArray(expr)
    && expr.length > 0
    && !isForm(expr, 'defun', 4)
    && (isForm(expr, 'let', 4) && (isReferenced(symbol, expr[2]) || expr[1] !== symbol && isReferenced(symbol, expr[3]))
     || isForm(expr, 'lambda', 3) && expr[1] !== symbol && isReferenced(symbol, expr[2])
     || expr.some(x => isReferenced(symbol, x)));

const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const validCharactersRegex = /^[_A-Za-z][_A-Za-z0-9]*$/;
const validIdentifier = s => validCharactersRegex.test(s);
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;

/* async        transpiler should generate async/await syntax                  *
 * position     'head' or 'tail'                                               *
 * locals       Set of local variables and parameters defined at this point    *
 * scope        Name of enclosing function/file                                *
 * dataType     specific type is expected for expression, undefined if unknown */

// TODO: inlining, type-inferred optimizations
//       context.dataType signals expected, ast.dataType signals actual
// TODO: bound/settle based on head/tail position
// TOOD: async/await

const buildEnvAccess = namespace => access(identifier('$env'), identifier(namespace));
const buildIdentifier = s => identifier(nameOf(s).split('').map(escapeCharacter).join(''));
const buildIdleSymbol = s => ofDataType('Symbol', invoke(buildEnvAccess('symbolOf'), [literal(nameOf(s))]));
const buildLookup = (namespace, name) => access(buildEnvAccess(namespace), (validIdentifier(name) ? identifier : literal)(name));
const buildInDataType = (dataType, context, expr) => ensure(dataType, build(inDataType(dataType, context), expr));
const buildLogicalForm = (context, expr, lead) =>
  ensure(
    'ShenBool',
    flattenForm(expr, lead)
      .map(x => ensure('JsBool', build(inHead(inDataType('JsBool', context)), x)))
      .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)));
const buildIf = (context, [_, test, consequent, alternate]) =>
  test === shenTrue  ? build(context, consequent) :
  test === shenFalse ? build(context, alternate) :
  conditional(
    buildInDataType('JsBool', inHead(context), test),
    build(inTail(context), consequent),
    build(inTail(context), alternate));
const buildCond = (context, [_, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [symbolOf('if'), test, consequent, alternate],
    [symbolOf('simple-error'), 'no condition was true']));
const buildLet = (context, [_, id, value, body]) =>
  id === symbolOf('_') || !isReferenced(id, body) ? buildDo([value, body]) :
  invoke(
    arrow([buildIdentifier(id)], build(addLocals(context, [asSymbol(id)]), body)),
    [build(inHead(context), value)]);
const buildDo = (context, [_, ...exprs]) => sequential(exprs.map(x => build(context, x)));
const buildTrap = (context, [_, body, handler]) =>
  invoke(buildEnvAccess('trap'), [arrow([], build(context, body)), build(context, handler)]);
const buildLambda = (context, paramz, body) =>
  // TODO: group nested lambdas into single 2+ arity function? ex. (lambda X (lambda Y Q)) ==> (lambda (X Y) Q)
  ofDataType('Function', arrow(paramz.map(buildIdentifier), build(addLocals(context, paramz.map(asSymbol)), body)));
const buildDefun = (context, [_, id, paramz, body]) =>
  sequential([
    assign(
      buildLookup('functions', nameOf(id)),
      invoke(buildEnvAccess('func'), [
        arrow(paramz.map(buildIdentifier), build(butLocals(inTail(context), paramz.map(asSymbol)), body)),
        literal(nameOf(id))])),
    buildIdleSymbol(id)]);
const buildApp = (context, [f, ...args]) =>
  invoke(buildEnvAccess(context.tail ? 'bounce' : context.async ? 'futureApp' : 'settleApp'), [
    isArray(f)            ? invoke(buildEnvAccess('asFunction'), [build(context, f)]) :
    context.locals.has(f) ? invoke(buildEnvAccess('asFunction'), [buildIdentifier(f)]) :
    isSymbol(f)           ? buildLookup('functions', nameOf(f)) :
    raise('not a valid application form'),
    array(args.map(x => build(context, x)))]);
const build = (context, expr) =>
  isNumber(expr) ? ofDataType('Number', literal(expr)) :
  isString(expr) ? ofDataType('String', literal(expr)) :
  isSymbol(expr) ? (context.locals.has(expr) ? buildIdentifier : buildIdleSymbol)(expr) :
  isArray(expr) ? (
    expr.length === 0 ? literal(null) :
    // TODO: type expression can provide dataType information
    // TODO: inline and simplify primitive operations based on expression dataType
    isForm(expr, 'and') ? buildLogicalForm(context, expr, 'and') :
    isForm(expr, 'or')  ? buildLogicalForm(context, expr, 'or') :
    // TODO: isForm(expr, 'not', 2) ? ensure('ShenBool', unary('!', ensure('JsBool', expr[1]))) :
    isForm(expr, 'if', 4) ? buildIf(context, expr) :
    isForm(expr, 'cond') ? buildCond(context, expr) :
    isForm(expr, 'let', 4) ? buildLet(context, expr) :
    // TODO: isForm(expr, 'do') ? buildDo(context, expr) :
    isForm(expr, 'trap-error', 3) ? buildTrap(context, expr) :
    isForm(expr, 'lambda', 3) ? buildLambda(context, [expr[1]], expr[2]) :
    isForm(expr, 'freeze', 2) ? buildLambda(context, [], expr[1]) :
    isForm(expr, 'defun', 4) ? buildDefun(context, expr) :
    // TODO: isForm(expr, 'function', 2) && !context.locals.has(expr[1]) ?
    //         ensure('Function', buildLookup('functions', nameOf(ensure('ShenBool', expr[1])))) :
    buildApp(context, expr)
  ) : raise('not a valid form');

const evalKl = (context, env, expr) =>
  Function(
    '$env',
    generate(answer(invoke(
      buildEnvAccess(context.async ? 'future' : 'settle'),
      [build(context, valueToArrayTree(expr))])))
  )(env);

exports.kl = (options = {}) => {
  // TODO: raise or return false when stream not supported?
  // TODO: have shen-script.*instream-supported*, shen-script.*outstream-supported* flags?
  const noInStream  = () => raise('input stream not supported');
  const noOutStream = () => raise('output stream not supported');
  const isInStream  = options.inInStream  || noInStream;
  const isOutStream = options.inOutStream || noOutStream;
  const asInStream  = options.isInStream  ? (x => options.isInStream(x)  ? x : raise('input stream expected'))  : noInStream;
  const asOutStream = options.isOutStream ? (x => options.isOutStream(x) ? x : raise('output stream expected')) : noOutStream;
  const isStream = x => options.isInStream(x) || options.isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || (() => new Date().getTime());
  const startTime = clock();
  const getTime = mode =>
    mode === 'unix' ? clock() :
    mode === 'run'  ? clock() - startTime :
    raise(`get-time only accepts symbols unix or run, not ${mode}`);
  const openRead  = options.openRead  || (() => raise('open(in) not supported'));
  const openWrite = options.openWrite || (() => raise('open(out) not supported'));
  const open = (mode, path) =>
    mode === 'in'  ? openRead(path) :
    mode === 'out' ? openWrite(path) :
    raise(`open only accepts symbols in or out, not ${mode}`);
  const show = x =>
    x === null    ? '[]' :
    isString(x)   ? `"${x}"` :
    isSymbol(x)   ? nameOf(x) :
    isCons(x)     ? `[${consToArray(x).map(show).join(' ')}]` :
    isFunction(x) ? `<Function ${x.name}>` :
    isArray(x)    ? `<Vector ${x.length}>` :
    isError(x)    ? `<Error "${x.message}">` :
    isStream(x)   ? `<Stream ${x.name}>` :
    `${x}`;
  const equal = (x, y) =>
    x === y
    || isCons(x) && isCons(y) && equal(x.head, y.head) && equal(x.tail, y.tail)
    || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equal(v, y[i]));
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
  const env = {
    cons, consFromArray, consToArray, consToArrayTree, valueToArray, valueToArrayTree,
    asJsBool, asShenBool, isShenBool, isShenTrue, isShenFalse,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, show, equal,
    raise, trap, bounce, settle, future, func, app, settleApp, futureApp,
    symbols, functions,
    build, evalKl
  };
  const context = Object.freeze({
    locals: new Set(),
    head:   true,
    async:  options.async
  });
  [
    ['if',              (b, x, y) => asJsBool(b) ? x : y],
    ['and',             (x, y) => asShenBool(asJsBool(x) && asJsBool(y))],
    ['or',              (x, y) => asShenBool(asJsBool(x) || asJsBool(y))],
    ['open',            (m, p) => open(nameOf(asSymbol(m)), asString(p))],
    ['close',           s => asStream(s).close()],
    ['read-byte',       s => asInStream(s).read()],
    ['write-byte',      (s, b) => asOutStream(s).write(b)],
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
    ['pos',             (s, i) => asString(s)[asNumber(i)]],
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
    ['eval-kl',         expr => evalKl(context, env, expr)]
  ].forEach(([id, f]) => functions[id] = func(id, f));
  // TODO: if primitives are defined as astring ast's,
  //       we can generate code for them for regular invoke
  //       and have the ast to do inlines with,
  //       along with dataType hints and labels
  //       can also use abstractness of ast to generate
  //       head/tail and sync/async versions of functions
  return env;
};
