const frontend = require('./frontend');

module.exports = $ => {
  const { define } = $ = frontend($);
  define('node.exit', x => process.exit(x));
  define('js.global', () => valueOf('js.*global*'));
  symbols['js.*global*'] = global;
  return $;
};
