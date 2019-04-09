const { generate } = require('astring');

const Arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body, });
const Assign = (left, right) => ({ type: 'AssignmentExpression', operator: '=', left, right });
const Await = argument => ({ type: 'AwaitExpression', argument });
const Binary = (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right });
const Block = body => ({ type: 'BlockStatement', body });
const Call = (callee, args) => ({ type: 'CallExpression', callee, arguments: args });
const Catch = (param, body) => ({ type: 'CatchClause', param, body });
const Do = expressions => ({ type: 'SequenceExpression', expressions });
const Identifier = name => ({ type: 'Identifier', name });
const If = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const Literal = value => ({ type: 'Literal', value });
const Member = (object, property) => ({ type: 'MemberExpression', object, property, computed: property.type !== 'Identifier' });
const Program = body => ({ type: 'Program', body });
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
  Arrow, Assign, Await, Binary, Block, Call, Catch, Do, Identifier, If, Literal, Member, Program,
  Return, Statement, TaggedTemplate, TemplateElement, TemplateLiteral, Try, Unary, Vector,
  adorn, ann, generate
};
