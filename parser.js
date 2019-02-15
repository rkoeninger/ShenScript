const { alt, createLanguage, regexp, string } = require('parsimmon');

const language = createLanguage({
  whitespace: _ => regexp(/\s*/m).desc('whitespace'),
  numeric:    _ => regexp(/-?\d+/).map(Number).desc('numeric'),
  textual:    _ => regexp(/[^"]*/m).wrap(string('"'), string('"')).desc('textual'),
  symbolic:   _ => regexp(/[\w\-\+=*&^%$#@!~`<>,\?\./\\;:{}|]+/).map(Symbol.for).desc('symbolic'),
  value:      r => alt(r.numeric, r.textual, r.symbolic, r.form).desc('value'),
  form:       r => r.value.trim(r.whitespace).many().wrap(string('('), string(')')).desc('form'),
  file:       r => r.value.trim(r.whitespace).many().desc('file')
});
exports.parse = s => language.file.tryParse(s);
