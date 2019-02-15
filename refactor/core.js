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
    return this.args ? this.f(...this.args) : this.f();
  }
};

const isNull     = x => x === null;
const isNumber   = x => isFinite(x);
const isString   = x => typeof x === 'string';
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => typeof x === 'array';
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons;

const cons = (h, t) => new Cons(h, t);
const consFromArray = a => a.reduceRight((t, h) => cons(h, t), null);
const consToArray = c => produce(isCons, c => c.head, c => c.tail, c);
const valueToArrayTree = x => isCons(x) ? consToArrayTree(x) : x;
const consToArrayTree = c => produce(isCons, c => valueToArrayTree(c.head), c => c.tail, c);

const bounce = (f, ...args) => new Trampoline(f, ...args);
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

const func = (f, arity, id) => Object.assign(f, {
  arity: arity !== undefined ? arity : f.length,
  id: id !== undefined ? id : f.name
});

const app = (f, args) =>
  f.arity === undefined || f.arity === args.length ? f(...args) :
  f.arity > args.length ? app(f(...args.slice(0, f.arity)), args.slice(f.arity)) :
  func((...more) => app(f, [...args, ...more]), args.length - f.arity);

const literal = value => ({ type: 'Literal', value });
const array = elements => ({ type: 'ArrayExpression', elements });
const identifier = name => ({ type: 'Identifier', name });
const wait = argument => ({ type: 'AwaitExpression', argument });
const spread = argument => ({ type: 'SpreadElement', argument });
const assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', left, right, operator });
const statement = expression => ({ type: 'ExpressionStatement', expression });
const answer = argument => ({ type: 'ReturnStatement', argument });
const block = (body, statement = false) => statement ? { type: 'BlockStatement', body } : { type: 'SequenceExpression', expressions: body };
const arrow = (params, body, expression = true, async = false) => ({ type: 'ArrowFunctionExpression', async, expression, params, body });
const invoke = (callee, arguments, async = false) => (async ? wait : nop)({ type: 'CallExpression', callee, arguments });
const conditional = (test, consequent, alternative, statement = false) => ({ type: statement ? 'IfStatement' : 'ConditionalExpression', test, consequent, alternative });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const iife = expr => invoke(arrow([], block([expr], true)), []);
const attempt = (block, param, body, statement = false) => (statement ? nop : iife)({ type: 'TryStatement', block, handler: { type: 'CatchClause', param, body } });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });

const tag = (x, name, value) => (x[name] = value, x);
const but = (x, name, value) => ({ ...x, [name]: value });
const butLocals = (x, locals) => ({ ...x, locals });
const addLocals = (x, locals) => ({ ...x, locals: [...x.locals, ...locals] });
const ensure = (kind, expr) => expr.kind === kind ? expr : invoke(identifier('as' + kind), [expr]);

const inStatement = x => ({ ...x, statement: true, expression: false });
const inExpression = x => ({ ...x, statement: false, expression: true });
const inReturn = x => ({ ...x, statement: false, expression: true, return0: true });
const inHead = x => ({ ...x, head: true, tail: false });
const inTail = x => ({ ...x, head: false, tail: true });
const inKind = (kind, x) => ({ ...x, kind });

const isForm = (expr, lead, length) =>
  (!length || expr.length === length || raise(`${lead} must have ${length - 1} argument forms`))
  && expr[0] === symbolOf(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(x => flattenForm(x, lead)) : [expr];
const flattenLogicalForm = (context, expr, lead) =>
  ensure(
    'ShenBool',
    flattenForm(expr, lead)
      .map(x => ensure('JsBool', build(inHead(inKind('JsBool', context)), x)))
      .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)));

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
 * assignment   expr is getting assigned to a variable                         *
 * head         if context is in head position                                 *
 * tail         if context is in tail position                                 *
 * locals       Set of local variables and parameters defined at this point    *
 * scopeName    Name of enclosing function/file                                *
 * kind         specific type is expected for expression, undefined if unknown */

// TODO: inlining, type-inferred optimizations
//       context.kind signals expected, ast.kind signals actual

