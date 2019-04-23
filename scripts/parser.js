const fs                                      = require('fs');
const { alt, createLanguage, regexp, string } = require('parsimmon');
const { klPath, klFiles, klExt }              = require('./config');

const language = createLanguage({
  whitespace: _ => regexp(/\s*/m),
  numeric:    _ => regexp(/-?\d+/).map(Number),
  textual:    _ => regexp(/[^"]*/m).trim(string('"')),
  symbolic:   _ => regexp(/[^\s\(\)]+/).map(Symbol.for),
  value:      r => alt(r.numeric, r.textual, r.symbolic, r.form),
  form:       r => r.value.trim(r.whitespace).many().wrap(string('('), string(')')),
  file:       r => r.value.trim(r.whitespace).many()
});
const parseFile = s => language.file.tryParse(s);
const parseForm = s => parseFile(s)[0];
const parseKernel = () => {
  const defuns = [], statements = [];

  klFiles.forEach(file => parseFile(fs.readFileSync(`${klPath}/${file}${klExt}`, 'utf-8')).forEach(expr => {
    if (Array.isArray(expr) && expr.length > 0) {
      (expr[0] === Symbol.for('defun') ? defuns : statements).push(expr);
    }
  }));

  return { defuns, statements };
};

module.exports = { parseFile, parseForm, parseKernel };
