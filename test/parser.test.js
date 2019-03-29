const { equal } = require('assert');
const { parse } = require('../parser');

const s = x => Symbol.for(typeof x === 'string' ? x : x[0]);
const parse1 = s => parse(s)[0];

describe('parsing', () => {
  describe('symbolic literals', () => {
    it('should parse any non-whitespace, non-paren', () => {
      ['abc', 'x\'{', '.<?/^'].forEach(x => equal(s(x), parse1(x)));
    });
  });
  describe('string literals', () => {
    it('should parse empty strings', () => {
      equal('', parse1('""'));
    });
    it('should capture any whitespace', () => {
      ['a\tb', 'a \n b', 'a   b', 'a\r\n\vb'].forEach(x => equal(x, parse1(`"${x}"`)));
    });
    it('should capture all ascii characters', () => {
      ['~!@#$%', '^&*()_+`\'<', '>,./?;:'].forEach(x => equal(x, parse1(`"${x}"`)));
    });
  });
  describe('numberic literals', () => {
    it('should parse zero', () => {
      equal(0, parse1('0'));
    });
    it('should parse numbers', () => {
      [[5, '5'], [287, '287'], [9456, '9456']].forEach(([n, s]) => equal(n, parse1(s)));
    });
    it('should parse negative numbers', () => {
      [[-4, '-4'], [-143, '-143'], [-79, '-79']].forEach(([n, s]) => equal(n, parse1(s)));
    });
  });
  describe('forms', () => {
    it('should parse empty forms as empty arrays', () => {
      equal(0, parse1('()').length);
    });
    it('should parse forms as arrays', () => {
      equal(s`abc`, parse1('(abc)')[0]);
      equal(s`def`, parse1('(abc def)')[1]);
    });
    it('should parse nested forms as nested arrays', () => {
      const expr = parse1('(if (>= 0 X) X (* -1 X))');
      equal(4,     expr.length);
      equal(s`if`, expr[0]);
      equal(3,     expr[1].length);
      equal(s`>=`, expr[1][0]);
      equal(0,     expr[1][1]);
      equal(s`X`,  expr[1][2]);
      equal(s`X`,  expr[2]);
      equal(3,     expr[3].length);
      equal(s`*`,  expr[3][0]);
      equal(-1,    expr[3][1]);
      equal(s`X`,  expr[3][2]);
    });
  });
});
