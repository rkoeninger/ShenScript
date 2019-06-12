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
const Async = ast => ({ ...ast, async: true });
const Await = argument => ({ type: 'AwaitExpression', argument });
const Binary = (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right });
const Block = (...body) => ({ type: 'BlockStatement', body });
const Call = (callee, args, async = false) => (async ? Await : id)({ type: 'CallExpression', callee, arguments: args });
const Catch = (param, body) => ({ type: 'CatchClause', param, body });
const Class = (id, superClass, body) => ({ type: 'ClassExpression', id, superClass, body: { type: 'ClassBody', body } });
const Conditional = (test, consequent, alternate) => ({ type: 'ConditionalExpression', test, consequent, alternate });
const Const = (id, init) => Local('const', id, init);
const Debugger = { type: 'DebuggerStatement' };
const Generator = body => ({ type: 'FunctionExpression', generator: true, body });
const RawId = name => ({ type: 'Identifier', name }); // TODO: replace with Identifier(name, '$')?
//const Id = (name, suffix = '') => RawId(escapeName(name) + suffix); // TODO: RawId should be Id and Id should be SafeId or something
const If = (test, consequent, alternate) => ({ type: 'IfStatement', test, consequent, alternate });
const Let = (id, init) => Local('let', id, init);
const Literal = value => ({ type: 'Literal', value });
const Local = (kind, id, init) => ({
  type: 'VariableDeclaration', kind, declarations: [{ type: 'VariableDeclarator', id, init }]
});
const Member = (object, property) =>
  property.type === 'Literal' && validName(property.value)
    ? { type: 'MemberExpression', object, property: RawId(property.value) }
    : { type: 'MemberExpression', object, property, computed: property.type !== 'Identifier' };
const New = (callee, args) => ({ type: 'NewExpression', callee, arguments: args });
const NewTarget = { type: 'MetaProperty', meta: RawId('new'), property: RawId('target') };
const Procedure = body => ({ type: 'FunctionExpression', body });
const Program = body => ({ type: 'Program', body });
const Return = argument => ({ type: 'ReturnStatement', argument });
const SafeId = (sym, suffix = '') => ({ type: 'Identifier', name: escapeName(Symbol.keyFor(sym)) + suffix }); // TODO: check for keywords?
const Sequence = (...expressions) => ({ type: 'SequenceExpression', expressions });
const Slot = (static, kind, key, value) => ({
  type: 'MethodExpression', key, computed: key.type !== 'Identifier', kind, static, value
});
const Spread = argument => ({ type: 'SpreadElement', argument });
const Statement = expression => ({ type: 'ExpressionStatement', expression });
const Static = ast => ({ ...ast, static: true });
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

const adorn = (tag, raw) => TaggedTemplate(tag, TemplateLiteral([TemplateElement(raw)], [])); // TODO: make this one of the captialized builders
const ann = (dataType, ast) => Object.assign(ast, { dataType });

module.exports = {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger,
  Generator,
  //Id,
  If, Let, Literal, Local, Member, New, NewTarget, Procedure, Program, RawId,
  Return, SafeId, Sequence, Slot, Spread, Statement, Static, Super, TaggedTemplate, TemplateElement,
  TemplateLiteral, This, Try, Unary, Var, Vector, Yield, YieldMany,
  adorn, ann, generate
};
