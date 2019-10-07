const { Id } = require('./ast.js');
const frontend = require('./frontend.js');
const { onReady } = require('./utils.js');

module.exports = async $ => {
  const {
    asShenBool, asString, async, caller, define, defineTyped, evalJs, inline, isArray,
    lookup, nameOf, raise, run, s, symbol, symbolOf, toArray, toArrayTree, toList, valueOf
  } = $ = await frontend($);

  await defineTyped('web.atob', [s`string`, s`-->`, s`string`], x => atob(asString(x)));
  await defineTyped('web.btoa', [s`string`, s`-->`, s`string`], x => btoa(asString(x)));

  if (async) {
    await define('y-or-n?', m => new Promise(f => f(asShenBool(confirm(m)))));
    await defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => new Promise(f => f(asShenBool(confirm(m)))));
    await defineTyped('web.fetch-text', [s`string`, s`-->`, s`string`], url => fetch(url).then(x => x.text()));
    await defineTyped('web.fetch-json', [s`string`, s`-->`, s`A`], url => fetch(url).then(x => x.json()));
    await defineTyped('web.fetch-text*', [[s`list`, s`string`], s`-->`, [s`list`, s`string`]],
      urls => Promise.all(toArray(urls).map(url => fetch(url).then(x => x.text()))).then(x => toList(x)));
    await defineTyped('web.fetch-json*', [[s`list`, s`string`], s`-->`, [s`list`, s`A`]],
      urls => Promise.all(toArray(urls).map(url => fetch(url).then(x => x.json()))).then(x => toList(x)));
  } else {
    await define('y-or-n?', m => asShenBool(confirm(m)));
    await defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => asShenBool(confirm(m)));
  }

  await symbol('web.document', document);
  await symbol('web.navigator', navigator);
  await symbol('web.self', () => evalJs(Id('self')));
  await symbol('web.window', window);

  inline('web.self', () => Id('self'));

  if (!lookup('js.globalThis').valueExists) {
    await symbol('js.globalThis', window);
  }

  if (typeof Worker !== 'undefined') {
    await symbol('web.Worker', Worker);
  }

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
  await define('dom.on-ready', f => (onReady(() => run(f())), null));

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
