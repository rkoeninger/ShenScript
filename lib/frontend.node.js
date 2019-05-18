const frontend = require('./frontend');

module.exports = $ => {
  const { define, symbol, symbols } = $ = frontend($);
  define('node.exit', x => process.exit(x));
  define('node.require', x => require(x));
  // TODO: (node.exports ExportsObject) ?
  symbol('node.global', global);
  if (!('js.globalThis' in symbols)) {
    symbol('js.globalThis', global);
  }
  return $;
};
