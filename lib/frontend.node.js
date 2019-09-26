const frontend = require('./frontend');

module.exports = $ => {
  const {
    caller, define, defineTyped, defmacro, eternal,
    isArray, s, symbol, symbolOf, toList, valueOf
  } = $ = frontend($);

  defineTyped('node.exit', [s`number`, s`-->`, s`unit`], x => process.exit(x));
  defmacro('node.exit-macro', expr => {
    if (isArray(expr) && expr.length === 1 && expr[0] === s`node.exit`) {
      return [...expr, 0];
    }
  });

  define('node.require', x => require(x));
  symbol('node.global', global);

  if (!eternal('js.globalThis').valueExists) {
    symbol('js.globalThis', global);
  }

  /*************************
   * Declare Port Features *
   *************************/

  const features = [
    s`shen-script`,
    s`js`,
    s`node`,
    symbolOf(valueOf('*os*').toLowerCase())];
  caller('shen.x.features.initialise')(toList(features));

  return $;
};
