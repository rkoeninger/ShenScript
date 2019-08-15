/**
 * Contains functionality for accessing and calling native JavaScript functions and classes,
 * making JavaScript accessible from Shen and Shen accessible from JavaScript.
 * @module frontend
 */

const { AsyncFunction, GeneratorFunction, last, mapAsync, produce, raise } = require('./utils');
const {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger, Empty,
  For, ForIn, ForOf, Generator, Id, If, Let, Literal, Member, NewObj, NewTarget, Procedure, Property, Return,
  SafeId, Sequence, Slot, Spread, Statement, Static, Super, This, Try, Unary, Var, Vector, While, Yield, YieldMany
} = require('./ast');

/**
 * Amends Shen environment with JavaScript- and ShenScript-specific functionality.
 * @param {Object} $ - Shen environment object to amend.
 * @returns {Frontend} Same object, mutated.
 */
const frontend = $ => {
  const {
    asCons, asNumber, asJsBool, asShenBool, asString, async, cons, consToArray, evalJs, fun, functions, future,
    inlines, isArray, preprocessors, s, settle, symbolOf, symbols, valueOf, valueFromArrayTree, valueToArrayTree
  } = $;
  const run = async ? future : settle;
  const caller = name => (...args) => run(functions[name](...args));
  const define = (name, f) => {
    const nameSymbol = symbolOf(name);
    const funf = functions[name] = fun(f);

    if (async) {
      return (async () => {
        await run(functions.put(nameSymbol, s`shen.lambda-form`, funf, valueOf('*property-vector*')));
        await run(functions.put(nameSymbol, s`arity`, f.length, valueOf('*property-vector*')));
        return nameSymbol;
      })();
    } else {
      run(functions.put(nameSymbol, s`shen.lambda-form`, funf, valueOf('*property-vector*')));
      run(functions.put(nameSymbol, s`arity`, f.length, valueOf('*property-vector*')));
      return nameSymbol;
    }
  };
  const defineTyped = (name, type, f) => {
    if (async) {
      return (async () => {
        const nameSymbol = await define(name, f);
        await run(functions.declare(nameSymbol, valueFromArrayTree(type)));
        return nameSymbol;
      })();
    } else {
      const nameSymbol = define(name, f);
      run(functions.declare(nameSymbol, valueFromArrayTree(type)));
      return nameSymbol;
    }
  };
  const defmacro = (name, f) => {
    const macrofn = expr => {
      const result = valueFromArrayTree(f(valueToArrayTree(expr)));
      return result === undefined ? expr : result;
    };
    define(name, macrofn);
    const macroreg = valueOf('shen.*macroreg*');
    const macros = valueOf('*macros*');
    const nameSymbol = symbolOf(name);
    if (!consToArray(macroreg).includes(nameSymbol)) {
      symbols['shen.*macroreg*'] = cons(nameSymbol, macroreg);
      symbols['*macros*'] = cons(fun(x => macrofn(x)), macros);
    }
    return nameSymbol;
  };
  const evalShen = expr => run(functions.eval(valueFromArrayTree(expr)));
  const execEach = async
    ? async source => mapAsync(consToArray(await parse(source)), evalShen)
    :       source => consToArray(parse(source)).map(evalShen);
  const exec = async
    ? async source => last(await execEach(source))
    :       source => last(execEach(source));
  const symbol = (name, value) => {
    const index = name.lastIndexOf('.') + 1;
    const starredName = `${name.substr(0, index)}*${name.substr(index)}*`;
    define(name, () => valueOf(starredName));
    return symbols[starredName] = value;
  };
  const inline = (name, f) => inlines[name] = f;
  const pre = (name, f) => preprocessors[name] = f;
  const load = caller('load');
  const parse = caller('read-from-string');

  define('js.ast.literal',           value => Literal(value));
  define('js.ast.array',          elements => Vector(consToArray(elements)));
  define('js.ast.id',                 name => Id(name));
  define('js.ast.safe-id',            name => SafeId(name));
  define('js.ast.const',        (id, init) => Const(id, init));
  define('js.ast.let',          (id, init) => Let(id, init));
  define('js.ast.var',          (id, init) => Var(id, init));
  define('js.ast.arguments',            () => Id('arguments'));
  define('js.ast.debugger',             () => Debugger());
  define('js.ast.new-target',           () => NewTarget());
  define('js.ast.this',                 () => This());
  define('js.ast.unary',           (op, x) => Unary(op, x));
  define('js.ast.binary',       (op, x, y) => Binary(op, x, y));
  define('js.ast.ternary',       (x, y, z) => Conditional(x, y, z));
  define('js.ast.assign',           (x, y) => Assign(x, y));
  define('js.ast.update',       (op, x, y) => Assign(x, y, op + '='));
  define('js.ast.call',          (f, args) => Call(f, consToArray(args)));
  define('js.ast.spread',              arg => Spread(consToArray(arg)));
  define('js.ast.super',                () => Super());
  define('js.ast.block',              body => Block(...consToArray(body)));
  define('js.ast.empty',                () => Empty());
  define('js.ast.sequence',          exprs => Sequence(...consToArray(exprs)));
  define('js.ast.member',      (obj, prop) => Member(obj, prop));
  define('js.ast.object',            props => NewObj(valueToArrayTree(props).map(([x, y]) => Property(x, y))));
  define('js.ast.class', (id, base, slots) => Class(id, base, consToArray(slots)));
  define('js.ast.slot',   (kind, id, body) => Slot(kind, id, body));
  define('js.ast.constructor',        body => Slot('constructor', Id('constructor'), body));
  define('js.ast.method',       (id, body) => Slot('method', id, body));
  define('js.ast.getter',       (id, body) => Slot('get', id, body));
  define('js.ast.setter',       (id, body) => Slot('set', id, body));
  define('js.ast.arrow',    (params, body) => Arrow(consToArray(params), body));
  define('js.ast.function',  (i, ps, body) => Procedure(i, consToArray(params), body));
  define('js.ast.function*', (i, ps, body) => Generator(i, consToArray(params), body));
  define('js.ast.return',              arg => Return(arg));
  define('js.ast.yield',               arg => Yield(arg));
  define('js.ast.yield*',              arg => YieldMany(arg));
  define('js.ast.await',               arg => Await(arg));
  define('js.ast.async',               arg => Async(arg));
  define('js.ast.static',              arg => Static(arg));
  define('js.ast.if',         (test, x, y) => If(test, x, y));
  define('js.ast.try',     (body, handler) => Try(body, handler));
  define('js.ast.catch',     (param, body) => Catch(param, body));
  define('js.ast.while',      (test, body) => While(test, body));
  define('js.ast.for',     (x, y, z, body) => For(x, y, z, body));
  define('js.ast.for-in',    (x, xs, body) => ForIn(x, xs, body));
  define('js.ast.for-of',    (x, xs, body) => ForOf(x, xs, body));
  define('js.ast.statement',          expr => Statement(expr));

  define('js.ast.eval', x => evalJs(x));
  pre('js.ast.inline', x => evalShen(x));

  define('js.unchecked.+',                            (x, y) => x + y);
  define('js.unchecked.-',                            (x, y) => x - y);
  define('js.unchecked.*',                            (x, y) => x * y);
  define('js.unchecked./',                            (x, y) => x / y);
  define('js.unchecked.%',                            (x, y) => x % y);
  define('js.unchecked.**',                           (x, y) => x ** y);
  define('js.unchecked.bitwise.not',                       x => ~x);
  define('js.unchecked.bitwise.and',                  (x, y) => x & y);
  define('js.unchecked.bitwise.or',                   (x, y) => x | y);
  define('js.unchecked.bitwise.xor',                  (x, y) => x ^ y);
  define('js.unchecked.bitwise.left-shift',           (x, y) => x << y);
  define('js.unchecked.bitwise.right-shift',          (x, y) => x >> y);
  define('js.unchecked.bitwise.right-shift-unsigned', (x, y) => x >>> y);

  defineTyped(
    'js.%',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) ** asNumber(y));
  defineTyped(
    'js.**',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) ** asNumber(y));
  defineTyped(
    'js.bitwise.not',
    [s`number`, s`-->`, s`number`],
    x => ~asNumber(x));
  defineTyped(
    'js.bitwise.and',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) & asNumber(y));
  defineTyped(
    'js.bitwise.or',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) | asNumber(y));
  defineTyped(
    'js.bitwise.xor',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) ^ asNumber(y));
  defineTyped(
    'js.bitwise.left-shift',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) << asNumber(y));
  defineTyped(
    'js.bitwise.right-shift',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) >> asNumber(y));
  defineTyped(
    'js.bitwise.right-shift-unsigned',
    [s`number`, s`-->`, s`number`, s`-->`, s`number`],
    (x, y) => asNumber(x) >>> asNumber(y));

  define('js.log',                x => console.log(x));
  define('js.decodeURI',          x => decodeURI(x));
  define('js.decodeURIComponent', x => decodeURIComponent(x));
  define('js.encodeURI',          x => encodeURI(x));
  define('js.encodeURIComponent', x => encodeURIComponent(x));
  define('js.parseFloat',         x => parseFloat(x));
  define('js.parseInt',           x => parseInt(x));
  define('js.parseIntRadix', (x, r) => parseInt(x, r));

  // TODO: separate namespace for functions that return js bool vs shen bool?
  // TODO: type could still be defined as A --> B --> boolean
  //       but if it returns boolean, make sure to apply asShenBool()
  define('js.==',         (x, y) => x == y);
  define('js.===',        (x, y) => x === y);
  define('js.!=',         (x, y) => x != y);
  define('js.!==',        (x, y) => x !== y);
  define('js.not',             x => !x);
  define('js.and',        (x, y) => x && y);
  define('js.or',         (x, y) => x || y);
  define('js.defined?',        x => typeof x !== 'undefined');
  define('js.undefined?',      x => typeof x === 'undefined');
  define('js.truthy?',         x => !!x);
  define('js.falsy?',          x => !x);
  define('js.array?',          x => Array.isArray(x));
  define('js.async?',          x => x instanceof AsyncFunction);
  define('js.boolean?',        x => typeof x === 'boolean');
  define('js.finite?',         x => Number.isFinite(x));
  define('js.generator?',      x => x instanceof GeneratorFunction);
  define('js.infinite?',       x => !Number.isFinite(x));
  define('js.+infinity?',      x => x === Infinity);
  define('js.-infinity?',      x => x === -Infinity);
  define('js.integer?',        x => Number.isInteger(x));
  define('js.+integer?',       x => Number.isInteger(x) && x > 0);
  define('js.-integer?',       x => Number.isInteger(x) && x < 0);
  define('js.function?',       x => typeof x === 'function');
  define('js.null?',           x => x === null);
  define('js.nan?',            x => Number.isNaN(x));
  define('js.object?',         x => typeof x === 'object' && x !== null && !Array.isArray(x));
  define('js.symbol?',         x => typeof x === 'symbol');
  define('js.delete',     (x, y) => delete x[y]);
  define('js.eval',            x => eval(x));
  define('js.in',         (x, y) => x in y);
  define('js.instanceof', (x, y) => x instanceof y);
  define('js.typeof',          x => typeof x);
  define('js.void',            x => void x);

  define('js.new', (Class, args) => new Class(...consToArray(asCons(args))));
  define('js.set', (object, property, value) => object[property] = value);
  define('js.get', (object, property) => {
    const value = object[property];
    return typeof value === 'function' ? value.bind(object) : value;
  });
  defmacro('js.get-macro', expr => {
    if (isArray(expr) && expr[0] === s`.` && expr.length >= 2) {
      return expr.slice(2).reduce((whole, prop) => [s`js.get`, whole, prop], expr[1]);
    }
  });

  define('js.obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.obj must take an even-length key-value list');
  });
  defmacro('js.obj-macro', expr => {
    if (isArray(expr) && expr[0] === s`{` && expr[expr.length - 1] === s`}`) {
      return [
        s`js.obj`,
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [s`cons`, head, tail], [])
      ];
    }
  });

  symbol('js.Array',             Array);
  symbol('js.ArrayBuffer',       ArrayBuffer);
  symbol('js.AsyncFunction',     AsyncFunction);
  symbol('js.Boolean',           Boolean);
  symbol('js.console',           console);
  symbol('js.DataView',          DataView);
  symbol('js.Date',              Date);
  symbol('js.Function',          Function);
  symbol('js.GeneratorFunction', GeneratorFunction);
  symbol('js.Infinity',          Infinity);
  symbol('js.JSON',              JSON);
  symbol('js.Map',               Map);
  symbol('js.Math',              Math);
  symbol('js.NaN',               NaN);
  symbol('js.Number',            Number);
  symbol('js.null',              null);
  symbol('js.Object',            Object);
  symbol('js.Promise',           Promise);
  symbol('js.Proxy',             Proxy);
  symbol('js.Reflect',           Reflect);
  symbol('js.RegExp',            RegExp);
  symbol('js.Set',               Set);
  symbol('js.String',            String);
  symbol('js.Symbol',            Symbol);
  symbol('js.undefined',         undefined);
  symbol('js.WeakMap',           WeakMap);
  symbol('js.WeakSet',           WeakSet);
  symbol('js.WebAssembly',       WebAssembly);

  if (typeof Atomics !== 'undefined') {
    symbol('js.Atomics', Atomics);
  }

  if (typeof globalThis !== 'undefined') {
    symbol('js.globalThis', globalThis);
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    symbol('js.SharedArrayBuffer', SharedArrayBuffer);
  }

  define('shen-script.lookup-function', x => functions[asString(x)] || null);
  symbol('shen-script.$', $);

  define('shen-script.boolean.js->shen', x => asShenBool(x));
  define('shen-script.boolean.shen->js', x => asJsBool(x));
  // TODO: shen->js recursive, js->shen recursive
  return Object.assign($, {
    caller, define, defineTyped, defmacro, evalShen, exec, execEach, inline, load, parse, pre, symbol
  });
};

/**
 * @typedef {Object} Frontend
 * @prop {function} caller - Returns a function that invokes the function by the given name,
 *                           settling returned Trampolines.
 * @prop {function} define - Defines Shen function that defers to given JavaScript function.
 * @prop {function} defineTyped - Defines Shen function that defers to given JavaScript function and declares
 *                                with the specified Shen type signature. Type signature has the same structure
 *                                as in Shen source code, but in array tree form.
 * @prop {function} defmacro - Defines a Shen macro in terms of the given JavaScript function.
 * @prop {function} evalShen - Evaluates Shen expression tree in isolated environment.
 * @prop {function} exec - Parses string as Shen source, evaluates each expression and returns last result.
 * @prop {function} execEach - Parses string as Shen source, evaluates each expression and returns an array
 *                             of the results.
 * @prop {function} inline - Registers an inlining rule.
 * @prop {function} load - Loads Shen code from the given file path.
 * @prop {function} parse - Returns parsed Shen source code as a cons tree.
 * @prop {function} pre - Registers a preprocessor function.
 * @prop {function} symbol - Declares a global symbol with the given value and a function by the same name
 *                           that retrieves the value.
 */

module.exports = frontend;
