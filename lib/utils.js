const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const last = a => a.length === 0 ? null : a[a.length - 1];
const mapAsync = async (ps, f) => {
  let y = [];
  for (const p of ps) {
    y.push(await f(await p));
  }
  return y;
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

module.exports = { AsyncFunction, last, mapAsync, multiMatch, produce, raise, s };
