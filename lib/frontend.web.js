const frontend = require('./frontend');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?

module.exports = $ => {
  const { asShenBool, async, define, symbols, valueOf } = $ = frontend($);
  define('web.confirm?', message => asShenBool(confirm(message)));
  if (async) {
    define('js.fetch', url => fetch(url).then(x => x.text()));
  }
  define('js.window', () => valueOf('js.*window*'));
  symbols['js.*window*'] = window;
  return $;
};
