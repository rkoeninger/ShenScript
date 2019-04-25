const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const bound = (x, name) => {
  const y = x[name];
  return typeof y === 'function' ? y.bind(x) : y;
};
const last = a => a.length === 0 ? null : a[a.length - 1];
const mapAsync = async (ps, f) => {
  let y = [];
  for (const p of ps) {
    y.push(await f(await p));
  }
  return y;
};
const produce = (proceed, select, next, state, result = []) => {
  for (; proceed(state); state = next(state)) {
    result.push(select(state));
  }
  return result;
};
const raise = x => { throw new Error(x); };
const s = (x, y) => Symbol.for(String.raw(x, y));
const top = typeof window !== 'undefined' ? window : global;

module.exports = { AsyncFunction, bound, last, mapAsync, produce, raise, s, top };
