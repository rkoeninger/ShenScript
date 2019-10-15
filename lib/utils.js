const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const GeneratorFunction = Object.getPrototypeOf(function*() {}).constructor;

class StringInStream {
  constructor(text) {
    this.text = text;
    this.pos = 0;
  }
  read() {
    return this.pos >= this.text.length
      ? -1
      : this.text.charCodeAt(this.pos++);
  }
  close() {
    return (this.pos = Infinity, null);
  }
}

const fetchRead = async path => new StringInStream(await (await fetch(path)).text());
const flatMap = (xs, f) => {
  const ys = [];
  for (const x of xs) {
    for (const y of f(x)) {
      ys.push(y);
    }
  }
  return ys;
};
const most = a => a.length === 0 ? [] : a.slice(0, a.length - 1);
const last = a => a.length === 0 ? undefined : a[a.length - 1];
const mapAsync = async (xs, f) => {
  const ys = [];
  for (const x of xs) {
    ys.push(await f(await x));
  }
  return ys;
};
const multiMatch = (key, ...pairs) => {
  for (const [regex, result] of pairs) {
    if (regex.test(key)) {
      return result;
    }
  }
  return 'Unknown';
};
const onReady = f =>
  (document.readyState === 'complete' || (document.readyState !== 'loading' && !document.documentElement.doScroll))
    ? f()
    : document.addEventListener('DOMContentLoaded', f);
const pairs = (xs, message = 'array must be of even length') =>
  xs.length % 2 === 0
    ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), xs)
    : raise(message);
const produceState = (proceed, select, next, state, result = []) => {
  for (; proceed(state); state = next(state)) {
    result.push(select(state));
  }
  return { result, state };
};
const produce = (proceed, select, next, state, result = []) =>
  produceState(proceed, select, next, state, result).result;
const raise = x => { throw new Error(x); };
const s = (x, y) => Symbol.for(String.raw(x, y));

module.exports = {
  AsyncFunction, GeneratorFunction, StringInStream,
  fetchRead, flatMap, last, mapAsync, most, multiMatch, onReady, pairs, produce, produceState, raise, s
};
