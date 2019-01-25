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

const raise = x => { throw new Error(x); };

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
};

export const isEmpty    = x => x === null;
export const isNumber   = x => typeof x === 'number';
export const isString   = x => typeof x === 'string';
export const isSymbol   = x => typeof x === 'symbol';
export const isFunction = x => typeof x === 'function';
export const isArray    = x => typeof x === 'array';
export const isError    = x => x instanceof Error;
export const isCons     = x => x instanceof Cons;
export const isStream   = x => false; // TODO: implement this

export const empty = null;
export const head = cons => cons.head;
export const tail = cons => cons.tail;
export const cons = (head, tail) => new Cons(head, tail);
export const consToArray = cons => produce(isCons, head, tail, cons);
export const arrayToCons = array => array.reduceRight((tail, head) => cons(head, tail), empty);

export const intern = name => Symbol.for(name);

const stringTail   = s => s.substring(1);
const stringConcat = (s, t) => s + t;
const stringToN    = s => s.charCodeAt(0);
const stringFromN  = n => String.fromCharCode(n);
const stringcharAt = (s, i) => s[i];

const arrayNew = n => new Array(n).fill(empty);
const arrayGet = (a, i) => a[i];
const arraySet = (a, i, x) => {
  a[i] = x;
  return a;
};

const add            = (x, y) => x + y;
const subtract       = (x, y) => x - y;
const multiply       = (x, y) => x * y;
const divide         = (x, y) => x / y;
const greater        = (x, y) => x > y;
const greaterOrEqual = (x, y) => x >= y;
const lesser         = (x, y) => x < y;
const lesserOrEqual  = (x, y) => x <= y;

// TODO: equate and show Streams

export const equate = (x, y) =>
  x === y
  || isCons(x) && isCons(y) && equate(x.head, y.head) && equate(x.tail, y.tail)
  || isArray(x) && isArray(y) && x.length === y.length && x.every((v, i) => equate(v, y[i]));

export const show = x =>
  isEmpty(x)    ? '[]' :
  isString(x)   ? `"${x}"` :
  isSymbol(x)   ? x.description :
  isCons(x)     ? `[${consToArray(x).map(toStr).join(' ')}]` :
  isFunction(x) ? `<Function ${x.name}>` :
  isArray(x)    ? `<Vector ${x.length}>` :
  isError(x)    ? `<Error "${x.message}">` :
  `${x}`;

const now = () => new Date().getTime();
const startTime = now();
const unix = Symbol.for('unix');
const run = Symbol.for('run');
const getTime = mode =>
  mode === unix ? now() :
  mode === run  ? now() - startTime :
  raise('get-time only accepts symbols unix or run');

const globals = new Map();
export const set = (id, value) => {
  globals.set(id, value);
  return value;
};
export const value = id => globals.has(id) ? globals.get(id) : raise(`Symbol ${show(id)} not defined`);

const type = (x, _) => x;

const errorToString = x => x.message;

const both   = (x, y) => x && y;
const either = (x, y) => x || y;
const when   = (c, x, y) => c ? x : y;

const functions = new Map();
export const defun = (id, parameters, body) => {
  functions.set(id, new Function(...[...parameters, body]));
  return id;
};
export const lookup = id => functions.has(id) ? functions.get(id) : raise(`Function ${show(id)} not defined`);





// TODO: what about async/await?
// how to combine trampoline evaluation with promise chaining?
const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
  }
};

const isTrampoline = x => x instanceof Trampoline;
const runTrampoline = ({ f, args }) => f(...args);

// TODO: partial applications, curried applications





// NOTE:
// context.statement  // if location in target context can be a statement
// context.expression // if location in target context must be an expression
// context.return     // location is the last statement which needs to be returned
// context.head       // if context is in head position
// context.tail       // if context is in tail position
// context.locals     // Set of local variables and parameters defined at this point
// context.shenType   // specific type is expected for expression, undefined if unknown

const isForm = (expr, lead, length) => (!length || expr.length === length) && expr[0] === intern(lead);
const flattenForm = (expr, lead) => isForm(expr, lead) ? expr.slice(1).flatMap(flattenForm) : [expr];
const flattenBooleanForm = (expr, lead) =>
  flattenForm(expr, lead)
    .map(x => build({ ...context, shenType: 'boolean' }, x)) // TODO: wrap in asJsBool if necessary
    .reduceRight((combined, argument) => ({
      type: 'LogicalExpression',
      operator: lead === 'and' ? '&&' : '||',
      left: argument,
      right: combined
    })); // TODO: wrap in asKlBool if necessary

