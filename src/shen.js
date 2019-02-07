/* Type mapping:
 *
 * KL Type      JS Type
 * -------      -------
 * Empty        null
 * Number       number
 * String       string
 * Symbol       symbol
 * Function     function
 * AbsVector    array
 * Error        Error
 * Cons         Cons
 * Stream       *
 */

const produce = (proceed, render, next, state) => {
  const array = [];
  while (proceed(state)) {
    array.push(render(state));
    state = next(state);
  }
  return array;
};

const butLast = a => [a.slice(0, -1), a[a.length - 1]];
const raise = x => { throw new Error(x); };

export const intern = name => Symbol.for(name);
export const nameOf = symbol => Symbol.keyFor(symbol);

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
};

export const isNull     = x => x === null;
export const isNumber   = x => isFinite(x);
export const isString   = x => typeof x === 'string';
export const isSymbol   = x => typeof x === 'symbol';
export const isFunction = x => typeof x === 'function';
export const isArray    = x => typeof x === 'array';
export const isError    = x => x instanceof Error;
export const isCons     = x => x instanceof Cons;

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

const trueSymbol = intern('true');
const falseSymbol = intern('false');

// TODO: general, recursive js<->shen data structure conversion

const asJsBool = x =>
  x === trueSymbol  ? true :
  x === falseSymbol ? false :
  raise(`value ${x} is not a valid boolean`);
const asShenBool = x => x ? trueSymbol : falseSymbol;

export const head = c => c.head;
export const tail = c => c.tail;
export const cons = (h, t) => new Cons(h, t);
export const consFromArray = a => a.reduceRight((t, h) => cons(h, t), null);
export const consToArray = c => produce(isCons, head, tail, c);
export const consToArrayTree = c => produce(isCons, x => isCons(head(x)) ? consToArrayTree(head(x)) : head(x), tail, c);

export const equate = (x, y) =>
  x === y
  || isCons(x) && isCons(y) && equate(x.head, y.head) && equate(x.tail, y.tail)
  || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equate(v, y[i]));

export const show = x =>
  isNull(x)     ? '[]' :
  isString(x)   ? `"${x}"` :
  isSymbol(x)   ? nameOf(x) :
  isCons(x)     ? `[${consToArray(x).map(show).join(' ')}]` :
  isFunction(x) ? `<Function ${x.name}>` :
  isArray(x)    ? `<Vector ${x.length}>` :
  isError(x)    ? `<Error "${x.message}">` :
  isStream(x)   ? `<Stream ${x.name}>` : // TODO: how to access isStream ?
  `${x}`;

// TODO: what about async/await?
// how to combine trampoline evaluation with promise chaining?
const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
  }
  run() {
    return this.f(...this.args);
  }
};

export const bounce = (f, ...args) => new Trampoline(f, ...args);
export const settle = async x => {
  while (true) {
    const y = await x;
    if (y instanceof Trampoline) {
      x = y.run();
    } else {
      return y;
    }
  }
};

// TODO: partial applications, curried applications

const validId = /[a-zA-Z_$][0-9a-zA-Z_$]*/;
// TODO: still need renaming logic for local variables, parameters

// NOTE:
// context.statement  // if location in target context can be a statement
// context.expression // if location in target context must be an expression
// context.return     // location is the last statement which needs to be returned
// context.assignment // expr is getting assigned to a variable
// context.head       // if context is in head position
// context.tail       // if context is in tail position
// context.locals     // Set of local variables and parameters defined at this point
// context.scopeName  // Name of enclosing function/file
// context.kind       // specific type is expected for expression, undefined if unknown

const literal = value => ({ type: 'Literal', value });
const array = elements => ({ type: 'ArrayExpression', elements });
const identifier = name => ({ type: 'Identifier', name });
const wait = argument => ({ type: 'AwaitExpression', argument });
const invoke = (callee, arguments) => wait({ type: 'CallExpression', callee, arguments });
// TODO: only wrap invocation in await if in async context

const conditional = (statement, test, consequent, alternative) =>
  ({ type: statement ? 'IfStatement' : 'ConditionalExpression', test, consequent, alternative });
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const attempt = (block, param, body) => ({ type: 'TryStatement', block, handler: { type: 'CatchClause', param, body } });
const access = (object, property) => ({ type: 'MemberExpression', computed: property.type !== 'Identifier', object, property });
const assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', left, right, operator });
const block = (statement, body) => statement ? { type: 'BlockStatement', body } : access(array(body), literal(body.length - 1));
const statement = expression => ({ type: 'ExpressionStatement', expression });
const arrow = (params, body, expression = true) => ({ type: 'ArrowFunctionExpression', async: true, expression, params, body });
// TODO: track async in context, and should async always be there for generated code?

