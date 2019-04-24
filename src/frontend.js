const { Identifier, New } = require('./ast');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?
// TODO: have shen-script.*instream-supported*, shen-script.*outstream-supported*, shen-script.*async* flags?
// TODO: js. namespace functions

const top = typeof window !== 'undefined' ? window : global;
const mapAsync = async (ps, f) => {
  let y = [];
  for (const p of ps) {
    y.push(await p);
  }
  return y;
};
const last = a => a.length === 0 ? null : a[a.length - 1];

module.exports = $ => {
  const { asCons, asSymbol, async, consToArray, f, fun, future, nameOf, primitives, settle } = $;
  const evalShen = async
    ? async expr => future(f.eval(expr))
    :       expr => settle(f.eval(expr));
  const evalShenSource = async
    ? async source => last(await mapAsync(consToArray(await future(f['read-from-string'](source))), evalShen))
    :       source => last(consToArray(settle(f['read-from-string'](source))).map(evalShen));
  const define = (name, fn) => f[name] = fun(fn);
  const inline = (name, fn) => primitives[name] = fn;
  // TODO: these js.new don't work
  //inline('js.new', (className, args) => New(Identifier(nameOf(asSymbol(className))), args));
  define('js.new', (className, args) => new (top[nameOf(asSymbol(className))])(...consToArray(asCons(args))));
  define('js.{}', pairs =>
    consToArray(asCons(pairs)).reduce((obj, pair) => {
      const [name, value] = consToArray(asCons(pair));
      return Object.assign(obj, { ...obj, [name]: value });
    }, {}));
  return Object.assign($, { evalShen, evalShenSource, define, inline });
};
