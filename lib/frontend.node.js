const frontend = require('./frontend');

module.exports = $ => {
  const { define } = $ = frontend($);
  define('node.exit', x => process.exit(x));
  return $;
};
