const frontend = require('./frontend');

module.exports = $ => {
  const { asShenBool, define } = $ = frontend($);
  define('web.confirm?', message => asShenBool(confirm(message)));
  return $;
};
