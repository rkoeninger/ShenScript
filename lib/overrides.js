module.exports = $ => {
  const {
    asArray, asCons, asNumber, asShenBool, cons, defun, equate,
    isArray, isCons, isSymbol, lookup, nameOf, raise, s, settle, toArray, toList
  } = $;
  const asMap = x => x instanceof Map ? x : raise('dict expected');
  const isUpper = x => x >= 65 && x <= 90;
  const pvar = s`shen.pvar`;
  const tuple = s`shen.tuple`;
  const arity = s`arity`;
  const t$ = s`true`;
  const f$ = s`false`;
  const propertyVector = lookup('*property-vector*');
  defun('@p', (x, y) => [tuple, x, y]);
  defun('shen.pvar?', x => asShenBool(isArray(x) && x.length > 0 && x[0] === pvar));
  defun('shen.byte->digit', x => x - 48);
  defun('shen.numbyte?', x => asShenBool(x >= 48 && x <= 57));
  defun('integer?', x => asShenBool(Number.isInteger(x)));
  defun('symbol?', x => asShenBool(isSymbol(x) && x !== t$ && x !== f$));
  defun('variable?', x => asShenBool(isSymbol(x) && isUpper(nameOf(x).charCodeAt(0))));
  defun('shen.fillvector', (xs, i, max, x) => asArray(xs).fill(x, asNumber(i), asNumber(max) + 1));
  defun('shen.initialise_arity_table', xs => {
    for (; isCons(xs); xs = xs.tail.tail) {
      propertyVector.get().set(xs.head, cons(cons(arity, xs.tail.head), null));
    }
    return null;
  });
  defun('put', (x, p, y, d) => {
    const current = asMap(d).has(x) ? d.get(x) : null;
    const array = toArray(current);
    for (const element of array) {
      if (equate(p, asCons(element).head)) {
        element.tail = y;
        d.set(x, toList(array));
        return y;
      }
    }
    array.push(cons(p, y));
    d.set(x, toList(array));
    return y;
  });
  defun('shen.dict', _ => new Map());
  defun('shen.dict?', x => asShenBool(x instanceof Map));
  defun('shen.dict-count', d => asMap(d).size);
  defun('shen.dict->', (d, k, v) => (asMap(d).set(k, v), v));
  defun('shen.<-dict', (d, k) => asMap(d).has(k) ? d.get(k) : raise('value not found in dict\r\n'));
  defun('shen.dict-rm', (d, k) => (asMap(d).delete(k), k));
  defun('shen.dict-fold', async (d, f, acc) => {
    for (const [k, v] of asMap(d)) {
      acc = await settle(f(k, v, acc));
    }
    return acc;
  });
  defun('shen.dict-keys', d => toList([...asMap(d).keys()]));
  defun('shen.dict-values', d => toList([...asMap(d).values()]));
  const oldShow = $.show;
  $.show = x => x instanceof Map ? `<Dict ${x.size}>` : oldShow(x);
  const credits = lookup('shen.credits').f;
  const pr = lookup('pr').f;
  const stoutput = lookup('*stoutput*');
  defun('shen.credits', async () => {
    await settle(credits());
    return await settle(pr('exit REPL with (node.exit)', stoutput.get()));
  });
  return $;
};
