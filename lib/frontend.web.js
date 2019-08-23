const { Id } = require('./ast');
const frontend = require('./frontend');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?

module.exports = $ => {
  const { asShenBool, async, define, evalJs, inline, symbol, symbols } = $ = frontend($);
  inline('web.self', () => Id('self'));

  if (async) {
    define('web.fetch',      url => fetch(url).then(x => x.text()));
    define('web.fetch-json', url => fetch(url).then(x => x.json()));
  }

  define('web.confirm?', message => asShenBool(confirm(message))); // TODO: need async version
  symbol('web.document', document);
  symbol('web.navigator', navigator);
  symbol('web.self', () => evalJs(Id('self')));
  symbol('web.window', window);

/*
(defmacro web.worker-macro
  [web.worker Param Body] ->
    (js.ast.assign
      (js.ast.member (js.ast.id "self") (js.ast.id "onmessage"))
      (js.ast.compile (macroexpand [/. Param Body]))))

(define js.string->base64
  {string --> string}
  S -> S)

(define web.workers.new
  {string --> worker}
  Code -> (js.new (js.Worker) [(js.encode-uri (@s "data:text/javascript;base64," (js.string->base64 Code)))]))

(define web.workers.listen
  {worker --> (A --> B) --> unit}
  Worker F -> (js.set-on Worker "onmessage" F))

(define web.workers.send
  {worker --> A --> unit}
  Worker Message -> (js.call-on Worker "postMessage" [Message]))
 */

  if (!('js.globalThis' in symbols)) {
    symbol('js.globalThis', window);
  }

  return $;
};
