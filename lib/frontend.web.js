const frontend = require('./frontend');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?

module.exports = $ => {
  const { asShenBool, async, define, symbol, symbols } = $ = frontend($);
  define('web.confirm?', message => asShenBool(confirm(message))); // TODO: need async version
  if (async) {
    define('web.fetch', url => fetch(url).then(x => x.text()));
    define('web.fetch-json', url => fetch(url).then(x => x.json()));
  }
  symbol('web.document', document);
  symbol('web.navigator', navigator);
  symbol('web.window', window);
  if (!('js.globalThis' in symbols)) {
    symbol('js.globalThis', window);
  }
  return $;
};