const buildKlAccess = namespace => access(identifier('$kl'), identifier(namespace));
const buildIdentifier = s => identifier(nameOf(s).split('').map(escapeCharacter).join(''));
const buildIdleSymbol = symbol => invoke(buildKlAccess('symbolOf'), [literal(nameof(symbol))]);
const buildLookup = (namespace, name) => access(buildKlAccess(namespace), (validIdentifier(name) ? identifier : literal)(name));
const buildKind = (kind, context, expr) => ensure(kind, build(inKind(kind, context), expr));
const build = (context, expr) =>
  isNull(expr) || isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (context.locals.includes(expr) ? buildIdentifier : buildIdleSymbol)(expr) :
  isArray(expr) ? (
    expr.length === 0 ? null :
    isForm(expr, 'and') ? flattenLogicalForm(context, expr, 'and') :
    isForm(expr, 'or')  ? flattenLogicalForm(context, expr, 'or') :
    isForm(expr, 'if', 4) ?
      conditional(
        buildKind('JsBool', inHead(context), expr[1]),
        build(inTail(context), expr[2]),
        build(inTail(context), expr[3]),
        context.statement) :
    isForm(expr, 'cond') ?
      // TODO: if cond is in return/expression position, wrap in ReturnStatement
      expr.slice(1).reduceRight(
        (chain, [test, consequent]) =>
          test === shenTrue ? build(context, consequent) :
          conditional(
            buildKind('JsBool', inHead(context), test),
            build(context, consequent),
            chain,
            context.statement),
        invoke(buildKlAccess('raise'), [literal('no condition was true')])) :
    isForm(expr, 'let', 4) ?
      // TODO: in a statement context, we can just add a declaration, maybe surround in a block
      // in an expression context, we might have to put it in an ifee, or attempt inlining
      //nameOf(expr[1]) === '_' || !isReferenced(expr[1], expr[3])
        //? build(context, [symbolOf('do'), expr[2], expr[3]]) // (let _ X Y) => (do X Y)
        // TODO: do an actual const declaration
        //: statement(invoke(
      invoke(
        arrow([identifier(nameOf(expr[1]))], build(inHead(context), expr[2])),
        [build(addLocals(context, [expr[1]]), expr[3])]) :
    //isForm(expr, 'do') ? block(flattenForm(expr, 'do').map(x => build(context, x)), context.statement) :
    // TODO: return butlast(exprs)
    // TODO: if do is assigned to a variable, just make last line an assignment to a variable
    isForm(expr, 'lambda', 3) ? arrow([identifier(nameOf(expr[1]))], build(addLocals(context, [expr[1]]), expr[2])) :
    // TODO: check body to see if function should be a statement or expression lambda
    isForm(expr, 'freeze', 2) ? arrow([], build(context, expr[1])) :
    // TODO: wrap in block statement, make it statement context
    isForm(expr, 'trap-error', 3) ?
      //isForm(expr, 'lambda', 2)
        //? attempt(build(context, expr[1]), identifier(nameOf(expr[2][1])), build(inStatement(context), expr[2][2]))
        //: 
      attempt(build(context, expr[1]), identifier('$error'), invoke(build(context, expr[2]), [identifier('$error')])) :
    isForm(expr, 'defun', 4) ?
      block([
        assign(
          buildLookup('functions', nameOf(expr[1])),
          arrow(expr[2].map(buildIdentifier), build(butLocals(inTail(context), expr[2].map(x => nameOf(x))), expr[3]))),
        buildIdleSymbol(expr[1])]) :
    // TODO: value and set can be done as inlines
    // TODO: extract code for value to use in set
    //isForm(expr, 'value', 2) ? buildLookup('symbols', nameOf(expr[1])) :
    //isForm(expr, 'set', 3) ? assign(buildLookup('symbols', nameOf(expr[1])), build(context, expr[2])) :
    // TODO: tag returned expr as having type nameof(expr[2])
    //isForm(expr, 'type', 2) ? expr[1] :
    // TODO: check inlines here
    // TODO: bounce applications in tail position, settle applications in head position
    context.locals.includes(expr[0]) ? invoke(identifier(nameOf(expr[0])), expr.slice(1).map(x => build(context, x))) :
    isSymbol(expr[0]) ? invoke(buildLookup('functions', nameOf(expr[0])), expr.slice(1).map(x => build(context, x))) :
    raise('not a valid form')
  ) : raise('not a valid form');

