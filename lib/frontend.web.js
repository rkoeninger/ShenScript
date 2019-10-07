const { Id } = require('./ast.js');
const frontend = require('./frontend.js');
const { onReady } = require('./utils.js');

module.exports = async $ => {
  const {
    asShenBool, asString, async, caller, define, defineTyped, evalJs, inline, isNeArray,
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

  const createAttribute = ([name, value]) => {
    const attribute = document.createAttribute(name);
    attribute.value = value;
    return attribute;
  };
  const createElement = (name, args) => args.reduce((element, arg) => {
    const child = buildDomTree(arg);
    return (child instanceof Attr ? element.setAttribute(child.name, child.value) : element.appendChild(child), element);
  }, document.createElement(name));
  const raiseInvalidForm = tree => raise(`dom.tree: invalid form: ${tree}`);
  const buildDomTree = tree =>
    !isNeArray(tree)       ? raiseInvalidForm(tree) :
    tree[0] === s`comment` ? document.createComment(tree.slice(1).join(' ')) :
    tree[0] === s`text`    ? document.createTextNode(tree.slice(1).join(' ')) :
    tree[0] === s`attr`    ? (tree.length !== 3 ? raiseInvalidForm(tree) : createAttribute(tree.slice(1))) :
                             createElement(nameOf(tree[0]), tree.slice(1));

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
