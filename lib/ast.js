const { generate } = require('astring');

const id = x => x;
const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeName = name => name.split('').map(escapeCharacter).join('');
const validCharactersRegex = /^[_A-Za-z$][_A-Za-z0-9$]*$/;
const validName = name => validCharactersRegex.test(name);

const reserved = [
  'abstract', 'arguments',  'await',        'boolean',   'break',    'byte',    'case',       'catch',
  'char',     'class',      'const',        'continue',  'debugger', 'default', 'delete',     'do',
  'double',   'else',       'enum',         'eval',      'export',   'extends', 'false',      'final',
  'finally',  'float',      'for',          'function',  'goto',     'if',      'implements', 'import',
  'in',       'instanceof', 'int',          'interface', 'let',      'long',    'native',     'new',
  'null',     'package',    'private',      'protected', 'public',   'return',  'short',      'static',
  'super',    'switch',     'synchronized', 'this',      'throw',    'throws',  'transient',  'true',
  'try',      'typeof',     'var',          'void',      'volatile', 'while',   'with',       'yield'
];
const avoidReserved = x => reserved.includes(x) ? x + '_' : x;
const isStmt = true;

const Arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body, });
const Assign = (left, right, operator = '=') => ({ type: 'AssignmentExpression', operator, left, right });
const Async = ast => ({ ...ast, async: true });
const Await = argument => ({ type: 'AwaitExpression', argument });
const Binary = (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right });
const Block = (...body) => ({ type: 'BlockStatement', body, isStmt });
const Call = (callee, args, async = false) => (async ? Await : id)({ type: 'CallExpression', callee, arguments: args });
const Catch = (param, body) => ({ type: 'CatchClause', param, body });
const Class = (id, superClass, body) => ({ type: 'ClassExpression', id, superClass, body: { type: 'ClassBody', body } });
const Conditional = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const Const = (id, init) => Local('const', id, init);
const Debugger = () => ({ type: 'DebuggerStatement', isStmt });
const DoWhile = (test, body) => ({ type: 'WhileStatement', test, body, isStmt });
const Empty = () => ({ type: 'EmptyStatement', isStmt });
const For = (init, test, update, body) => ({ type: 'ForStatement', init, test, update, body, isStmt });
const ForIn = (left, right, body) => ({ type: 'ForInStatement', left, right, body, isStmt });
const ForOf = (left, right, body, await = false) => ({ type: 'ForOfStatement', left, right, body, await, isStmt });
const Generator = (id, params, body) => ({ type: 'FunctionExpression', generator: true, id, params, body });
const Id = name => ({ type: 'Identifier', name });
const If = (test, consequent, alternate) => ({ type: 'IfStatement', test, consequent, alternate, isStmt });
const Iife = (params, args, body, async = false) => Call(Arrow(params, body, async), args, async);
const Let = (id, init) => Local('let', id, init);
const Literal = value => ({ type: 'Literal', value });
const Local = (kind, id, init) => ({
  type: 'VariableDeclaration', kind, declarations: [{ type: 'VariableDeclarator', id, init }], isStmt
});
const Member = (object, property) =>
  property.type === 'Literal' && validName(property.value)
    ? { type: 'MemberExpression', object, property: Id(property.value) }
    : { type: 'MemberExpression', object, property, computed: property.type !== 'Identifier' };
const New = (callee, args) => ({ type: 'NewExpression', callee, arguments: args });
const NewObj = properties => ({ type: 'ObjectExpression', properties });
const NewTarget = () => ({ type: 'MetaProperty', meta: Id('new'), property: Id('target') });
const Procedure = (id, params, body) => ({ type: 'FunctionExpression', id, params, body });
const Program = body => ({ type: 'Program', body });
const Property = (key, value) => ({ type: 'Property', key, value, kind: 'init' });
const Return = argument => ({ type: 'ReturnStatement', argument, isStmt });
const SafeId = (name, suffix = '') => Id(avoidReserved(escapeName(name) + suffix));
const Sequence = (...expressions) => ({ type: 'SequenceExpression', expressions });
const Slot = (kind, key, value) => ({ type: 'MethodDefinition', key, computed: key.type !== 'Identifier', kind, value });
const Spread = argument => ({ type: 'SpreadElement', argument });
const Statement = expression => expression.isStmt ? expression : ({ type: 'ExpressionStatement', expression, isStmt });
const Static = ast => ({ ...ast, static: true });
const Super = () => ({ type: 'Super' });
const TaggedTemplate = (tag, quasi) => ({ type: 'TaggedTemplateExpression', tag, quasi });
const TemplateElement = raw => ({ type: 'TemplateElement', value: { raw } });
const TemplateLiteral = (quasis, expressions) => ({ type: 'TemplateLiteral', quasis, expressions });
const Template = (tag, raw) => TaggedTemplate(tag, TemplateLiteral([TemplateElement(raw)], []));
const This = () => ({ type: 'ThisExpression' });
const Try = (block, handler) => ({ type: 'TryStatement', block, handler, isStmt });
const Unary = (operator, argument, prefix = true) => ({ type: 'UnaryExpression', operator, argument, prefix });
const Var = (id, init) => Local('var', id, init);
const Vector = elements => ({ type: 'ArrayExpression', elements });
const While = (test, body) => ({ type: 'WhileStatement', test, body, isStmt });
const Yield = argument => ({ type: 'YieldExpression', argument });
const YieldMany = argument => ({ type: 'YieldExpression', delegate: true, argument });

module.exports = {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger, DoWhile,
  Empty, For, ForIn, ForOf, Generator, Id, If, Iife, Let, Literal, Local, Member, New, NewObj, NewTarget, Procedure,
  Program, Property, Return, SafeId, Sequence, Slot, Spread, Statement, Static, Super, TaggedTemplate, Template,
  TemplateElement, TemplateLiteral, This, Try, Unary, Var, Vector, While, Yield, YieldMany,
  generate
};
