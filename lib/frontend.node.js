const frontend = require('./frontend');

module.exports = $ => {
  const { define, defineTyped, defmacro, eternal, isArray, s, symbol } = $ = frontend($);

  defineTyped('node.exit', [s`number`, s`-->`, s`unit`], x => process.exit(x));
  defmacro('node.exit-macro', expr => {
    if (isArray(expr) && expr.length === 1 && expr[0] === s`node.exit`) {
      return [...expr, 0];
    }
  });

  define('node.require', x => require(x));
  symbol('node.global', global);

  if (!eternal('js.globalThis').v) {
    symbol('js.globalThis', global);
  }

  return $;
};
