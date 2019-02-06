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
 * Stream       Tube
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

// TODO: Tube, Source, Sink are browser-only?

const Stream = class {
  constructor(name) {
    this.name = name;
    this.closed = false;
  }
  close() {
    this.closed = true;
  }
  checkClosed() {
    if (this.closed) {
      raise(this.closedMessage);
    }
  }
  get closedMessage() {
    return `${this.constructor.name} ${this.name} has been closed`;
  }
}

const Source = class extends Tube {
  constructor(name) {
    super(name);
    this.closed = false;
    this.buffer = [];
    this.queue = [];
  }
  read() {
    this.checkClosed();
    if (this.buffer.length > 0) {
      return this.buffer.shift();
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject });
      }).then(() => this.read());
    }
  }
  supply(bytes) {
    this.checkClosed();
    this.buffer.push(...bytes);
    if (this.queue.length > 0) {
      this.queue.shift().resolve();
    }
  }
  close() {
    super.close();
    for (const receiver of queue) {
      receiver.reject(this.closedMessage);
    }
    return null;
  }
};

const Sink = class extends Tube {
  constructor(name, receiver) {
    this.name = name;
    this.receiver = receiver;
  }
  write(byte) {
    this.checkClosed();
    this.receiver(byte);
    return null;
  }
};

// TODO: this should be supplied when node/browser packaging is done
export const terminal = {
  in: new Source('terminal'),
  out: new Sink('terminal', () => {}),
  error: new Sink('terminal', () => {})
};

export const isNull     = x => x === null;
export const isNumber   = x => isFinite(x);
export const isString   = x => typeof x === 'string';
export const isSymbol   = x => typeof x === 'symbol';
export const isFunction = x => typeof x === 'function';
export const isArray    = x => typeof x === 'array';
export const isError    = x => x instanceof Error;
export const isCons     = x => x instanceof Cons;
export const isStream   = x => x instanceof Tube;

const asNumber = x => isNumber(x) ? x : raise('number expected');
const asString = x => isString(x) ? x : raise('string expected');
const asSymbol = x => isSymbol(x) ? x : raise('symbol expected');
const asArray  = x => isArray(x)  ? x : raise('array expected');
const asCons   = x => isCons(x)   ? x : raise('cons expected');
const asError  = x => isError(x)  ? x : raise('error expected');
const asStream = x => isStream(x) ? x : raise('stream expected');
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
  isStream(x)   ? `<Stream ${x.name}>` :
  `${x}`;

const now = () => new Date().getTime();
const startTime = now();
const getTime = mode =>
  mode === intern('unix') ? now() :
  mode === intern('run')  ? now() - startTime :
  raise('get-time only accepts symbols unix or run');

const globalMap = adjective => {
  const map = {};
  return {
    get: id => {
      const value = map[id];
      return value !== undefined ? value : raise(`${adjective} ${id} not defined`);
    },
    set: (id, value) => map[id] = value
  };
};

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
    isForm(expr, 'defun', 4) ? (functions.set(expr[1], expr[2], build(context, expr[3])), expr[1]) :
    // TODO: set params as locals, set root function context
    isForm(expr, 'value', 2) ? access(identifier('symbols'), literal(nameOf(expr[1]))) : // TODO: make identifier if valid identifier
    // TODO: extract code for value to use in set
    isForm(expr, 'set', 3) ? assign(access(identifier('symbols', literal(nameOf(expr[1])))), build(context, expr[2])) :
    isForm(expr, 'type', 2) ? expr[1] : // TODO: tag returned expr as having type nameof(expr[2])
    null // TODO: application form
  ) : raise('not a valid form');

// TODO: transpile function needs to know if we're doing async/await
export const transpile = expr => build({ locals: new Set(), head: true }, consToArrayTree(expr));

// TODO: needs createShenEnv function that takes impls of certain IO functions
//       like fs, terminal, stinput, stoutput
//       Depending on how library is packaged or deployed, these could work very
//       differently
//       may not need to generate async/await syntax if IO functions don't use promises

