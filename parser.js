const { alt, createLanguage, optWhitespace, regexp, string } = require('parsimmon');

const Numeric = () => regexp(/[0-9]+/).map(Number);
const CharSeq = () => regexp(/"[^"]*"/);
const Symbolic = () => regexp(/[a-z]+/).map(Symbol.for);
const Form = r => string('(').then(r.Value.sepBy(r._)).skip(string(')'));
const Value = r => alt(r.Numeric, r.CharSeq, r.Symbolic, r.Form);
const _ = () => optWhitespace;
const lang = createLanguage({ Numeric, CharSeq, Symbolic, Form, Value, _ });

export const parse = syntax => lang.Value.tryParse(syntax);