const converters = {
  'number': 'asNumber',
  'string': 'asString'
  // TODO: etc: esp. shen bool vs js bool
};
const ensure = (kind, expr) => expr.kind === kind ? expr : invoke(identifier(converters[kind]), [expr]);

const but = (x, name, value) => ({ ...x, [name]: value });

const isForm = (expr, lead, length) =>
  (!length || expr.length === length || raise(`${lead} must have ${length - 1} argument forms`))
  && expr[0] === intern(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(x => flattenForm(x, lead)) : [expr];
const flattenLogicalForm = (context, expr, lead) =>
  flattenForm(expr, lead)
    .map(x => build(but(context, 'kind', 'boolean'), x)) // TODO: wrap in asJsBool if necessary
    .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)); // TODO: wrap in asKlBool if necessary

const isReferenced = (symbol, expr) =>
  expr === symbol
  || isArray(expr)
    && (isForm(expr, 'let', 4) && (isReferenced(symbol, expr[2]) || expr[1] !== symbol && isReferenced(symbol, expr[3]))
     || isForm(expr, 'lambda', 3) && expr[1] !== symbol && isReferenced(symbol, expr[2])
     || isForm(expr, 'defun', 4) && !expr[2].includes(symbol) && isReferenced(symbol, expr[3])
     || expr.some(x => isReferenced(symbol, x)));

const accessSymbol = symbol => access(identifier('symbols'), literal(nameOf(symbol)));

// TODO: async/await
// TODO: inlining, type-inferred optimizations

const build = (context, expr) =>
  isNull(expr) || isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (
    context.locals.has(expr)
      ? identifier(nameOf(expr)) // TODO: what if variable is not a valid identifier?
      : invoke(identifier('intern'), [literal(nameOf(expr))])) : // TODO: make sure intern is in scope
  isArray(expr) ? (
    isForm(expr, 'and') ? flattenLogicalForm(context, expr, 'and') :
    isForm(expr, 'or')  ? flattenLogicalForm(context, expr, 'or') :
    isForm(expr, 'if', 4) ?
      conditional(
        context.statement,
        build(but(context, 'kind', 'boolean'), expr[1]),
        build(context, expr[2]),
        build(context, expr[3])) :
    isForm(expr, 'cond') ?
      // TODO: if cond is in return/expression position, wrap in ReturnStatement
      expr.slice(1).reduceRight(
        (chain, [test, consequent]) =>
          test === trueSymbol ? build(context, consequent) :
          conditional(
            context.statement,
            build(but(context, 'kind', 'boolean'), test), // TODO: need 1 function that sets kind on context and does ensure()
            build(context, consequent),
            chain),
        invoke(identifier('raise'), [literal('no condition was true')])) :
    isForm(expr, 'let', 4) ? (
      // TODO: in a statement context, we can just add a declaration, maybe surround in a block
      // in an expression context, we might have to put it in an ifee, or attempt inlining
      nameOf(expr[1]) === '_' || !isReferenced(expr[1], expr[3])
        ? build(context, [intern('do'), expr[2], expr[3]]) // (let _ X Y) => (do X Y)
        : statement(invoke(arrow([literal(nameOf(expr[1]))], build(context, expr[2])), [build(context, expr[3])]))) :
    isForm(expr, 'do') ? block(context.statement, flattenForm(expr, 'do').map(x => build(context, x))) :
    // TODO: return butlast(exprs)
    // if do is assigned to a variable, just make last line an assignment to a variable
    isForm(expr, 'lambda', 3) ? arrow([identifier(nameOf(expr[1]))], build(context, expr[2])) :
    // TODO: check body to see if function should be a statement or expression lambda
    isForm(expr, 'freeze', 2) ? arrow([], build(context, expr[1])) :
    isForm(expr, 'trap-error', 3) ? (
      isForm(expr[2], 'lambda', 2)
        ? attempt(build(context, expr[1]), identifier(nameOf(expr[2][1])), build(but(context, 'statement', true), expr[2][2]))
        : attempt(build(context, expr[1]), identifier('$error'), invoke(build(context, expr[2]), [identifier('$error')]))) :
    // TODO: wrap in block statement, make it statement context
    // TODO: emit functions.set instead of doing it (how to scope it?)
    // TODO: defuns dot not capture local scope
    isForm(expr, 'defun', 4) ? (
      invoke(
        access(literal('functions'), literal('set')),
        [
          literal(nameOf(expr[1])),
          array(expr[2].map(x => identifier(nameOf(x)))),
          build(context, expr[3])
        ]),
      expr[1]) :
    // TODO: set params as locals, set root function context
    isForm(expr, 'value', 2) ? accessSymbol(expr[1]) : // TODO: make identifier if valid identifier
    // TODO: extract code for value to use in set
    isForm(expr, 'set', 3) ? assign(accessSymbol(expr[1]), build(context, expr[2])) :
    isForm(expr, 'type', 2) ? expr[1] : // TODO: tag returned expr as having type nameof(expr[2])
    null // TODO: application form
  ) : raise('not a valid form');

