const frontend = require('./frontend');

module.exports = $ => {
  const { define, symbol } = $ = frontend($);
  define('node.exit', x => process.exit(x));
  symbol('global', global);
  return $;
};
