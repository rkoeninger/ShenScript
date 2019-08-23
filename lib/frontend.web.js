const { Assign, Id, Member, Statement, generate } = require('./ast');
const frontend = require('./frontend');

// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?

module.exports = $ => {
  const {
    asShenBool, asString, async, compile, define, defineTyped, defmacro,
    evalJs, exec, inline, isArray, isSymbol, s, symbol, symbols
  } = $ = frontend($);

  define('web.atob', x => atob(x));
  define('web.btoa', x => btoa(x));

  if (async) {
    defineTyped(
      'web.confirm?',
      [s`string`, s`-->`, s`boolean`],
      message => new Promise(resolve => resolve(asShenBool(confirm(message)))));
    defineTyped(
      'web.fetch',
      [s`string`, s`-->`, s`string`],
      url => fetch(url).then(x => x.text()));
    defineTyped(
      'web.fetch-json',
      [s`string`, s`-->`, s`A`],
      url => fetch(url).then(x => x.json()));
  } else {
    defineTyped(
      'web.confirm?',
      [s`string`, s`-->`, s`boolean`],
      message => asShenBool(confirm(message)));
  }

  symbol('web.document', document);
  symbol('web.navigator', navigator);
  symbol('web.self', () => evalJs(Id('self')));
  symbol('web.window', window);

  inline('web.self', () => Id('self'));

  if (!('js.globalThis' in symbols)) {
    symbol('js.globalThis', window);
  }

  if (typeof Worker !== 'undefined') {
    symbol('web.Worker', Worker);
  }

  defineTyped(
    'web.workers.listen',
    [s`worker`, s`-->`, [s`A`, s`-->`, s`unit`], s`-->`, s`unit`],
    (worker, callback) => (worker.onmessage = callback, null));
  defineTyped(
    'web.workers.new',
    [s`string`, s`-->`, s`worker`],
    code => new Worker(encodeURI('data:text/javascript;base64,' + btoa(asString(code)))));
  defineTyped(
    'web.workers.send',
    [s`worker`, s`-->`, s`A`, s`-->`, s`unit`],
    (worker, message) => worker.postMessage(message));

  exec(`
    (defmacro web.worker-macro
      [web.worker Param Body] ->
        [web.workers.new
          (js.ast.render
            (js.ast.block
              [(js.ast.call
                  (js.ast.member (js.ast.id "self") (js.ast.id "importScripts"))
                  [(js.ast.array [(js.ast.literal "index.js")])])
                (js.ast.let (js.ast.id "$") (js.ast.id "shen"))
                (js.ast.assign
                  (js.ast.member (js.ast.id "self") (js.ast.id "onmessage"))
                  (js.ast.compile [lambda Param Body]))]))])`);

  defmacro('web.worker-macro', expr => {
    if (isArray(expr) && expr.length === 3 && expr[0] === s`web.worker` && isSymbol(expr[1])) {
      const code = generate(Statement(Assign(
        Member(Id('self'), Id('onmessage')),
        compile([s`lambda`, expr[1], expr[2]])))); // TODO: body needs to be macroexpand-ed?
      return [s`web.workers.new`, code];
    }
  });

  return $;
};
