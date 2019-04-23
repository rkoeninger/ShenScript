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
  const { async, consToArray, evalKl, f, functions, future, primitives, s, settle } = $;
  // TODO: these js.new don't work
  primitives['js.new'] = (className, args) => New(Identifier(className), args);
  functions ['js.new'] = (className, args) => new (top[className])(...args);
  const evalShen = async
    ? async expr => future(f.eval(expr))
    :       expr => settle(f.eval(expr));
  const evalShenSource = async
    ? async source => last(await mapAsync(consToArray(await future(f['read-from-string'](source))), evalShen))
    :       source => last(consToArray(settle(f['read-from-string'](source))).map(evalShen));
  return Object.assign($, { evalShen, evalShenSource });
};
