const { Assign, Id, Member, Statement, generate } = require('./ast.js');
const frontend = require('./frontend.js');
const { flatMap } = require('./utils.js');

module.exports = async $ => {
  const {
    asShenBool, asString, async, caller, compile, define, defineTyped, defmacro, eternal, evalJs,
    inline, isArray, isSymbol, nameOf, raise, s, show, symbol, symbolOf, toArrayTree, toList, valueOf
  } = $ = await frontend($);

  await defineTyped('web.atob', [s`string`, s`-->`, s`string`], x => atob(asString(x)));
  await defineTyped('web.btoa', [s`string`, s`-->`, s`string`], x => btoa(asString(x)));

  if (async) {
    await define('y-or-n?', m => new Promise(f => f(asShenBool(confirm(m)))));
    await defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => new Promise(f => f(asShenBool(confirm(m)))));
    await defineTyped('web.fetch', [s`string`, s`-->`, s`string`], url => fetch(url).then(x => x.text()));
    await defineTyped('web.fetch-json', [s`string`, s`-->`, s`A`], url => fetch(url).then(x => x.json()));
    // TODO: add web.fetch* that does multiple async requests in parallel
  } else {
    await define('y-or-n?', m => asShenBool(confirm(m)));
    await defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => asShenBool(confirm(m)));
  }

  await symbol('web.document', document);
  await symbol('web.navigator', navigator);
  await symbol('web.self', () => evalJs(Id('self')));
  await symbol('web.window', window);

  inline('web.self', () => Id('self'));

  if (!eternal('js.globalThis').valueExists) {
    await symbol('js.globalThis', window);
  }

  if (typeof Worker !== 'undefined') {
    await symbol('web.Worker', Worker);
  }

  // TODO: remove all this worker stuff
  // TODO: when a worker is created, it needs to create a new environment,
  //       and then receive expressions to evaluate, not just some
  //       arbitrary code to be the worker body
  await defineTyped(
    'web.workers.listen',
    [s`web.worker`, s`-->`, [s`A`, s`-->`, s`unit`], s`-->`, s`unit`],
    (worker, callback) => (worker.onmessage = callback, null));
  await defineTyped(
    'web.workers.new',
    [s`string`, s`-->`, s`web.worker`],
    code => new Worker(encodeURI('data:text/javascript;base64,' + btoa(asString(code)))));
  await defineTyped(
    'web.workers.send',
    [s`web.worker`, s`-->`, s`A`, s`-->`, s`unit`],
    (worker, message) => worker.postMessage(message));
  await defmacro('web.worker-macro', expr => {
    if (isArray(expr) && expr.length === 3 && expr[0] === s`web.worker` && isSymbol(expr[1])) {
      const code = generate(Statement(Assign(
        Member(Id('self'), Id('onmessage')),
        compile([s`lambda`, expr[1], expr[2]])))); // TODO: body needs to be macroexpand-ed?
      return [s`web.workers.new`, code];
    }
  });

  /*************************************
   * DOM-Construction and Manipulation *
   *************************************/

  const buildDomTree = tree => {
    if (isArray(tree) && tree.length > 0) {
      const [first, ...rest] = tree;
      const name = nameOf(first);
      if (name === 'text') {
        return document.createTextNode(rest.join(' '));
      } else if (name === 'comment') {
        return document.createComment(rest.join(' '));
      } else if (name === 'attr') {
        if (rest.length === 2) {
          const [name, value] = rest;
          const attr = document.createAttribute(name);
          attr.value = value;
          return attr;
        } else {
          raise('attr dom node must have 2 arguments');
        }
      } else {
        const element = document.createElement(name);
        for (const arg of rest) {
          const child = buildDomTree(arg);
          if (child instanceof Attr) {
            element.setAttribute(child.name, child.value);
          } else {
            element.appendChild(child);
          }
        }
        return element;
      }
    } else {
      raise('components of dom tree must be non-empty lists starting with node type id');
    }
  };

  await define('dom.tree', tree => buildDomTree(toArrayTree(tree)));
  await define('dom.append', (parent, child) => (parent.appendChild(child), null));
  await define('dom.remove', node => (node.parentNode && node.parentNode.removeChild(node), null));
  await define('dom.replace', (target, node) => (target.parentNode && target.parentNode.replaceChild(node, target), null));
  await define('dom.query', selector => document.querySelector(selector));
  await define('dom.query*', selector => toList([...document.querySelectorAll(selector).entries()]));

  /*************************
   * Declare Port Features *
   *************************/

  const features = [
    s`shen-script`,
    s`js`,
    s`web`,
    symbolOf(valueOf('*implementation*').toLowerCase().split(' ').join('-')),
    symbolOf(valueOf('*os*').toLowerCase())];
  await caller('shen.x.features.initialise')(toList(features));

  return $;
};
