/* Type mapping:
 *
 * KL Type      JS Type
 * -------      -------
 * Empty        null
 * Number       number
 * String       string
 * Symbol       Symbol
 * Function     function
 * AbsVector    array
 * Error        Error
 * Cons         Cons
 * Stream       TODO: ??????????????
 */

const produce = (proceed, render, next, state) => {
  const array = [];
  while (proceed(state)) {
    array.push(render(state));
    state = next(state);
  }
  return array;
};

const lastOf = (...xs) => xs.length === 0 ? null : xs[xs.length - 1];
const butLast = a => [a.slice(0, -1), a[a.length - 1]];
const comp = (f, g) => x => f(g(x));
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
export const isAtom     = x => isNumber(x) || isString(x) || isSymbol(x);
export const isFunction = x => typeof x === 'function';
export const isArray    = x => typeof x === 'array';
export const isError    = x => x instanceof Error;
export const isCons     = x => x instanceof Cons;
export const isStream   = x => false; // TODO: implement this

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

// TODO: general js<->shen data structure conversion

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
export const consToArrayTree = c => produce(isCons, comp(x => isCons(x) ? consToArrayTree(x) : x, head), tail, c);

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
  isStream(x)   ? `<Stream>` :
  `${x}`;

const now = () => new Date().getTime();
const startTime = now();
const getTime = mode =>
  mode === intern('unix') ? now() :
  mode === intern('run')  ? now() - startTime :
  raise('get-time only accepts symbols unix or run');



// TODO: what about async/await?
// how to combine trampoline evaluation with promise chaining?
const Trampoline = class {
  constructor(promise) {
    this.promise = promise;
  }
};

const isTrampoline = x => x instanceof Trampoline;
const runTrampoline = async x => isTrampoline(x) ? runTrampoline(await x.promise) : x;

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
const identifier = name => ({ type: 'Identifier', name });
const invoke = (callee, arguments) => ({ type: 'CallExpression', callee, arguments });
const conditional = (statement, test, consequent, alternative) => ({
  type: statement ? 'IfStatement' : 'ConditionalExpression', test, consequent, alternative
});
const logical = (operator, left, right) => ({ type: 'LogicalExpression', operator, left, right });
const attempt = (block, param, body) => ({ type: 'TryStatement', block, handler: { type: 'CatchClause', param, body } });
const block = body => ({ type: 'BlockStatement', body });
const statement = expression => ({ type: 'ExpressionStatement', expression });
const arrow = (params, body, expression = true) => ({ type: 'ArrowFunctionExpression', expression, params, body });

const but = (x, name, value) => ({ ...x, [name]: value });

const isForm = (expr, lead, length) =>
  (!length || expr.length === length || raise(`${lead} must have ${length - 1} argument forms`))
  && expr[0] === intern(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(flattenForm) : [expr];
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
      : invoke(identifier('intern'), [literal(nameOf(expr))])) :
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
          test === intern('true')  ? build(context, consequent) :
          test === intern('false') ? chain :
          conditional(
            context.statement,
            build(but(context, 'kind', 'boolean'), test),
            build(context, consequent),
            chain),
        invoke(identifier('raise'), [literal('no condition was true')])) :
    isForm(expr, 'let', 4) ? (
      // TODO: in a statement context, we can just add a declaration, maybe surround in a block
      // in an expression context, we might have to put it in an ifee, or attempt inlining
      nameOf(expr[1]) === '_' || !isReferenced(expr[1], expr[3])
        ? build(context, [intern('do'), expr[2], expr[3]])
        : statement(invoke(arrow([literal(nameOf(expr[1]))], build(context, expr[2])), [build(context, expr[3])]))) :
    isForm(expr, 'do') ? body(flattenForm(expr, 'do').map(x => build(context, x))) :
    // TODO: return butlast(exprs)
    // if do is assigned to a variable, just make last line an assignment to a variable
    isForm(expr, 'lambda', 3) ? arrow([identifier(nameOf(expr[1]))], build(context, expr[2])) :
    // TODO: check body to see if function should be a statement or expression lambda
    isForm(expr, 'freeze', 2) ? arrow([], build(context, expr[1])) :
    isForm(expr, 'trap-error', 3) ? attempt(build(context, expr[1]), identifier('E'), block([])) :
    // TODO: wrap in block statement, make it statement context
    // TODO: if handler is a lambda, just inline its body, name catch var after lambda param
    // TODO: apply handler expr[2] to E
    isForm(expr, 'defun', 4) ? (functions.set(expr[1], expr[2], build(context, expr[3])), expr[1]) :
    // TODO: set params as locals, set root function context
    null // TODO: application form
  ) : raise('not a valid form');

export const transpile = expr => build({ locals: new Set(), head: true }, consToArrayTree(expr));

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

export const symbols = globalMap('symbol');
export const functions = globalMap('function');

functions['number?']         = isNumber;
functions['string?']         = isString;
functions['symbol?']         = isSymbol;
functions['absvector?']      = isArray;
functions['cons?']           = isCons;
functions['hd']              = comp(head, asCons);
functions['tl']              = comp(tail, asCons);
functions['cons']            = cons;
functions['tlstr']           = s => asString(s).substring(1);
functions['cn']              = (s, t) => asString(s) + asString(t);
functions['string->n']       = s => asString(s).charCodeAt(0);
functions['n->string']       = comp(String.fromCharCode, asNumber);
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
functions['intern']          = comp(intern, asString);
functions['get-time']        = comp(getTime, asSymbol);
functions['type']            = (x, _) => x;
functions['simple-error']    = raise;
functions['error-to-string'] = comp(asError, x => x.message);
functions['if']              = (c, x, y) => c ? x : y; // TODO: convert to js bool
functions['and']             = (x, y) => x && y; // TODO: convert to js bool
functions['or']              = (x, y) => x || y; // TODO: convert to js bool
functions['set']             = set;
functions['value']           = value;
functions['open']            = undefined; // TODO: define these
functions['close']           = undefined; // TODO: define these
functions['read-byte']       = undefined; // TODO: define these
functions['write-byte']      = undefined; // TODO: define these

// TODO: IO operations, file system, console
