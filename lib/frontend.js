const { bound, last, mapAsync, produce, raise, top } = require('./utils');

module.exports = $ => {
  const {
    asCons, asSymbol, async, consToArray, f,
    fun, future, nameOf, primitives, settle
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
  const inline = (name, fn) => primitives[name] = fn;
  // TODO: other js. namespace functions?
  define('js.new', (className, args) =>
    new (top[nameOf(asSymbol(className))])(...consToArray(asCons(args))));
  define('js.obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.obj must take an even-length key-value list');
  });
  const dot = (object, property) => bound(object, nameOf(asSymbol(property)));
  define('.', dot);
  define('..', (object, properties) => consToArray(properties).reduce(dot, object));
  return Object.assign($, { caller, define, evalShen, exec, execEach, inline, parse });
};
