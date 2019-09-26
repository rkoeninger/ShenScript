const { Assign, Id, Member, Statement, generate } = require('./ast');
const frontend = require('./frontend');

module.exports = $ => {
  const {
    asShenBool, asString, async, caller, compile, define, defineTyped, defmacro,
    eternal, evalJs, inline, isArray, isSymbol, s, symbol, symbolOf, toList, valueOf
  } = $ = frontend($);

  defineTyped('web.atob', [s`string`, s`-->`, s`string`], x => atob(asString(x)));
  defineTyped('web.btoa', [s`string`, s`-->`, s`string`], x => btoa(asString(x)));

  if (async) {
    define('y-or-n?', m => new Promise(f => f(asShenBool(confirm(m)))));
    defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => new Promise(f => f(asShenBool(confirm(m)))));
    defineTyped('web.fetch', [s`string`, s`-->`, s`string`], url => fetch(url).then(x => x.text()));
    defineTyped('web.fetch-json', [s`string`, s`-->`, s`A`], url => fetch(url).then(x => x.json()));
    // TODO: add web.fetch* that does multiple async requests in parallel
  } else {
    define('y-or-n?', m => asShenBool(confirm(m)));
    defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => asShenBool(confirm(m)));
  }

  symbol('web.document', document);
  symbol('web.navigator', navigator);
  symbol('web.self', () => evalJs(Id('self')));
  symbol('web.window', window);

  inline('web.self', () => Id('self'));

  if (!eternal('js.globalThis').valueExists) {
    symbol('js.globalThis', window);
  }

  if (typeof Worker !== 'undefined') {
    symbol('web.Worker', Worker);
  }

  // TODO: when a worker is created, it needs to create a new environment,
  //       and then receive expressions to evaluate, not just some
  //       arbitrary code to be the worker body
  defineTyped(
    'web.workers.listen',
    [s`web.worker`, s`-->`, [s`A`, s`-->`, s`unit`], s`-->`, s`unit`],
    (worker, callback) => (worker.onmessage = callback, null));
  defineTyped(
    'web.workers.new',
    [s`string`, s`-->`, s`web.worker`],
    code => new Worker(encodeURI('data:text/javascript;base64,' + btoa(asString(code)))));
  defineTyped(
    'web.workers.send',
    [s`web.worker`, s`-->`, s`A`, s`-->`, s`unit`],
    (worker, message) => worker.postMessage(message));
  defmacro('web.worker-macro', expr => {
    if (isArray(expr) && expr.length === 3 && expr[0] === s`web.worker` && isSymbol(expr[1])) {
      const code = generate(Statement(Assign(
        Member(Id('self'), Id('onmessage')),
        compile([s`lambda`, expr[1], expr[2]])))); // TODO: body needs to be macroexpand-ed?
      return [s`web.workers.new`, code];
    }
  });

  /*************************
   * Declare Port Features *
   *************************/

  caller('shen.x.features.initialise')(toList([s`js`, s`shen-script`, s`web`, symbolOf(valueOf('*os*').toLowerCase())]));

  return $;
};
