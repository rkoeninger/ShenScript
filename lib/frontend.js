const { bound, last, mapAsync, produce, raise } = require('./utils');

module.exports = $ => {
  const {
    asCons, async, cons, consToArray, f, fun, future,
    primitives, settle, symbolOf, symbols, valueOf, valueFromArrayTree, valueToArrayTree
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
  const inline = (name, fn) => primitives[name] = fn;

  // TODO: other js. namespace functions?
  // TODO: declare types for these functions where possible?

  define('js.new', (Class, args) => new Class(...consToArray(asCons(args))));
  define('js.class', (_className, _BaseClass, _slots) => {

  });
  // want to be able to define slots as shen functions which take this as first argument
  // class Class extends BaseClass {
  //   ...slots
  // }
  define('js.array?',     x => Array.isArray(x));
  define('js.boolean?',   x => typeof x === 'boolean');
  define('js.finite?',    x => Number.isFinite(x));
  define('js.function?',  x => typeof x === 'function');
  define('js.null?',      x => x === null);
  define('js.nan?',       x => Number.isNaN(x));
  define('js.object?',    x => typeof x === 'object' && x !== null && !Array.isArray(x));
  define('js.symbol?',    x => typeof x === 'symbol');
  define('js.undefined?', x => typeof x === 'undefined');
  define('js.null',       () => null);
  define('js.undefined',  () => undefined);
  define('js.typeof',     x => typeof x);
  define('.', bound);
  define('..', (object, properties) => consToArray(properties).reduce(bound, object));
  define('js.new-obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.new-obj must take an even-length key-value list');
  });
  defmacro('js.new-obj-macro', expr => {
    if (Array.isArray(expr) && expr[0] === symbolOf('{') && expr[expr.length - 1] === symbolOf('}')) {
      return [
        symbolOf('js.new-obj'),
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [symbolOf('cons'), head, tail], [])
      ];
    }
  });
  symbol('js.Array', Array);
  symbol('js.console', console);
  symbol('js.Infinity', Infinity);
  symbol('js.JSON', JSON);
  symbol('js.Math', Math);
  symbol('js.NaN', NaN);
  symbol('js.Number', Number);
  symbol('js.null', null);
  symbol('js.Promise', Promise);
  symbol('js.undefined', undefined);
  if (typeof globalThis !== 'undefined') {
    symbol('js.globalThis', globalThis);
  }
  define('js.log', x => console.log(x));
  return Object.assign($, { caller, define, defmacro, evalShen, exec, execEach, symbol, inline, parse });
};
