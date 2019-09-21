module.exports = $ => {
  const false$s$ = $.s`false`;
  $.defun('shen.mod', (x, y) => $.asNumber(x) % $.asNumber(y));
  $.defun('symbol?', x => $.asShenBool($.isSymbol(x)));
  $.defun('variable?', x => {
    if (!$.isSymbol(x)) {
      return false$s$;
    }
    const name = $.nameOf(x);
    if (name.length === 0) {
      return false$s$;
    }
    const ch = name.charCodeAt(0);
    return $.asShenBool(ch >= 65 && ch <= 90);
  });
  return $;
};
