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

  // TODO: add web.fetch* that does multiple async requests in parallel

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

  // TODO: when a worker is created, it needs to create a new environment,
  //       and then receive expressions to evaluate, not just some
  //       arbitrary code
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

  return $;
};
