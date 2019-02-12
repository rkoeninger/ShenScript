import { generate } from 'astring'

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

const raise = x => { throw new Error(x); };
const nameOf = symbol => Symbol.keyFor(symbol);
const intern = name => Symbol.for(name);
const shenTrue = intern('true');
const shenFalse = intern('false');

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

const head = c => c.head;
const tail = c => c.tail;
const cons = (h, t) => new Cons(h, t);
const consFromArray = a => a.reduceRight((t, h) => cons(h, t), null);
const consToArray = c => produce(isCons, head, tail, c);
const valueToArrayTree = x => isCons(head(x)) ? consToArrayTree(head(x)) : head(x);
const consToArrayTree = c => produce(isCons, valueToArrayTree, tail, c);

const bounce = (f, ...args) => new Trampoline(f, ...args);
const settle = x => {
  while (x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};
const settleAsync = async x => {
  while (true) {
    const y = await x;
    if (y instanceof Trampoline) {
      x = y.run();
    } else {
      return y;
    }
  }
};

const func = (f, arity, identifier) => Object.assign(f, {
  arity: arity !== undefined ? arity : f.length,
  identifier: identifier !== undefined ? identifier : f.name
});

const app = (f, args) =>
  f.arity === undefined || f.arity === args.length ? f(...args) :
  f.arity > args.length ? app(f(...args.slice(0, f.arity)), args.slice(f.arity)) :
  func((...more) => app(f, [...args, ...more]), args.length - f.arity);

/* statement    if location in target context can be a statement               *
 * expression   if location in target context must be an expression            *
 * return       location is the last statement which needs to be returned      *
 * assignment   expr is getting assigned to a variable                         *
 * head         if context is in head position                                 *
 * tail         if context is in tail position                                 *
 * locals       Set of local variables and parameters defined at this point    *
 * scopeName    Name of enclosing function/file                                *
 * kind         specific type is expected for expression, undefined if unknown */

const literal = value => ({ type: 'Literal', value });
const array = elements => ({ type: 'ArrayExpression', elements });
const identifier = name => ({ type: 'Identifier', name });
const wait = argument => ({ type: 'AwaitExpression', argument });
const spread = argument => ({ type: 'SpreadElement', argument });
const invoke = (callee, arguments) => wait({ type: 'CallExpression', callee, arguments });
// TODO: only wrap invocation in await if in async context

const conditional = (statement, test, consequent, alternative) =>
  ({ type: statement ? 'IfStatement' : 'ConditionalExpression', test, consequent, alternative });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const attempt = (block, param, body) => ({ type: 'TryStatement', block, handler: { type: 'CatchClause', param, body } });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });
const assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', left, right, operator });
const block = (statement, body) => statement ? { type: 'BlockStatement', body } : { type: 'SequenceExpression', expressions: body };
const statement = expression => ({ type: 'ExpressionStatement', expression });
const arrow = (params, body, expression = true) => ({ type: 'ArrowFunctionExpression', async: true, expression, params, body });
// TODO: track async in context, and should async always be there for generated code?

const ensure = (kind, expr) => expr.kind === kind ? expr : invoke(identifier('as' + kind), [expr]);

const but = (x, name, value) => ({ ...x, [name]: value });
const withLocals = (x, locals) => ({ ...x, locals: [...x.locals, ...locals] });

const isForm = (expr, lead, length) =>
  (!length || expr.length === length || raise(`${lead} must have ${length - 1} argument forms`))
  && expr[0] === intern(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(x => flattenForm(x, lead)) : [expr];
const flattenLogicalForm = (context, expr, lead) =>
  flattenForm(expr, lead)
    .map(x => build(but(context, 'kind', 'JsBool'), x)) // TODO: wrap in asJsBool if necessary
    .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)); // TODO: wrap in asKlBool if necessary

const isReferenced = (symbol, expr) =>
  expr === symbol
  || isArray(expr)
    && (isForm(expr, 'let', 4) && (isReferenced(symbol, expr[2]) || expr[1] !== symbol && isReferenced(symbol, expr[3]))
     || isForm(expr, 'lambda', 3) && expr[1] !== symbol && isReferenced(symbol, expr[2])
     || isForm(expr, 'defun', 4) && !expr[2].includes(symbol) && isReferenced(symbol, expr[3])
     || expr.some(x => isReferenced(symbol, x)));

