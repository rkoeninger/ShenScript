const frontend = require('./frontend');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?

module.exports = $ => {
  const { asShenBool, define } = $ = frontend($);
  define('web.confirm?', message => asShenBool(confirm(message)));
  return $;
};
