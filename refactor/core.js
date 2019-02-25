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

const produce = (proceed, render, next, state) => {
  const array = [];
  while (proceed(state)) {
    array.push(render(state));
    state = next(state);
  }
  return array;
};

const flatMap = [].flatMap ? ((f, xs) => xs.flatMap(f)) : ((f, xs) => [].concat(...xs.map(f)));

const nop = x => x;
const raise = x => { throw new Error(x); };
const nameOf = symbol => Symbol.keyFor(symbol);
const symbolOf = name => Symbol.for(name);
const shenTrue = symbolOf('true');
const shenFalse = symbolOf('false');

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

const isNull     = x => x === null;
const isNumber   = x => typeof x === 'number' && isFinite(x);
const isString   = x => typeof x === 'string';
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => Array.isArray(x);
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons;

const cons = (h, t) => new Cons(h, t);
const consFromArray = a => a.reduceRight((t, h) => cons(h, t), null);
const consToArray = c => produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);
const valueToArray = x => isCons(x) ? consToArray(x) : x;
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x;

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
const statement = expression => ({ type: 'ExpressionStatement', expression });
const answer = argument => ({ type: 'ReturnStatement', argument });
const sequential = (body, statement = false) => statement ? { type: 'BlockStatement', body } : { type: 'SequenceExpression', expressions: body };
const arrow = (params, body, expression = true, async = false) => ({ type: 'ArrowFunctionExpression', async, expression, params, body });
const invoke = (callee, arguments, async = false) => (async ? wait : nop)({ type: 'CallExpression', callee, arguments });
const conditional = (test, consequent, alternate, statement = false) => ({ type: statement ? 'IfStatement' : 'ConditionalExpression', test, consequent, alternate });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const iife = expr => invoke(arrow([], sequential([expr], true)), []);
const attempt = (block, param, body, statement = false, result = true) => (statement ? nop : iife)({ type: 'TryStatement', block: sequential([(result ? answer : nop)(block)], true), handler: { type: 'CatchClause', param, body: sequential([(result ? answer : nop)(body)], true) } });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });

const butLocals = (x, locals) => ({ ...x, locals: new Set(locals) });
const addLocals = (x, locals) => ({ ...x, locals: new Set([...x.locals, ...locals]) });
const ensure = (kind, expr) => expr.kind === kind ? expr : invoke(buildEnvAccess('as' + kind), [expr]);

const inStatement = x => ({ ...x, statement: true, expression: false });
const inExpression = x => ({ ...x, statement: false, expression: true });
const inReturn = x => ({ ...x, statement: false, expression: true, return0: true });
const inHead = x => ({ ...x, head: true, tail: false });
const inTail = x => ({ ...x, head: false, tail: true });
const inKind = (kind, x) => ({ ...x, kind });

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

/* statement    if location in target context can be a statement               *
 * expression   if location in target context must be an expression            *
 * async        transpiler should generate async/await syntax                  *
 * return       location is the last statement which needs to be returned      *
 * ignore       result of computing expression won't be used                   *
 * assignment   expr is getting assigned to a variable                         *
 * head         if context is in head position                                 *
 * tail         if context is in tail position                                 *
 * locals       Set of local variables and parameters defined at this point    *
 * scope        Name of enclosing function/file                                *
 * genus        specific type is expected for expression, undefined if unknown */

// TODO: inlining, type-inferred optimizations
//       context.genus signals expected, ast.genus signals actual
// TODO: handle statement contexts, consider child statement contexts to avoid iife's
// TODO: bound/settle based on head/tail position
// TOOD: async/await

const buildEnvAccess = namespace => access(identifier('$env'), identifier(namespace));
const buildIdentifier = s => identifier(nameOf(s).split('').map(escapeCharacter).join(''));
const buildIdleSymbol = s => invoke(buildEnvAccess('symbolOf'), [literal(nameOf(s))]);
const buildLookup = (namespace, name) => access(buildEnvAccess(namespace), (validIdentifier(name) ? identifier : literal)(name));
const buildKind = (kind, context, expr) => ensure(kind, build(inKind(kind, context), expr));
const buildLogicalForm = (context, expr, lead) =>
  ensure(
    'ShenBool',
    flattenForm(expr, lead)
      .map(x => ensure('JsBool', build(inHead(inKind('JsBool', context)), x)))
      .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)));
const buildIf = (context, [_, test, consequent, alternate]) =>
  test === shenTrue  ? build(context, consequent) :
  test === shenFalse ? build(context, alternate) :
  conditional(
    buildKind('JsBool', inHead(inExpression(context)), test),
    build(inTail(context), consequent),
    build(inTail(context), alternate),
    context.statement);
const buildCond = (context, [_, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [symbolOf('if'), test, consequent, alternate],
    [symbolOf('simple-error'), 'no condition was true']));