const Shen = (opts = {}) => {
  const symbols = globalMap('symbol');
  const functions = globalMap('function');
  const terminal = opts.terminal; // undefined terminal means writing does console.log and reading raises error
  terminal.in  = terminal.in  || ;
  terminal.out = terminal.out || ;
  terminal.err = terminal.err || ;
  symbols['*stinput*']         = terminal.in;
  symbols['*stoutput*']        = terminal.out;
  symbols['*sterror*']         = terminal.err;
  functions['open']            = undefined; // TODO: define these
  functions['close']           = s => asStream(s).close();
  functions['read-byte']       = s => asInStream(s).read(); // TODO: define asInStream
  functions['write-byte']      = (s, b) => asOutStream(s).write(b); // TODO: define asOutStream
  functions['number?']         = isNumber;
  functions['string?']         = isString;
  functions['symbol?']         = isSymbol;
  functions['absvector?']      = isArray;
  functions['cons?']           = isCons;
  functions['hd']              = c => head(asCons(c));
  functions['tl']              = c => tail(asCons(c));
  functions['cons']            = cons;
  functions['tlstr']           = s => asString(s).substring(1);
  functions['cn']              = (s, t) => asString(s) + asString(t);
  functions['string->n']       = s => asString(s).charCodeAt(0);
  functions['n->string']       = n => String.fromCharCode(asNumber(n));
  functions['pos']             = (s, i) => asString(s)[asNumber(i)];
  functions['str']             = show;
  functions['absvector']       = n => new Array(asNumber(n)).fill(null);
  functions['<-absvector']     = (a, i) => asArray(a)[asIndex(i, a)];
  functions['absvector->']     = (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a);
  functions['=']               = equate;
  functions['+']               = (x, y) => asNumber(x) +  asNumber(y);
  functions['-']               = (x, y) => asNumber(x) -  asNumber(y);
  functions['*']               = (x, y) => asNumber(x) *  asNumber(y);
  functions['/']               = (x, y) => asNumber(x) /  asNumber(y);
  functions['>']               = (x, y) => asNumber(x) >  asNumber(y);
  functions['<']               = (x, y) => asNumber(x) <  asNumber(y);
  functions['>=']              = (x, y) => asNumber(x) >= asNumber(y);
  functions['<=']              = (x, y) => asNumber(x) <= asNumber(y);
  functions['intern']          = s => intern(asString(s));
  functions['get-time']        = s => getTime(asSymbol(s));
  functions['type']            = (x, _) => x;
  functions['simple-error']    = s => raise(asString(s));
  functions['error-to-string'] = x => asError(x).message;
  functions['if']              = (b, x, y) => asJsBool(b) ? x : y;
  functions['and']             = (x, y) => asShenBool(asJsBool(x) && asJsBool(y));
  functions['or']              = (x, y) => asShenBool(asJsBool(x) || asJsBool(y));
  functions['set']             = (s, x) => symbols.set(nameOf(asSymbol(s)), x);
  functions['value']           = s => symbols.get(nameOf(asSymbol(s)), x);
  const fileSystem = opts.fileSystem; // undefined filesystem means opening files raises error
  const useAsync = opts.useAsync; // async defaults to false, especially if terminal and filesystem opts are undefined
  const clock = opts.clock || () => new Date().getDate();
  const port = opts.port || 'Unknown';
  const porters = opts.porters || 'Unknown';
  const version = opts.version || 'Unknown';
  const implementation = opts.implementation || 'Unknown';
  const release = opts.release || 'Unknown';
  const os = opts.os || 'Unknown';
  return {
    symbols,
    functions,
    terminal,
    fileSystem,
    clock,
    port,
    porters,
    version,
    implementation,
    release,
    os
  };
};

export default Shen;

// TODO: kl() ... translated code ... shen() ... shen.repl()
//       no constructors!
