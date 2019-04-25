const { generate } = require('astring');

const id = x => x;
const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeName = name => name.split('').map(escapeCharacter).join('');
const validCharactersRegex = /^[_A-Za-z\$][_A-Za-z0-9\$]*$/;
const validName = name => validCharactersRegex.test(name);

const Arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body, });
const Assign = (left, right) => ({ type: 'AssignmentExpression', operator: '=', left, right });
const Await = argument => ({ type: 'AwaitExpression', argument });
const Binary = (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right });
const Block = (...body) => ({ type: 'BlockStatement', body });
const Call = (callee, args, async = false) => (async ? Await : id)({ type: 'CallExpression', callee, arguments: args });
const Catch = (param, body) => ({ type: 'CatchClause', param, body });
const Do = (...expressions) => ({ type: 'SequenceExpression', expressions });
const Identifier = name => ({ type: 'Identifier', name: escapeName(name) });
const If = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const Iife = (body, async = false) => Call(Arrow([], body, async), [], async);
const Literal = value => ({ type: 'Literal', value });
const Member = (object, property) =>
  property.type === 'Literal' && validName(property.value)
    ? { type: 'MemberExpression', object, property: RawIdentifier(property.value) }
    : { type: 'MemberExpression', object, property, computed: property.type !== 'Identifier' };
const New = (callee, args) => ({ type: 'NewExpression', callee, arguments: args });
const Program = body => ({ type: 'Program', body });
const RawIdentifier = name => ({ type: 'Identifier', name });
const Return = argument => ({ type: 'ReturnStatement', argument });
const Statement = expression => ({ type: 'ExpressionStatement', expression });
const TaggedTemplate = (tag, quasi) => ({ type: 'TaggedTemplateExpression', tag, quasi });
const TemplateElement = raw => ({ type: 'TemplateElement', value: { raw } });
const TemplateLiteral = (quasis, expressions) => ({ type: 'TemplateLiteral', quasis, expressions });
const Try = (block, handler) => ({ type: 'TryStatement', block, handler });
const Unary = (operator, argument, prefix) => ({ type: 'UnaryExpression', operator, argument, prefix: true });
const Vector = elements => ({ type: 'ArrayExpression', elements });

const adorn = (tag, raw) => TaggedTemplate(tag, TemplateLiteral([TemplateElement(raw)], []));
const ann = (dataType, ast) => Object.assign(ast, { dataType });

module.exports = {
  Arrow, Assign, Await, Binary, Block, Call, Catch, Do, Identifier, If, Iife, Literal, Member, New, Program,
  RawIdentifier, Return, Statement, TaggedTemplate, TemplateElement, TemplateLiteral, Try, Unary, Vector,
  adorn, ann, generate
};
