module.exports = $ => {
  const reduce = $.async
    ? async (xs, f, y) => {
        for (const [k, v] of xs) {
          y = await $.u(f(k, v, y));
        }
        return y;
      }
    : (xs, f, y) => xs.reduce(([k, v], y) => $.t(f(k, v, y)), y);
  const asMap = x => x instanceof Map ? x : $.raise('dict expected');
  const isUpper = x => x >= 65 && x <= 90;
  const pvar = $.s`shen.pvar`;
  const tuple = $.s`shen.tuple`;
  $.defun('@p', (x, y) => [tuple, x, y]);
  $.defun('shen.pvar?', x => $.asShenBool($.isArray(x) && x.length > 0 && x[0] === pvar));
  $.defun('shen.mod', (x, y) => x % y);
  $.defun('shen.byte->digit', x => x - 48);
  $.defun('shen.numbyte?', x => $.asShenBool(x >= 48 && x <= 57));
  $.defun('integer?', x => $.asShenBool(Number.isInteger(x)));
  $.defun('symbol?', x => $.asShenBool($.isSymbol(x)));
  $.defun('variable?', x => $.asShenBool($.isSymbol(x) && isUpper($.nameOf(x).charCodeAt(0))));
  $.defun('shen.dict', _ => new Map());
  $.defun('shen.dict?', x => $.asShenBool(x instanceof Map));
  $.defun('shen.dict-count', d => asMap(d).size);
  $.defun('shen.dict->', (d, k, v) => (asMap(d).set(k, v), v));
  $.defun('shen.<-dict', (d, k) => asMap(d).has(k) ? d.get(k) : $.raise('value not found in dict\r\n'));
  $.defun('shen.dict-rm', (d, k) => (asMap(d).delete(k), k));
  $.defun('shen.dict-fold', (d, f, init) => reduce([...asMap(d).entries()], f, init));
  $.defun('shen.dict-keys', d => $.toList([...asMap(d).keys()]));
  $.defun('shen.dict-values', d => $.toList([...asMap(d).values()]));
  const show = $.show;
  $.show = x => x instanceof Map ? `<Dict ${x.size}>` : show(x);
  return $;
};
