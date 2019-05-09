const { bound, last, mapAsync, produce, raise, top } = require('./utils');

module.exports = $ => {
  const {
    asCons, asSymbol, async, consToArray, f, fun, future,
    nameOf, primitives, settle, symbols, valueOf
  } = $;
  const run = async ? future : settle;
  const parse = source => run(f['read-from-string'](source));
  const caller = name => (...args) => run(f[name](...args));
  const define = (name, fn) => f[name] = fun(fn);
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

  define('js.new', (className, args) =>
    new (top[nameOf(asSymbol(className))])(...consToArray(asCons(args))));
  define('js.obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.obj must take an even-length key-value list');
  });
  define('js.array?',     x => Array.isArray(x));
  define('js.boolean?',   x => typeof x === 'boolean');
  define('js.function?',  x => typeof x === 'function');
  define('js.null?',      x => x === null);
  define('js.number?',    x => typeof x === 'number');
  define('js.object?',    x => typeof x === 'object' && x !== null && !Array.isArray(x));
  define('js.string?',    x => typeof x === 'string' || x instanceof String);
  define('js.symbol?',    x => typeof x === 'symbol');
  define('js.undefined?', x => typeof x === 'undefined');
  define('js.typeof',     x => typeof x);
  define('.', bound);
  define('..', (object, properties) => consToArray(properties).reduce(bound, object));
  return Object.assign($, { caller, define, evalShen, exec, execEach, symbol, inline, parse });
};
