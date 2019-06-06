const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const flatMap = (xs, f) => xs.reduce((ys, x) => (ys.push(...f(x)), ys), []);
const butLast = a => a.length === 0 ? [] : a.slice(0, a.length - 1);
const last = a => a.length === 0 ? null : a[a.length - 1];
const concat = (xss...) => flatMap(xss, x => x);
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
const produce = (proceed, select, next, state, result = []) => {
  for (; proceed(state); state = next(state)) {
    result.push(select(state));
  }
  return result;
};
const raise = x => { throw new Error(x); };
const s = (x, y) => Symbol.for(String.raw(x, y));

module.exports = { AsyncFunction, flatMap, butLast, last, concat, mapAsync, multiMatch, produce, raise, s };
