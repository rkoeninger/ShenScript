module.exports = $ => {
  const untrue = $.s`false`;
  const pvar = $.s`shen.pvar`;
  const tuple = $.s`shen.tuple`;
  $.defun('@p', (x, y) => [3, tuple, x, y]);
  $.defun('shen.pvar?', x => $.asShenBool($.isArray(x) && x.length > 0 && x[0] === pvar));
  $.defun('shen.mod', (x, y) => x % y);
  $.defun('shen.byte->digit', x => x - 48);
  $.defun('shen.numbyte?', x => $.asShenBool(x >= 48 && x <= 57));
  $.defun('integer?', x => Number.isInteger(x));
  $.defun('symbol?', x => $.asShenBool($.isSymbol(x)));
  $.defun('variable?', x => {
    if (!$.isSymbol(x)) {
      return untrue;
    }
    const name = $.nameOf(x);
    if (name.length === 0) {
      return untrue;
    }
    const ch = name.charCodeAt(0);
    return $.asShenBool(ch >= 65 && ch <= 90);
  });
  return $;
};
