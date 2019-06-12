const { Id, Member } = require('./ast');
const frontend = require('./frontend');

module.exports = $ => {
  const { define, defmacro, evalJs, inline, isArray, s, symbol, symbols } = $ = frontend($);

  // TODO: would we actually be writing node modules in shen?
  //       just use (load) instead? write a js module that calls $.load?
  inline('node.exports', () => Member(Id('module'), Id('exports')));
  define('node.export', (x, y, z) => z[x] = y);
  defmacro('node.export-macro', expr => {
    if (isArray(expr) && expr.length === 3 && expr[0] === s`node.export`) {
      return [...expr, [s`node.exports`]];
    }
  });
  defmacro('node.export*-macro', expr => {
    if (isArray(expr) && expr.length > 0 && expr[0] === s`node.export*`) {
      return expr.length === 3 || expr.length === 4
        ? [s`node.export`, ...expr.slice(1)]
        : [s`node.export`, expr[1], expr[2], [s`node.export*`, ...expr.slice(3)]];
    }
  });

  define('node.exit', x => process.exit(x));
  defmacro('node.exit-macro', expr => {
    if (isArray(expr) && expr.length === 1 && expr[0] === s`node.exit`) {
      return [...expr, 0];
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
