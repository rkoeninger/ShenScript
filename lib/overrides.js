module.exports = $ => {
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
  return $;
};
