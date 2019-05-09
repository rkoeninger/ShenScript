const frontend = require('./frontend');

module.exports = $ => {
  const { define, symbol } = $ = frontend($);
  define('node.exit', x => process.exit(x));
  define('node.require', x => require(x));
  // TODO: (node.exports ExportsObject) ?
  symbol('node.global', global);
  symbol('js.root', global);
  return $;
};