const buildLet = (context, [_, id, value, body]) =>
  // TODO: use const variable declaration as statement context
  // TODO: just make it a (do ...) if variable doesn't get used
  invoke(
    arrow([buildIdentifier(id)], build(addLocals(context, [asSymbol(id)]), body)),
    [build(inHead(inExpression(context)), value)]);
// TODO: turn (do ...) into a series of statments with return if needed
// TODO: if do is assigned to a variable, just make last line an assignment to that variable
const buildDo = (context, [_, ...exprs]) => sequential(exprs);
const buildTrap = (context, [_, body, handler]) =>
  // TODO: simplify code where handler is a lambda
  attempt(build(context, body), identifier('$error'), invoke(build(inTail(context), handler), [identifier('$error')]));
const buildLambda = (context, paramz, body) =>
  // TODO: bodies of lambda and freeze aren't necessarily expressions or statements
  // TODO: turn lambda into zero-arg function if argument doesn't get used (but still label as having arity 1)
  // TODO: group nested lambdas into single 2+ arity function? ex. (lambda X (lambda Y Q)) ==> (lambda (X Y) Q)
  arrow(paramz.map(buildIdentifier), build(addLocals(context, paramz.map(asSymbol)), body));
const buildDefun = (context, [_, id, paramz, body]) =>
  // TODO: simplify when defun is at top level (don't return anything)
  sequential([
    assign(
      buildLookup('functions', nameOf(id)),
      invoke(buildEnvAccess('func'), [
        arrow(
          paramz.map(buildIdentifier),
          build(butLocals(inTail(context), paramz.map(x => asSymbol(x))), body)),
        literal(nameOf(id))])),
    buildIdleSymbol(id)]);
const buildApp = (context, [f, ...args]) =>
  invoke(buildEnvAccess(context.tail ? 'bounce' : context.async ? 'futureApp' : 'settleApp'), [
    isArray(f)            ? invoke(buildEnvAccess('asFunction'), [build(inExpression(context), f)]) :
    context.locals.has(f) ? invoke(buildEnvAccess('asFunction'), [buildIdentifier(f)]) :
    isSymbol(f)           ? buildLookup('functions', nameOf(f)) :
    raise('not a valid application form'),
    array(args.map(x => build(inExpression(context), x)))]);
const build = (context, expr) =>
  isNull(expr) || isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (context.locals.has(expr) ? buildIdentifier : buildIdleSymbol)(expr) :
  isArray(expr) ? (
    expr.length === 0 ? literal(null) :
    isForm(expr, 'and') ? buildLogicalForm(context, expr, 'and') :
    isForm(expr, 'or')  ? buildLogicalForm(context, expr, 'or') :
    isForm(expr, 'if', 4) ? buildIf(context, expr) :
    isForm(expr, 'cond') ? buildCond(context, expr) :
    isForm(expr, 'let', 4) ? buildLet(context, expr) :
    isForm(expr, 'do') ? buildDo(context, expr) :
    isForm(expr, 'trap-error', 3) ? buildTrap(context, expr) :
    isForm(expr, 'lambda', 3) ? buildLambda(context, [expr[1]], expr[2]) :
    isForm(expr, 'freeze', 2) ? buildLambda(context, [], expr[1]) :
    isForm(expr, 'defun', 4) ? buildDefun(context, expr) :
    // TODO: type expression can provide genus information
    // TODO: inline and simplify primitive operations based on expression genus
    buildApp(context, expr)
  ) : raise('not a valid form');

const evalKl = (context, env, expr) =>
  Function(
    '$env',
    generate(answer(invoke(
      buildEnvAccess(context.async ? 'future' : 'settle'),
      [build(context, valueToArrayTree(expr))])))
  )(env);

const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');
const asFunction = x => isFunction(x) ? x : raise('function expected');
const asArray    = x => isArray(x)    ? x : raise('array expected');
const asCons     = x => isCons(x)     ? x : raise('cons expected');
const asError    = x => isError(x)    ? x : raise('error expected');
const asIndex    = (i, a) =>
  !Number.isInteger(i)   ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with bounds of array length ${a.length}`) :
  i;

const isShenTrue  = x => x === shenTrue;
const isShenFalse = x => x === shenFalse;
const isShenBool  = x => x === shenTrue || x === shenFalse;
const asShenBool  = x => x ? shenTrue : shenFalse;
const asJsBool    = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise(`value ${x} is not a valid boolean`);

// TODO: kl() ... translated code ... shen() ... shen.repl()
exports.kl = (options = {}) => {
  const isInStream  = options.inInStream  || (() => false);
  const isOutStream = options.inOutStream || (() => false);
  const asInStream  = x => options.isInStream  && (options.isInStream(x)  ? x : raise('input stream expected'));
  const asOutStream = x => options.isOutStream && (options.isOutStream(x) ? x : raise('output stream expected'));
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
    isNull(x)     ? '[]' :
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
    bounce, settle, future, func, app,
    symbols, functions,
    build, evalKl
  };
  const context = Object.freeze({
    locals: new Set(),
    head: true,
    expression: true,
    async: options.async
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
  return env;
};
