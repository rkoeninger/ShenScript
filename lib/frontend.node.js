const { Id, Member } = require('./ast');
const frontend = require('./frontend');

module.exports = $ => {
  const { define, defmacro, evalJs, inline, s, symbol, symbols } = $ = frontend($);

  inline('node.exports', () => Member(Id('module'), Id('exports')));

  define('node.exit', x => process.exit(x));
  defmacro('node.exit-macro', expr => {
    if (Array.isArray(expr) && expr.length === 1 && expr[0] === s`node.exit`) {
      return [s`node.exit`, 0];
    }
  });

  define('node.require',     x => require(x));
  define('node.export', (x, y) => evalJs('module.exports')[x] = y);
  define('node.exports',    () => evalJs('module.exports'));
  symbol('node.global',           global);

  if (!('js.globalThis' in symbols)) {
    symbol('js.globalThis', global);
  }

  return $;
};