// TODO: async/await
// TODO: inlining, type checking

export const build = (context, expr) => {
  if (isEmpty(expr)) {
    return { type: 'Identifier', name: 'empty' };
  } else if (isNumber(expr) || isString(expr)) {
    return { type: 'Literal', value: expr };
  } else if (isSymbol(expr)) {
    // TODO: true and false symbols
    // TODO: what about nested shadowing?
    return context.locals.contains(expr) ? {
        type: 'Identifier', 
        name: Symbol.keyFor(expr)
      } : {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'intern' },
        arguments: [{ type: 'Literal', value: Symbol.keyFor(expr) }]
      };
  } else if (isForm(expr, 'and')) {
    return flattenBooleanForm(expr, 'and');
  } else if (isForm(expr, 'or')) {
    return flattenBooleanForm(expr, 'or');
  } else if (isForm(expr, 'if', 4)) {
    return {
      type: context.statement ? 'IfStatement' : 'ConditionalExpression',
      test: build({ ...context, shenType: 'boolean' }, expr[1]),
      consequent: build(context, expr[2]),
      alternative: build(context, expr[3])
    };
  } else if (isForm(expr, 'cond')) {
    // TODO: handle true and false conditions
    // TODO: build if/else chain in statement context, ?/: chain in expression context
    return expr.slice(1).reduceRight(
      (chain, [test, consequent]) => ({
        type: context.statement ? 'IfStatement' : 'ConditionalExpression',
        test: build({ ...context, shenType: 'boolean' }, test),
        consequent: build(context, consequent), // TODO: if cond is in return position, wrap in ReturnStatement
        alternative: chain
      }), {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'raise' },
        arguments: [{ type: 'Literal', value: 'no condition was true' }]
      });
  } else if (isForm(expr, 'let', 4)) {
    // TODO:
    // in a statement context, we can just add a declaration, maybe surround in a block
    // in an expression context, we might have to put it in an ifee, or attempt inlining
    // binding may also be ignored in subsequent context, if so, just turn it into a do
    // [let X Binding Body] -> [do Binding Body] where (free-variable-in? X Body)
    return {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'ArrowFunctionExpression',
          params: [{ type: 'Identifier', name: Symbol.keyFor(expr[1]) }],
          body: build(context, expr[2])
        },
        arguments: [build(context, expr[3])]
      }
    };
  } else if (isForm(expr, 'do')) {
    return {
      type: 'BlockStatement',
      body: flattenForm(expr, 'do').map(x => build(context, x))
      // TODO: return butlast(exprs)
      // if do is assigned to a variable, just make last line an assignment to a variable
    };
  } else if (isForm(expr, 'lambda', 3)) {
    return { // TODO: check body to see if function should be a statement or expression lambda
      type: 'ArrowFunctionExpression',
      params: [{ type: 'Identifier', name: Symbol.keyFor(expr[1]) }],
      expression: true,
      body: build(context, expr[2])
    };
  } else if (isForm(expr, 'freeze', 2)) {
    return {
      type: 'ArrowFunctionExpression',
      params: [],
      expression: true,
      body: build(context, expr[1])
    };
  } else if (isForm(expr, 'trap-error', 3)) {
    return {
      type: 'TryStatement',
      block: build(context, expr[1]), // TODO: wrap in block statement, make it statement context
      handler: { // TODO: if handler is a lambda, just inline its body, name catch var after lambda param
        type: 'CatchClause',
        param: { type: 'Identifier', name: 'E' },
        body: {
          type: 'BlockStatement',
          body: null // TODO: apply handler expr[2] to E
        }
      }
    };
  }

  // TODO: application form
  // TODO: what about non-empty, non-number, non-string, non-symbol, non-cons values
};



// TODO: IO operations, file system, console



export default const Shen = class {
  constructor({ platform, version, os, fileSystem }) {
    this.functions = {};
    this.globals = new Map();
    this.fileSystem = fileSystem;
  }
};