const asNumber = x => isNumber(x) ? x : raise('number expected');
const asString = x => isString(x) ? x : raise('string expected');
const asSymbol = x => isSymbol(x) ? x : raise('symbol expected');
const asArray  = x => isArray(x)  ? x : raise('array expected');
const asCons   = x => isCons(x)   ? x : raise('cons expected');
const asError  = x => isError(x)  ? x : raise('error expected');
const asIndex  = (i, a) =>
  !Natural.isInteger(i)  ? raise(`index ${i} is not valid`) :
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

const jsToShen = x =>
  isArray(x)      ? x.map(jsToShen) :
  isCons(x)       ? cons(jsToShen(x.head), jsToShen(x.tail)) :
  x === undefined ? null :
  x === shenTrue  ? true :
  x === shenFalse ? false :
  x;
const shenToJs = x =>
  isArray(x)  ? x.map(shenToJs) :
  isCons(x)   ? cons(shenToJs(x.head), shenToJs(x.tail)) :
  x === true  ? shenTrue :
  x === false ? shenFalse :
  x;

// TODO: kl() ... translated code ... shen() ... shen.repl()

exports.kl = (options = {}) => {
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
  const functions = {
    'if':              (b, x, y) => asJsBool(b) ? x : y,
    'and':             (x, y) => asShenBool(asJsBool(x) && asJsBool(y)),
    'or':              (x, y) => asShenBool(asJsBool(x) || asJsBool(y)),
    'open':            (m, p) => open(nameOf(asSymbol(m)), asString(p)),
    'close':           s => asStream(s).close(),
    'read-byte':       s => asInStream(s).read(),
    'write-byte':      (s, b) => asOutStream(s).write(b),
    'number?':         x => asShenBool(isNumber(x)),
    'string?':         x => asShenBool(isString(x)),
    'symbol?':         x => asShenBool(isSymbol(x)),
    'absvector?':      x => asShenBool(isArray(x)),
    'cons?':           x => asShenBool(isCons(x)),
    'hd':              c => asCons(c).head,
    'tl':              c => asCons(c).tail,
    'cons':            cons,
    'tlstr':           s => asString(s).substring(1),
    'cn':              (s, t) => asString(s) + asString(t),
    'string->n':       s => asString(s).charCodeAt(0),
    'n->string':       n => String.fromCharCode(asNumber(n)),
    'pos':             (s, i) => asString(s)[asNumber(i)],
    'str':             show,
    'absvector':       n => new Array(asNumber(n)).fill(null),
    '<-address':       (a, i) => asArray(a)[asIndex(i, a)],
    'address->':       (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a),
    '+':               (x, y) => asNumber(x) + asNumber(y),
    '-':               (x, y) => asNumber(x) - asNumber(y),
    '*':               (x, y) => asNumber(x) * asNumber(y),
    '/':               (x, y) => asNumber(x) / asNumber(y),
    '>':               (x, y) => asShenBool(asNumber(x) >  asNumber(y)),
    '<':               (x, y) => asShenBool(asNumber(x) <  asNumber(y)),
    '>=':              (x, y) => asShenBool(asNumber(x) >= asNumber(y)),
    '<=':              (x, y) => asShenBool(asNumber(x) <= asNumber(y)),
    '=':               (x, y) => asShenBool(equal(x, y)),
    'intern':          s => symbolOf(asString(s)),
    'get-time':        m => getTime(nameOf(asSymbol(m))),
    'simple-error':    s => raise(asString(s)),
    'error-to-string': e => asError(e).message,
    'set':             (s, x) => symbols[nameOf(asSymbol(s))] = x,
    'value':           s => symbols[nameOf(asSymbol(s))],
    'type':            (x, _) => x
  };
  const kl = {
    cons, consFromArray, consToArray, consToArrayTree,
    asJsBool, asShenBool, isShenBool, isShenTrue, isShenFalse,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, show, equal,
    bounce, settle, future, func, app,
    symbols, functions
  };
  const context = Object.freeze({
    locals: new Set(),
    head: true,
    expression: true,
    async: options.async
  });
  kl.functions['eval-kl'] = expr => Function('$kl', generate(answer(build(context, consToArrayTree(expr)))))(kl);
  return kl;
};
