const { Id } = require('./ast.js');
const frontend = require('./frontend.js');
const { onReady } = require('./utils.js');

module.exports = async $ => {
  const {
    asShenBool, asString, caller, define, defineTyped, defun, evalJs, inline, isFunction, isNeArray, isString,
    isSymbol, lookup, nameOf, raise, s, settle, show, symbol, symbolOf, toArray, toArrayTree, toList, valueOf
  } = $ = await frontend($);

  await defineTyped('web.atob', [s`string`, s`-->`, s`string`], x => atob(asString(x)));
  await defineTyped('web.btoa', [s`string`, s`-->`, s`string`], x => btoa(asString(x)));

  await defun('y-or-n?', m => new Promise(f => f(asShenBool(confirm(m)))));
  await defineTyped('web.confirm?', [s`string`, s`-->`, s`boolean`], m => new Promise(f => f(asShenBool(confirm(m)))));
  await defineTyped('web.fetch-text', [s`string`, s`-->`, s`string`], url => fetch(url).then(x => x.text()));
  await defineTyped('web.fetch-json', [s`string`, s`-->`, s`A`], url => fetch(url).then(x => x.json()));
  await defineTyped('web.fetch-text*', [[s`list`, s`string`], s`-->`, [s`list`, s`string`]],
    urls => Promise.all(toArray(urls).map(url => fetch(url).then(x => x.text()))).then(x => toList(x)));
  await defineTyped('web.fetch-json*', [[s`list`, s`string`], s`-->`, [s`list`, s`A`]],
    urls => Promise.all(toArray(urls).map(url => fetch(url).then(x => x.json()))).then(x => toList(x)));

  await symbol('web.document', document);
  await symbol('web.navigator', navigator);
  await symbol('web.self', () => evalJs(Id('self')));
  await symbol('web.window', window);

  inline('web.self', null, [], () => Id('self'));

  if (!lookup('js.globalThis').valueExists) {
    await symbol('js.globalThis', window);
  }

  if (typeof Worker !== 'undefined') {
    await symbol('web.Worker', Worker);
  }

  /*************************************
   * DOM-Construction and Manipulation *
   *************************************/

  const raiseInvalidForm = tree => raise(`dom.build: invalid form: ${show(tree)}`);
  const buildAttribute = (name, value) => Object.assign(document.createAttribute(name), { value });
  const buildEventHandler = (event, f) => Object.assign(f, { event });
  const buildElement = (element, children) => (
    children.forEach(child =>
      child instanceof Attr ? element.setAttributeNode(child) :
      isFunction(child)     ? element['on' + child.event] = e => (settle(child(e)), null) :
      element.appendChild(child)),
    element);
  const buildTree = tree =>
    isString(tree)                          ? document.createTextNode(tree) :
    !(isNeArray(tree) && isSymbol(tree[0])) ? raiseInvalidForm(tree) :
    nameOf(tree[0]).startsWith('@')         ? buildAttribute(nameOf(tree[0]).substring(1), tree[1]) :
    nameOf(tree[0]).startsWith('!')         ? buildEventHandler(nameOf(tree[0]).substring(1), tree[1]) :
    buildElement(document.createElement(nameOf(tree[0])), tree.slice(1).map(buildTree));

  await define('dom.append', (parent, child) => (parent.appendChild(child), null));
  await define('dom.build', tree => buildTree(toArrayTree(tree)));
  await define('dom.onready', f => (onReady(() => settle(f())), null));
  await define('dom.prepend', (parent, child) => (parent.insertBefore(child, parent.firstChild), null));
  await define('dom.query', selector => document.querySelector(selector));
  await define('dom.query*', selector => toList([...document.querySelectorAll(selector).entries()]));
  await define('dom.remove', node => (node.parentNode && node.parentNode.removeChild(node), null));
  await define('dom.replace', (target, node) => (target.parentNode && target.parentNode.replaceChild(node, target), null));

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