const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);

const validCharacter = ch => ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z' || ch >= 0 && ch <= 9 || ch === '_' || ch === '$';
const validCharactersRegex = /[_$A-Za-z][_$A-Za-z0-9]*/;
const validIdentifier = s => validCharactersRegex.test(s);
const escapeCharacter = ch => validCharacter(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeIdentifier = s => identifier(s.split('').map(escapeCharacter).join(''));

const idleSymbol = symbol => invoke(identifier('intern'), [literal(nameof(symbol))]);

const lookup = (namespace, name) => access(identifier(namespace), validIdentifier(name) ? identifier(name) : literal(name));

// TODO: async/await
// TODO: inlining, type-inferred optimizations

const build = (context, expr) =>
  isNull(expr) || isNumber(expr) || isString(expr) ? literal(expr) :
  expr === shenTrue  ? identifier('shenTrue') :
  expr === shenFalse ? identifier('shenFalse') :
  isSymbol(expr) ? (context.locals.includes(expr) ? escapeIdentifier(nameOf(expr)) : idleSymbol(expr)) :
  isArray(expr) ? (
    isForm(expr, 'and') ? flattenLogicalForm(context, expr, 'and') :
    isForm(expr, 'or')  ? flattenLogicalForm(context, expr, 'or') :
    isForm(expr, 'if', 4) ?
      conditional(
        context.statement,
        build(but(context, 'kind', 'JsBool'), expr[1]),
        build(context, expr[2]),
        build(context, expr[3])) :
    isForm(expr, 'cond') ?
      // TODO: if cond is in return/expression position, wrap in ReturnStatement
      expr.slice(1).reduceRight(
        (chain, [test, consequent]) =>
          test === shenTrue ? build(context, consequent) :
          conditional(
            context.statement,
            build(but(context, 'kind', 'JsBool'), test), // TODO: need 1 function that sets kind on context and does ensure()
            build(context, consequent),
            chain),
        invoke(identifier('raise'), [literal('no condition was true')])) :
    isForm(expr, 'let', 4) ? (
      // TODO: in a statement context, we can just add a declaration, maybe surround in a block
      // in an expression context, we might have to put it in an ifee, or attempt inlining
      nameOf(expr[1]) === '_' || !isReferenced(expr[1], expr[3])
        ? build(context, [intern('do'), expr[2], expr[3]]) // (let _ X Y) => (do X Y)
        : statement(invoke(arrow([identifier(nameOf(expr[1]))], build(context, expr[2])), [build(context, expr[3])]))) :
    isForm(expr, 'do') ? block(context.statement, flattenForm(expr, 'do').map(x => build(context, x))) :
    // TODO: return butlast(exprs)
    // if do is assigned to a variable, just make last line an assignment to a variable
    isForm(expr, 'lambda', 3) ? arrow([identifier(nameOf(expr[1]))], build(context, expr[2])) :
    // TODO: check body to see if function should be a statement or expression lambda
    isForm(expr, 'freeze', 2) ? arrow([], build(context, expr[1])) :
    // TODO: wrap in block statement, make it statement context
    isForm(expr, 'trap-error', 3) ? (
      isForm(expr[2], 'lambda', 2)
        ? attempt(build(context, expr[1]), identifier(nameOf(expr[2][1])), build(but(context, 'statement', true), expr[2][2]))
        : attempt(build(context, expr[1]), identifier('$error'), invoke(build(context, expr[2]), [identifier('$error')]))) :
    isForm(expr, 'defun', 4) ?
      block(
        false,
        [
          assign(
            lookup('functions', nameOf(expr[1])),
            arrow(
              expr[2].map(nameOf).map(escapeIdentifier),
              build(but(context, 'locals', expr[2].map(x => nameOf(x))), expr[3]))),
          idleSymbol(expr[1])
        ]) :
    // TODO: value and set can be done as inlines
    // TODO: extract code for value to use in set
    isForm(expr, 'value', 2) ? lookup('symbols', nameOf(expr[1])) :
    isForm(expr, 'set', 3) ? assign(lookup('symbols', nameOf(expr[1])), build(context, expr[2])) :
    // TODO: tag returned expr as having type nameof(expr[2])
    isForm(expr, 'type', 2) ? expr[1] :
    // TODO: check inlines here
    context.locals.includes(expr[0]) ? invoke(identifier(nameOf(expr[0])), expr.slice(1).map(x => build(context, x))) :
    isSymbol(expr[0]) ? invoke(lookup('functions', nameOf(expr[0])), expr.slice(1).map(x => build(context, x))) :
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

// TODO: general, recursive js<->shen data structure conversion

const asJsBool = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise(`value ${x} is not a valid boolean`);
const asShenBool = x => x ? shenTrue : shenFalse;

const isShenBool  = x => x === shenTrue || x === shenFalse;
const isShenTrue  = x => x === shenTrue;
const isShenFalse = x => x === shenFalse;

// TODO: include all functions needed by generated code in the object returned by kl
// TODO: kl() ... translated code ... shen() ... shen.repl()       no constructors!

export default (options = {}) => {
  const asInStream  = x => options.isInStream  && (options.isInStream(x)  ? x : raise('input stream expected'));
  const asOutStream = x => options.isOutStream && (options.isOutStream(x) ? x : raise('output stream expected'));
  const isStream = x => options.isInStream(x) || options.isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || () => new Date().getTime();
  const startTime = clock();
  const getTime = mode =>
    mode === 'unix' ? clock() :
    mode === 'run'  ? clock() - startTime :
    raise(`get-time only accepts symbols unix or run, not ${mode}`);
  const openRead  = options.openRead  || () => raise('open(in) not supported');
  const openWrite = options.openWrite || () => raise('open(out) not supported');
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
  const equate = (x, y) =>
    x === y
    || isCons(x) && isCons(y) && equate(x.head, y.head) && equate(x.tail, y.tail)
    || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equate(v, y[i]));
  const symbols = {
    '*language*':       'JavaScript',
    '*implementation*': options.implementation || 'Unknown',
    '*release*':        options.release        || 'Unknown',
    '*os*':             options.os             || 'Unknown',
    '*port*':           options.port           || 'Unknown',
    '*porters*':        options.porters        || 'Unknown',
    '*stinput*':        options.stinput        || () => raise('standard input not supported'),
    '*stoutput*':       options.stoutput       || () => raise('standard output not supported'),
    '*sterror*':        options.sterror        || () => raise('standard error not supported'),
    '*home-directory*': options.homeDirectory  || '';
  };
  const context = Object.freeze({
    locals: new Set(),
    head: true,
    useAsync: options.useAsync
  });
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
    '<-absvector':     (a, i) => asArray(a)[asIndex(i, a)],
    'absvector->':     (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a),
    '+':               (x, y) => asNumber(x) + asNumber(y),
    '-':               (x, y) => asNumber(x) - asNumber(y),
    '*':               (x, y) => asNumber(x) * asNumber(y),
    '/':               (x, y) => asNumber(x) / asNumber(y),
    '>':               (x, y) => asShenBool(asNumber(x) >  asNumber(y)),
    '<':               (x, y) => asShenBool(asNumber(x) <  asNumber(y)),
    '>=':              (x, y) => asShenBool(asNumber(x) >= asNumber(y)),
    '<=':              (x, y) => asShenBool(asNumber(x) <= asNumber(y)),
    '=':               (x, y) => asShenBool(equate(x, y)),
    'intern':          s => intern(asString(s)),
    'get-time':        m => getTime(nameOf(asSymbol(m))),
    'simple-error':    s => raise(asString(s)),
    'error-to-string': e => asError(e).message,
    'set':             (s, x) => symbols[nameOf(asSymbol(s))] = x,
    'value':           s => symbols[nameOf(asSymbol(s))],
    'type':            (x, _) => x,
    'eval-kl':         x => eval(generate(build(context, consToArrayTree(expr))))
    // TODO: use new Function() instead of eval? (also maintains proper scoping)
  };
  return {
    cons, consFromArray, consToArray, consToArrayTree,
    asJsBool, asShenBool, isShenBool, isShenTrue, isShenFalse, isNull,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    intern, nameOf, show, equate,
    bounce, settle, settleAsync, func, app,
    symbols, functions
  };
};
