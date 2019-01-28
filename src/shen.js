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

const symbolMap = new Map();
const functionMap = new Map();
const getOrRaise = (map, id, adjective) => map.has(id) ? map.get(id) : raise(`${adjective} ${show(id)} not defined`);

export const symbols = {
  get: id => getOrRaise(symbolMap, id, 'Symbol'),
  set: (id, value) => (symbolMap.set(id, value), value)
};

export const functions = {
  get: id => getOrRaise(functionMap, id, 'Function'),
  set: (id, parameters, body) => (functionMap.set(id, new Function(...[...parameters, body])), id)
};

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

const asNumber = x => isNumber(x) ? x : raise('Number expected');
const asString = x => isString(x) ? x : raise('String expected');
const asSymbol = x => isSymbol(x) ? x : raise('Symbol expected');
const asArray  = x => isArray(x)  ? x : raise('Array expected');
const asCons   = x => isCons(x)   ? x : raise('Cons expected');
const asError  = x => isError(x)  ? x : raise('Error expected');
const asStream = x => isStream(x) ? x : raise('Stream expected');
const asIndex  = (i, a) =>
  !Natural.isInteger(i)  ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with bounds of array length ${a.length}`) :
  i;

export const head = c => c.head;
export const tail = c => c.tail;
export const cons = (h, t) => new Cons(h, t);
export const consFromArray = a => a.reduceRight((t, h) => cons(h, t), null);
export const consToArray = c => produce(isCons, head, tail, c);
export const consToArrayTree = c => produce(isCons, x => isCons(x.head) ? consToArrayTree(x.head) : x.head, tail, c);

export const intern = name => Symbol.for(name);
export const nameOf = symbol => Symbol.keyFor(symbol);

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

const isForm = (expr, lead, length) => (!length || expr.length === length) && expr[0] === intern(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(flattenForm) : [expr];
const flattenLogicalForm = (context, expr, lead) =>
  flattenForm(expr, lead)
    .map(x => build(but(context, 'kind', 'boolean'), x)) // TODO: wrap in asJsBool if necessary
    .reduceRight((right, left) => logical(lead === 'and' ? '&&' : '||', left, right)); // TODO: wrap in asKlBool if necessary

const isReferenced = (symbol, expr) =>
  expr === symbol
  || isForm(expr, 'let', 4) && (isReferenced(symbol, expr[2]) || expr[1] !== symbol && isReferenced(symbol, expr[3]))
  || isForm(expr, 'lambda', 3) && expr[1] !== symbol && isReferenced(symbol, expr[2])
  || isForm(expr, 'defun', 4) && !expr[2].includes(symbol) && isReferenced(symbol, expr[3])
  || isArray(expr) && expr.some(x => isReferenced(symbol, x));

// TODO: async/await
// TODO: inlining, type-inferred optimizations

const build = (context, expr) =>
  isNull(expr) ? literal(null) :
  isNumber(expr) || isString(expr) ? literal(expr) :
  isSymbol(expr) ? (
    context.locals.has(expr)
      ? identifier(nameOf(expr))
      : invoke(identifier('intern'), [literal(nameOf(expr))])) :
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
    // TODO:
    // in a statement context, we can just add a declaration, maybe surround in a block
    // in an expression context, we might have to put it in an ifee, or attempt inlining
    // binding may also be ignored in subsequent context, if so, just turn it into a do
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
  raise('not a valid form');
  // TODO: application form
  // TODO: what about non-empty, non-number, non-string, non-symbol, non-cons values

export const transpile = expr => build({ locals: new Set() }, consToArrayTree(expr));

exports['number?']         = isNumber;
exports['string?']         = isString;
exports['symbol?']         = isSymbol;
exports['absvector?']      = isArray;
exports['cons?']           = isCons;
exports['hd']              = c => head(asCons(c));
exports['tl']              = c => tail(asCons(c));
exports['cons']            = cons;
exports['tlstr']           = s => asString(s).substring(1);
exports['cn']              = (s, t) => asString(s) + asString(t);
exports['string->n']       = s => asString(s).charCodeAt(0);
exports['n->string']       = n => String.fromCharCode(asNumber(n));
exports['pos']             = (s, i) => asString(s)[asNumber(i)];
exports['str']             = show;
exports['absvector']       = n => new Array(asNumber(n)).fill(null);
exports['<-absvector']     = (a, i) => asArray(a)[asIndex(i, a)];
exports['absvector->']     = (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a);
exports['=']               = equate;
exports['+']               = (x, y) => asNumber(x) +  asNumber(y);
exports['-']               = (x, y) => asNumber(x) -  asNumber(y);
exports['*']               = (x, y) => asNumber(x) *  asNumber(y);
exports['/']               = (x, y) => asNumber(x) /  asNumber(y);
exports['>']               = (x, y) => asNumber(x) >  asNumber(y);
exports['<']               = (x, y) => asNumber(x) <  asNumber(y);
exports['>=']              = (x, y) => asNumber(x) >= asNumber(y);
exports['<=']              = (x, y) => asNumber(x) <= asNumber(y);
exports['intern']          = s => intern(asString(s));
exports['get-time']        = s => getTime(asSymbol(s));
exports['type']            = (x, _) => x;
exports['simple-error']    = raise;
exports['error-to-string'] = x => asError(x).message;
exports['if']              = (c, x, y) => c ? x : y; // TODO: convert to js bool
exports['and']             = (x, y) => x && y; // TODO: convert to js bool
exports['or']              = (x, y) => x || y; // TODO: convert to js bool
exports['set']             = set;
exports['value']           = value;
exports['open']            = undefined; // TODO: define these
exports['close']           = undefined; // TODO: define these
exports['read-byte']       = undefined; // TODO: define these
exports['write-byte']      = undefined; // TODO: define these

// TODO: IO operations, file system, console
