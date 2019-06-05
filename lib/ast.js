const { generate } = require('astring');

const id = x => x;
const hex = ch => ('0' + ch.charCodeAt(0).toString(16)).slice(-2);
const validCharacterRegex = /^[_A-Za-z0-9]$/;
const escapeCharacter = ch => validCharacterRegex.test(ch) ? ch : ch === '-' ? '_' : `$${hex(ch)}`;
const escapeName = name => name.split('').map(escapeCharacter).join('');
const validCharactersRegex = /^[_A-Za-z$][_A-Za-z0-9$]*$/;
const validName = name => validCharactersRegex.test(name);

const Arrow = (params, body, async = false) => ({ type: 'ArrowFunctionExpression', async, params, body, });
const Assign = (left, right) => ({ type: 'AssignmentExpression', operator: '=', left, right });
const Await = argument => ({ type: 'AwaitExpression', argument });
const Binary = (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right });
const Block = (...body) => ({ type: 'BlockStatement', body });
const Call = (callee, args, async = false) => (async ? Await : id)({ type: 'CallExpression', callee, arguments: args });
const Catch = (param, body) => ({ type: 'CatchClause', param, body });
const Class = (id, superClass, body) => ({ type: 'ClassExpression', id, superClass, body: { type: 'ClassBody', body } });
const Const = (id, init) => Local('const', id, init);
const Debugger = { type: 'DebuggerStatement' };
const Do = (...expressions) => ({ type: 'SequenceExpression', expressions });
const RawIdentifier = name => ({ type: 'Identifier', name });
const Generator = body => ({ type: 'FunctionExpression', generator: true, body }); // TODO: async? static?
const Identifier = name => RawIdentifier(escapeName(name));
const If = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const Iife = (body, async = false) => Call(Arrow([], body, async), [], async);
const Let = (id, init) => Local('let', id, init);
const Literal = value => ({ type: 'Literal', value });
const Local = (kind, id, init) => ({
  type: 'VariableDeclaration', kind, declarations: [{ type: 'VariableDeclarator', id, init }]
});
const Member = (object, property) =>
  property.type === 'Literal' && validName(property.value)
    ? { type: 'MemberExpression', object, property: RawIdentifier(property.value) }
    : { type: 'MemberExpression', object, property, computed: property.type !== 'Identifier' };
const New = (callee, args) => ({ type: 'NewExpression', callee, arguments: args });
const NewTarget = { type: 'MetaProperty', meta: RawIdentifier('new'), property: RawIdentifier('target') };
const Procedure = body => ({ type: 'FunctionExpression', body }); // TODO: async? static?
const Program = body => ({ type: 'Program', body });
const Return = argument => ({ type: 'ReturnStatement', argument });
const Slot = (static, kind, key, value) => ({
  type: 'MethodExpression', key, computed: key.type !== 'Identifier', kind, static, value
});
const Spread = argument => ({ type: 'SpreadElement', argument });
const Statement = expression => ({ type: 'ExpressionStatement', expression });
const Super = args => ({ type: "Super", arguments: args });
const TaggedTemplate = (tag, quasi) => ({ type: 'TaggedTemplateExpression', tag, quasi });
const TemplateElement = raw => ({ type: 'TemplateElement', value: { raw } });
const TemplateLiteral = (quasis, expressions) => ({ type: 'TemplateLiteral', quasis, expressions });
const This = { type: 'ThisExpression' };
const Try = (block, handler) => ({ type: 'TryStatement', block, handler });
const Unary = (operator, argument, prefix = true) => ({ type: 'UnaryExpression', operator, argument, prefix });
const Var = (id, init) => Local('var', id, init);
const Vector = elements => ({ type: 'ArrayExpression', elements });
const Yield = argument => ({ type: 'YieldExpression', argument });
const YieldMany = argument => ({ type: 'YieldExpression', delegate: true, argument });

const adorn = (tag, raw) => TaggedTemplate(tag, TemplateLiteral([TemplateElement(raw)], []));
const ann = (dataType, ast) => Object.assign(ast, { dataType });

module.exports = {
  Arrow, Assign, Await, Binary, Block, Call, Catch, Class, Const, Debugger, Do, Generator, Identifier, If, Iife, Let,
  Literal, Local, Member, New, NewTarget, Procedure, Program, RawIdentifier, Return, Slot, Spread, Statement, Super,
  TaggedTemplate, TemplateElement, TemplateLiteral, This, Try, Unary, Var, Vector, Yield, YieldMany,
  adorn, ann, generate
};
