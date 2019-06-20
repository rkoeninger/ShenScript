const { AsyncFunction, GeneratorFunction, last, mapAsync, produce, raise } = require('./utils');
const {
  Async, Await, Block, Call, Class, Debugger, Generator, Id, Member, NewTarget,
  Procedure, Return, Slot, Spread, Static, Super, This, Yield, YieldMany
} = require('./ast');

module.exports = $ => {
  const {
    asCons, asShenBool, asString, async, cons, consToArray, f, fun, future, inlines,
    isArray, s, settle, symbolOf, symbols, valueOf, valueFromArrayTree, valueToArrayTree
  } = $;
  const run = async ? future : settle;
  const parse = source => run(f['read-from-string'](source));
  const caller = name => (...args) => run(f[name](...args));
  const define = (name, fn) => f[name] = fun(fn);
  const defmacro = (name, fn) => {
    const macrofn = expr => {
      const result = valueFromArrayTree(fn(valueToArrayTree(expr)));
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
  const evalShen = expr => run(f.eval(expr));
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
  const inline = (name, fn) => inlines[name] = fn;
  const load = caller('load');

  const $ValueToArray = args => Call(Member(Id('$'), Id('valueToArray')), args);

  // TODO: js.ast.* functions that return the ast's instead of inlining them?
  // TODO: inlines for if, ?:, for, while, switch, id, safeid, etc.?
  inline('js.arguments',            () => Id('arguments'));
  inline('js.debugger',             () => Debugger);
  inline('js.new.target',           () => NewTarget);
  inline('js.this',                 () => This);
  inline('js.super',              args => Super([Spread($ValueToArray(args))]));
  inline('js.block',              body => Block($ValueToArray(body)));
  inline('js.class', (id, base, slots) => Class(id, base, slots));
  inline('js.constructor',        body => Slot(false, 'constructor', Id('constructor'), body));
  inline('js.method',       (id, body) => Slot(false, 'method', id, body));
  inline('js.getter',       (id, body) => Slot(false, 'get', id, body));
  inline('js.setter',       (id, body) => Slot(false, 'set', id, body));
  inline('js.function',           body => Procedure(body));
  inline('js.function*',          body => Generator(body));
  inline('js.return',              arg => Return(arg));
  inline('js.yield',               arg => Yield(arg));
  inline('js.yield*',              arg => YieldMany(arg));
  inline('js.await',               arg => Await(arg));
  inline('js.async',               arg => Async(arg));
  inline('js.static',              arg => Static(arg));

  // TODO: js. functions can do asX() type-checking,
  //       js.ast. functions just build the ast as explicitly stated

  // TODO: declare types for these functions where possible?
  define('js.new', (Class, args) => new Class(...consToArray(asCons(args))));
  define('js.==',         (x, y) => x == y);
  define('js.===',        (x, y) => x === y);
  define('js.!',               x => !x);
  define('js.&&',         (x, y) => x && y);
  define('js.||',         (x, y) => x || y);
  define('js.~',               x => ~x);
  define('js.&',          (x, y) => x & y);
  define('js.|',          (x, y) => x | y);
  define('js.><',         (x, y) => x ^ y);
  define('js.<<',         (x, y) => x << y);
  define('js.>>',         (x, y) => x >> y);
  define('js.>>>',        (x, y) => x >>> y);
  define('js.defined?',        x => typeof x !== 'undefined');
  define('js.undefined?',      x => typeof x === 'undefined');
  define('js.truthy?',         x => asShenBool(x));
  define('js.falsy?',          x => asShenBool(!x));
  // TODO: shen->js bool, js->shen bool
  // TODO: shen->js recursive, js->shen recursive
  define('js.array?',          x => Array.isArray(x));
  define('js.boolean?',        x => typeof x === 'boolean');
  define('js.finite?',         x => Number.isFinite(x));
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

  define('js.new-obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.new-obj must take an even-length key-value list');
  });
  defmacro('js.new-obj-macro', expr => {
    if (isArray(expr) && expr[0] === s`{` && expr[expr.length - 1] === s`}`) {
      return [
        s`js.new-obj`,
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [s`cons`, head, tail], [])
      ];
    }
  });

  symbol('js.Array',              Array);
  symbol('js.ArrayBuffer',        ArrayBuffer);
  symbol('js.AsyncFunction',      AsyncFunction);
  symbol('js.Atomics',            Atomics);
  symbol('js.Boolean',            Boolean);
  symbol('js.console',            console);
  symbol('js.DataView',           DataView);
  symbol('js.Date',               Date);
  symbol('js.decodeURI',          decodeURI);
  symbol('js.decodeURIComponent', decodeURIComponent);
  symbol('js.encodeURI',          encodeURI);
  symbol('js.encodeURIComponent', encodeURIComponent);
  symbol('js.Function',           Function);
  symbol('js.GeneratorFunction',  GeneratorFunction);
  symbol('js.Infinity',           Infinity);
  symbol('js.JSON',               JSON);
  symbol('js.Map',                Map);
  symbol('js.Math',               Math);
  symbol('js.NaN',                NaN);
  symbol('js.Number',             Number);
  symbol('js.null',               null);
  symbol('js.Object',             Object);
  symbol('js.parseFloat',         parseFloat);
  symbol('js.parseInt',           parseInt);
  symbol('js.Promise',            Promise);
  symbol('js.Proxy',              Proxy);
  symbol('js.Reflect',            Reflect);
  symbol('js.RegExp',             RegExp);
  symbol('js.Set',                Set);
  symbol('js.SharedArrayBuffer',  SharedArrayBuffer);
  symbol('js.String',             String);
  symbol('js.Symbol',             Symbol);
  symbol('js.undefined',          undefined);
  symbol('js.WeakMap',            WeakMap);
  symbol('js.WeakSet',            WeakSet);
  symbol('js.WebAssembly',        WebAssembly);

  if (typeof globalThis !== 'undefined') {
    symbol('js.globalThis', globalThis);
  }

  define('js.log', x => console.log(x));
  define('shen-script.lookup-function', x => f[asString(x)] || null);
  symbol('shen-script.$', $);
  return Object.assign($, { caller, define, defmacro, evalShen, exec, execEach, load, symbol, inline, parse });
};