// TODO: transpile function needs to know if we're doing async/await
export const transpile = expr => build({ locals: new Set(), head: true }, consToArrayTree(expr));

// TODO: needs createShenEnv function that takes impls of certain IO functions
//       like fs, terminal, stinput, stoutput
//       Depending on how library is packaged or deployed, these could work very differently
//       may not need to generate async/await syntax if IO functions don't use promises

const kl = (options = {}) => {
  const asInStream  = (x => options.isInStream(x)  ? x : raise('input stream expected'))  || () => false;
  const asOutStream = (x => options.isOutStream(x) ? x : raise('output stream expected')) || () => false;
  const isStream = x => options.isInStream(x) || options.isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || () => new Date().getTime();
  const startTime = clock();
  const getTime = mode =>
    mode === intern('unix') ? clock() :
    mode === intern('run')  ? clock() - startTime :
    raise('get-time only accepts symbols unix or run');
  const openRead  = options.openRead  || () => raise('open(in) not supported');
  const openWrite = options.openWrite || () => raise('open(out) not supported');
  const open = (mode, path) =>
    mode === intern('in')  ? openRead(path) :
    mode === intern('out') ? openWrite(path) :
    raise('open only accepts symbols in or out');
  const symbols = {}; // TODO: raise error when reading undefined symbols
  symbols['*language*']         = 'JavaScript';
  symbols['*implementation*']   = options.implementation || 'Unknown';
  symbols['*release*']          = options.release        || 'Unknown';
  symbols['*os*']               = options.os             || 'Unknown';
  symbols['*port*']             = options.port           || 'Unknown';
  symbols['*porters*']          = options.porters        || 'Unknown';
  symbols['*stinput*']          = options.stinput  || () => raise('standard input not supported');
  symbols['*stoutput*']         = options.stoutput || () => raise('standard output not supported');
  symbols['*sterror*']          = options.sterror  || () => raise('standard error not supported');
  const functions = {}; // TODO: raise error when reading undefined symbols
  functions['open']             = open;
  functions['close']            = s => asStream(s).close();
  functions['read-byte']        = s => asInStream(s).read();
  functions['write-byte']       = (s, b) => asOutStream(s).write(b);
  functions['get-time']         = getTime;
  functions['number?']          = isNumber;
  functions['string?']          = isString;
  functions['symbol?']          = isSymbol;
  functions['absvector?']       = isArray;
  functions['cons?']            = isCons;
  functions['hd']               = c => head(asCons(c));
  functions['tl']               = c => tail(asCons(c));
  functions['cons']             = cons;
  functions['tlstr']            = s => asString(s).substring(1);
  functions['cn']               = (s, t) => asString(s) + asString(t);
  functions['string->n']        = s => asString(s).charCodeAt(0);
  functions['n->string']        = n => String.fromCharCode(asNumber(n));
  functions['pos']              = (s, i) => asString(s)[asNumber(i)];
  functions['str']              = show;
  functions['absvector']        = n => new Array(asNumber(n)).fill(null);
  functions['<-absvector']      = (a, i) => asArray(a)[asIndex(i, a)];
  functions['absvector->']      = (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a);
  functions['=']                = equate;
  functions['+']                = (x, y) => asNumber(x) +  asNumber(y);
  functions['-']                = (x, y) => asNumber(x) -  asNumber(y);
  functions['*']                = (x, y) => asNumber(x) *  asNumber(y);
  functions['/']                = (x, y) => asNumber(x) /  asNumber(y);
  functions['>']                = (x, y) => asNumber(x) >  asNumber(y);
  functions['<']                = (x, y) => asNumber(x) <  asNumber(y);
  functions['>=']               = (x, y) => asNumber(x) >= asNumber(y);
  functions['<=']               = (x, y) => asNumber(x) <= asNumber(y);
  functions['intern']           = s => intern(asString(s));
  functions['get-time']         = s => getTime(asSymbol(s));
  functions['type']             = (x, _) => x;
  functions['simple-error']     = s => raise(asString(s));
  functions['error-to-string']  = x => asError(x).message;
  functions['if']               = (b, x, y) => asJsBool(b) ? x : y;
  functions['and']              = (x, y) => asShenBool(asJsBool(x) && asJsBool(y));
  functions['or']               = (x, y) => asShenBool(asJsBool(x) || asJsBool(y));
  functions['set']              = (s, x) => symbols[nameOf(asSymbol(s))] = x;
  functions['value']            = s => symbols[nameOf(asSymbol(s))];
  return {
    symbols,
    functions,
    asStream,
    asInStream,
    asOutStream,
    isStream,
    isInStream,
    isOutStream
  };
};

export default kl;

// TODO: kl() ... translated code ... shen() ... shen.repl()       no constructors!
