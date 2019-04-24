// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?
// TODO: have shen-script.*instream-supported*, shen-script.*outstream-supported*, shen-script.*async* flags?
// TODO: js. namespace functions

const top = typeof window !== 'undefined' ? window : global;
const mapAsync = async (ps, f) => {
  let y = [];
  for (const p of ps) {
    y.push(await f(await p));
  }
  return y;
};
const last = a => a.length === 0 ? null : a[a.length - 1];

module.exports = $ => {
  const { asCons, asSymbol, async, consToArray, f, fun, future, nameOf, primitives, settle } = $;
  const run = async ? future : settle;
  const parse = source => run(f['read-from-string'](source));
  const caller = name => (...args) => run(f[name](...args));
  const define = (name, fn) => f[name] = fun(fn);
  const evalShen = expr => run(f.eval(expr));
  const exec = async
    ? (async source => last(await mapAsync(consToArray(await parse(source)), evalShen)))
    : (      source => last(consToArray(parse(source)).map(evalShen)));
  // defmacro
  // defcc
  // defprolog
  // datatype
  const inline = (name, fn) => primitives[name] = fn;
  define('js.new', (className, args) => new (top[nameOf(asSymbol(className))])(...consToArray(asCons(args))));
  define('js.obj', pairs =>
    consToArray(asCons(pairs)).reduce((obj, pair) => {
      const [name, value] = consToArray(asCons(pair));
      return Object.assign(obj, { ...obj, [name]: value });
    }, {}));
  return Object.assign($, { caller, define, exec, evalShen, inline, parse });
};
