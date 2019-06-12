const {
  Arrow, Assign, Binary, Block, Call, Catch, Conditional, Const, Id, If, Let,
  Literal, Member, Return, SafeId, Sequence, Statement, Template, Try, Unary, Vector,
  ann, generate
} = require('./ast');
const { AsyncFunction, butLast, last, flatMap, produce, produceState, raise, s } = require('./utils');

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
    Object.freeze(this);
  }
};

const Trampoline = class {
  constructor(f, args) {
    this.f = f;
    this.args = args;
    Object.freeze(this);
  }
  run() { return this.f(...this.args); }
};

const Context = class {
  constructor(options) {
    Object.assign(this, options);
    Object.freeze(this);
  }
  with(options)  { return new Context({ ...this, ...options }) }
  now()          { return this.with({ head: true }); }
  later()        { return this.with({ head: false }); }

  // TODO: these won't be necessary for the initial solution?
  // TODO: instead of "situations", Context could carry a continuation
  //       that constructs expressions in tail position instead of
  //       always assinging to a result variable
  // NOTE: returned ast will need meta indicating if continuation was applied
  //       or result is still an expression
  evaluated()    { return this.with({ situation: 'evaluated' }); }
  passed()       { return this.with({ situation: 'passed' }); } // might not be necessary/redundant with evaluated
  returned()     { return this.with({ situation: 'returned' }); } // continuation: x => Return(x)
  assigned()     { return this.with({ situation: 'assigned' }); } // continuation: x => Assign(tempId, x)
  ignored()      { return this.with({ situation: 'ignored' }); }  // continuation: x => Statement(x)

  clear()        { return this.with({ locals: new Map() }); }
  add(...locals) { return this.with({ locals: new Map([...this.locals, ...locals]) }); }
  has(local)     { return this.locals.has(local); }
  get(local)     { return this.locals.get(local); }
  ann(local, dataType) {
    return this.get(local) ?
      this.with({
        locals: new Map([
          ...this.locals,
          [local, { ...(this.get(local) || {}), dataType }]
        ])
      }) :
      this;
  }
};

const Fabrication = class {
  constructor(expression, statements) {
    this.expression = expression; // TODO: shorter names!
    this.statements = statements;
    Object.freeze(this);
  }
  anyStatements() { return this.statements.length > 0; }
};

const nameOf     = Symbol.keyFor;
const symbolOf   = Symbol.for;
const shenTrue   = s`true`;
const shenFalse  = s`false`;
const isObject   = x => typeof x === 'object' && x !== null;
const isNumber   = x => typeof x === 'number' && Number.isFinite(x);
const isNzNumber = x => isNumber(x) && x !== 0;
const isString   = x => typeof x === 'string' || x instanceof String;
const isNeString = x => isString(x) && x.length > 0;
const isSymbol   = x => typeof x === 'symbol';
const isFunction = x => typeof x === 'function';
const isArray    = x => Array.isArray(x);
const isEArray   = x => isArray(x) && x.length === 0;
const isNeArray  = x => isArray(x) && x.length > 0;
const isError    = x => x instanceof Error;
const isCons     = x => x instanceof Cons;
const asNumber   = x => isNumber(x)   ? x : raise('number expected');
const asNzNumber = x => isNzNumber(x) ? x : raise('non-zero number expected');
const asString   = x => isString(x)   ? x : raise('string expected');
const asNeString = x => isNeString(x) ? x : raise('non-empty string expected');
const asSymbol   = x => isSymbol(x)   ? x : raise('symbol expected');
const asFunction = x => isFunction(x) ? x : raise('function expected');
const asArray    = x => isArray(x)    ? x : raise('array expected');
const asCons     = x => isCons(x)     ? x : raise('cons expected');
const asError    = x => isError(x)    ? x : raise('error expected');
const asIndex    = (i, a) =>
  !Number.isInteger(i)   ? raise(`index ${i} is not valid`) :
  i < 0 || i >= a.length ? raise(`index ${i} is not with array bounds of [0, ${a.length})`) :
  i;
const asShenBool = x => x ? shenTrue : shenFalse;
const asJsBool   = x =>
  x === shenTrue  ? true :
  x === shenFalse ? false :
  raise('Shen boolean expected');

const cons               = (h, t) => new Cons(h, t);
const valueFromArray     = x => isArray(x) ? consFromArray(x) : x;
const valueFromArrayTree = x => isArray(x) ? consFromArrayTree(x) : x;
const consFromArray      = (a, z = null) => a.reduceRight((t, h) => cons(h, t), z);
const consFromArrayTree  = a => consFromArray(a.map(valueFromArrayTree));
const consToArray        = c => produce(isCons, c => c.head, c => c.tail, c);
const consToArrayTree    = c => consToArray(c).map(valueToArrayTree);
const valueToArray       = x => isCons(x) ? consToArray(x)     : x === null ? [] : x;
const valueToArrayTree   = x => isCons(x) ? consToArrayTree(x) : x === null ? [] : x;

const equateType = (x, y) => x.constructor === y.constructor && equate(Object.keys(x), Object.keys(y));
const equate = (x, y) =>
  x === y
  || isCons(x)   && isCons(y)   && equate(x.head, y.head) && equate(x.tail, y.tail)
  || isArray(x)  && isArray(y)  && x.length === y.length  && x.every((v, i) => equate(v, y[i]))
  || isObject(x) && isObject(y) && equateType(x, y)       && Object.keys(x).every(k => equate(x[k], y[k]));

// TODO: use Function.bind for partial applications?
const funSync = (f, arity) =>
  (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(settle(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funSync((...more) => f(...args, ...more), arity - args.length);
const funAsync = (f, arity) =>
  async (...args) =>
    args.length === arity ? f(...args) :
    args.length > arity ? asFunction(await future(f(...args.slice(0, arity))))(...args.slice(arity)) :
    funAsync(async (...more) => f(...args, ...more), arity - args.length);
const fun = (f, arity = f.arity || f.length) =>
  Object.assign((f instanceof AsyncFunction ? funAsync : funSync)(f, arity), { arity });

const bounce = (f, ...args) => new Trampoline(f, args);
const settle = x => {
  while (x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};
const future = async x => {
  while (x = await x, x instanceof Trampoline) {
    x = x.run();
  }
  return x;
};

// TODO: this can be on the Context instead of being global
//       temp vars only need to be unique per scope
// NOTE: this could also cut down on the size of the identifiers
let counter = 0;
const tempId = () => Id(`R${counter++}$`);
const placeholder = () => {
  const id = tempId();
  return [id, x => Statement(Assign(id, x))];
};
const makeUnique = x => SafeId(x, `${counter++}$`); // TODO: weird edgecase where we want to escape and add $

const Member$ = name => Member(Id('$'), Id(name));
const Member$f = name => Member(Member$('f'), Literal(name));
const Call$ = (name, args, async = false) => Call(Member$(name), args, async);
const Call$f = (name, args) => Call(Member$f(name), args);
const cast = (dataType, ast) =>
  ast instanceof Fabrication
    ? fab(cast(dataType, ast.expression), ast.statements)
    : (dataType !== ast.dataType ? Object.assign(Call$('as' + dataType, [ast]), { dataType }) : ast);
// TODO: clean this up
const uncast = ast =>
  ast instanceof Fabrication
    ? fab(uncast(ast.expression), ast.statements)
    : (ast.dataType === 'JsBool' ? cast('ShenBool', ast) : ast);
const isForm = (expr, lead, length) => isNeArray(expr) && expr[0] === symbolOf(lead) && (!length || expr.length === length);
const isInline = (context, expr) =>
  isNeArray(expr) &&
  isSymbol(expr[0]) &&
  context.inlines.hasOwnProperty(nameOf(expr[0])) &&
  context.inlines[nameOf(expr[0])].length === expr.length - 1;
const appears = (symbol, expr) =>
  isForm(expr, 'let', 4)    ? appears(symbol, expr[2]) || (symbol !== expr[1] && appears(symbol, expr[3])) :
  isForm(expr, 'lambda', 3) ? symbol !== expr[1] && appears(symbol, expr[2]) :
  isForm(expr, 'defun', 4)  ? !expr[2].includes(symbol) && appears(symbol, expr[3]) :
  isNeArray(expr)           ? expr.some(x => appears(symbol, x)) :
  symbol === expr;
const variable = (context, symbol) => {
  const { alt, dataType } = context.get(symbol);
  return Object.assign(alt || SafeId(symbol), { dataType });
};
const idle = symbol => ann('Symbol', Template(Member$('s'), nameOf(symbol)));
const fab = (expression, statements = []) => new Fabrication(expression, statements);
// TODO: better name for assemble might be mapFab
//       functions like assemble are for composing and mapping through Fabs
const assemble = (combine, ...fabs) => fab(combine(...fabs.map(x => x.expression)), flatMap(fabs, x => x.statements));
const complete = (context, ast) => Call$(context.async ? 'u' : 't', [ast], context.async);
const completeOrBounce = (context, fAst, argsAsts) =>
  context.head ? complete(context, Call(fAst, argsAsts)) : Call$('b', [fAst, ...argsAsts]);
const recognisors = {
  'cons?':      'Cons',
  'number?':    'Number',
  'string?':    'String',
  'symbol?':    'Symbol',
  'absvector?': 'Array',
  'boolean?':   'ShenBool'
};
const isRecognisor = (context, expr) =>
  isArray(expr) &&
  expr.length === 2 &&
  isSymbol(expr[0]) &&
  isSymbol(expr[1]) &&
  recognisors[nameOf(expr[0])] &&
  [expr[1], recognisors[nameOf(expr[0])]];
const buildIf = (context, [_if, condition, ifTrue, ifFalse]) => {
  if (condition === shenTrue) {
    return uncast(build(context, ifTrue));
  }
  // TODO: this same recognisor annotation can be applied in an (and)
  //       e.g. (and (cons? X) (foo? (hd X)))
  //        ==> $.isCons(X) && $.f.foop.t(X.head)
  const recognised = isRecognisor(context, condition);
  const condFab = cast('JsBool', build(context.now(), condition));
  const trueFab = uncast(build(recognised ? context.ann(...recognised) : context, ifTrue));
  const falseFab = uncast(build(context, ifFalse));
  if (trueFab.anyStatements() || falseFab.anyStatements()) {
    const [resultId, output] = placeholder();
    return fab(
      resultId, [
        ...condFab.statements,
        Let(resultId),
        If(
          condFab.expression,
          trueFab.anyStatements() ?
            Block(...trueFab.statements, output(trueFab.expression)) :
            output(trueFab.expression),
          falseFab.anyStatements() ?
            Block(...falseFab.statements, output(falseFab.expression)) :
            output(falseFab.expression))]);
  }
  return fab(Conditional(condFab.expression, trueFab.expression, falseFab.expression), condFab.statements);
};
const buildCond = (context, [_cond, ...clauses]) =>
  build(context, clauses.reduceRight(
    (alternate, [test, consequent]) => [s`if`, test, consequent, alternate],
    [s`simple-error`, 'no condition was true']));
const buildDo = (context, [_do, ...exprs]) => {
  const exprFabs = [...butLast(exprs).map(x => uncast(build(context.now(), x))), uncast(build(context, last(exprs)))];
  if (exprFabs.some(x => x.anyStatements())) {
    return fab(last(exprFabs).expression, [
      ...flatMap(butLast(exprFabs), x => [...x.statements, Statement(x.expression)]),
      ...last(exprFabs).statements]);
  }
  return fab(Sequence(...exprFabs.map(x => x.expression)));
};
const buildLet = (context, [_let, symbol, binding, body]) => {
  if (!appears(symbol, body)) {
    return build(context, [s`do`, binding, body]);
  }
  const bindingFab = uncast(build(context.now(), binding));
  const dataType = bindingFab.expression.dataType;
  const conflict = appears(symbol, binding);
  const symbolId = conflict ? makeUnique(symbol) : SafeId(symbol);
  const meta = conflict ? { dataType, alt: symbolId } : { dataType };
  const bodyFab = uncast(build(context.add([asSymbol(symbol), meta]), body));
  const constStmt = Const(symbolId, bindingFab.expression);
  //if (!conflict && context.has(symbol)) {
    // FIXME: there's also a problem when there are 2 adjacent let's with the same name
    // TODO: additional block can be avoided if there's already a block between here and outer variable scope
    //       this can be tracked in locals Map in Context. Entering a new block would switch a property on
    //       every local to true
    const [resultId, output] = placeholder();
    return fab(resultId, [
      Let(resultId),
      Block(...bindingFab.statements, constStmt, ...bodyFab.statements, output(bodyFab.expression))]);
  //}
  //return fab(bodyFab.expression, [...bindingFab.statements, constStmt, ...bodyFab.statements]);
};
const buildHandler = (context, handler, output) => {
  if (isForm(handler, 'lambda', 3)) {
    // NOTE: don't need to work about shadow variable clash since catch () {} is always its own block
    const handlerFab = uncast(build(context.add([asSymbol(handler[1]), { dataType: 'Error' }]), handler[2]));
    return Catch(SafeId(handler[1]), Block(...handlerFab.statements, output(handlerFab.expression)));
  } else {
    const handlerFab = uncast(build(context, handler));
    const errorId = Id('e$');
    return Catch(errorId, Block(...handlerFab.statements, output(Call(handlerFab.expression, [errorId], context.async))));
  }
};
const buildTrap = (context, [_trap, body, handler]) => {
  const [resultId, output] = placeholder();
  const bodyFab = uncast(build(context.now(), body));
  return fab(resultId, [
    Let(resultId),
    Try(
      Block(...bodyFab.statements, output(bodyFab.expression)),
      buildHandler(context, handler, output))]);
};
const buildLambda = (context, params, body) => {
  const bodyFab = uncast(build(context.later().add(...params.map(x => [asSymbol(x), {}])), body));
  return fab(Call$('fun', [Arrow(
    params.map(x => SafeId(x)),
    bodyFab.anyStatements() ? Block(...bodyFab.statements, Return(bodyFab.expression)) : bodyFab.expression,
    context.async)]));
};
const buildDefun = (context, [_defun, symbol, params, body]) =>
  // TODO: in ignore situation, the idle symbol and be dropped
  // NOTE: buildLambda should never return a fab with statements,
  //       factor out code to emit JsExpr instead of Fab to another function?
  fab(Sequence(Assign(Member$f(nameOf(symbol)), buildLambda(context.clear(), params, body).expression), idle(symbol)));
const buildCons = (context, expr) => {
  const { result, state } = produceState(x => isForm(x, 'cons', 3), x => x[1], x => x[2], expr);
  return isEArray(state) || state === null ?
    assemble(
      (...xs) => ann('Cons', Call$('consFromArray', [Vector(xs)])),
      ...result.map(x => uncast(build(context.now(), x)))) :
    assemble(
      (...xs) => ann('Cons', Call$('consFromArray', [Vector(butLast(xs)), last(xs)])),
      ...[...result, state].map(x => uncast(build(context.now(), x))));
};
const buildSet = (context, [_set, symbol, value]) =>
  isSymbol(symbol) && !context.has(symbol) ?
    assemble(
      val => Assign(Member(Member$('symbols'), Literal(nameOf(symbol))), val),
      uncast(build(context.now(), value))) :
    assemble(
      (sym, val) => Assign(Member(Member$('symbols'), Call$('nameOf', [cast('Symbol', sym)])), val),
      uncast(build(context.now(), symbol)),
      uncast(build(context.now(), value)));
const buildValue = (context, [_value, symbol]) =>
  isSymbol(symbol) && !context.has(symbol) ?
    fab(Call$('valueOf', [Literal(nameOf(symbol))])) :
    assemble(
      sym => Call$('valueOf', [Call$('nameOf', [cast('Symbol', sym)])]),
      uncast(build(context.now(), symbol)));
const buildInline = (context, [fExpr, ...argExprs]) =>
  assemble(
    context.inlines[nameOf(fExpr)],
    ...argExprs.map(x => build(context.now(), x)));
const buildApp = (context, [fExpr, ...argExprs]) =>
  assemble(
    (f, ...args) => completeOrBounce(context, f, args),
    context.has(fExpr) ? fab(SafeId(fExpr)) :
    isArray(fExpr)     ? uncast(build(context.now(), fExpr)) :
    isSymbol(fExpr)    ? fab(Member$f(nameOf(fExpr))) :
    raise('not a valid application form'),
    ...argExprs.map(x => uncast(build(context.now(), x))));
const build = (context, expr) =>
  isNumber(expr) ? fab(ann('Number', Literal(expr))) :
  isString(expr) ? fab(ann('String', Literal(expr))) :
  isEArray(expr) ? fab(ann('Null',   Literal(null))) :
  isSymbol(expr) ? fab(context.has(expr) ? variable(context, expr) : idle(expr)) :
  isForm(expr, 'if', 4)         ? buildIf    (context, expr) :
  isForm(expr, 'cond')          ? buildCond  (context, expr) :
  isForm(expr, 'do', 3)         ? buildDo    (context, expr) :
  isForm(expr, 'let', 4)        ? buildLet   (context, expr) :
  isForm(expr, 'trap-error', 3) ? buildTrap  (context, expr) :
  isForm(expr, 'lambda', 3)     ? buildLambda(context, [expr[1]], expr[2]) :
  isForm(expr, 'freeze', 2)     ? buildLambda(context, [], expr[1]) :
  isForm(expr, 'defun', 4)      ? buildDefun (context, expr) :
  isForm(expr, 'cons', 3)       ? buildCons  (context, expr) :
  isForm(expr, 'set', 3)        ? buildSet   (context, expr) :
  isForm(expr, 'value', 2)      ? buildValue (context, expr) :
  isInline(context, expr)       ? buildInline(context, expr) :
  isArray(expr)                 ? buildApp   (context, expr) :
  raise('not a valid form');

module.exports = (options = {}) => {
  const isInStream  = options.isInStream  || (options.InStream  && (x => x instanceof options.InStream))  || (() => false);
  const isOutStream = options.isOutStream || (options.OutStream && (x => x instanceof options.OutStream)) || (() => false);
  const asInStream  = x => isInStream(x)  ? x : raise('input stream expected');
  const asOutStream = x => isOutStream(x) ? x : raise('output stream expected');
  const isStream = x => isInStream(x) || isOutStream(x);
  const asStream = x => isStream(x) ? x : raise('stream expected');
  const clock = options.clock || (() => Date.now() / 1000);
  const startTime = clock();
  const getTime = mode =>
    mode === 'unix' ? clock() :
    mode === 'run'  ? clock() - startTime :
    raise(`get-time only accepts symbols unix or run, not ${mode}`);
  const show = x =>
    x === null    ? '[]' :
    isString(x)   ? `"${x}"` :
    isSymbol(x)   ? nameOf(x) :
    isCons(x)     ? `[${consToArray(x).map(show).join(' ')}]` :
    isFunction(x) ? `<Function ${x}>` :
    isArray(x)    ? `<Vector ${x.length}>` :
    isError(x)    ? `<Error "${x.toString()}">` :
    isStream(x)   ? `<Stream ${x.name}>` :
    `${x}`;
  const out = options.stoutput;
  const symbols = {
    '*language*':       'JavaScript',
    '*implementation*': options.implementation || 'Unknown',
    '*release*':        options.release        || 'Unknown',
    '*os*':             options.os             || 'Unknown',
    '*port*':           options.port           || 'Unknown',
    '*porters*':        options.porters        || 'Unknown',
    '*stinput*':        options.stinput        || (() => raise('standard input not supported')),
    '*stoutput*':       out                    || (() => raise('standard output not supported')),
    '*sterror*':        options.sterror || out || (() => raise('standard output not supported')),
    '*home-directory*': options.homeDirectory  || '',
    'shen-script.*async*':               asShenBool(options.async),
    'shen-script.*instream-supported*':  asShenBool(options.isInStream  || options.InStream),
    'shen-script.*outstream-supported*': asShenBool(options.isOutStream || options.OutStream)
  };
  const atomicTypes = ['Number', 'String', 'Symbol', 'Stream', 'Null'];
  const inlines = {
    '=': (x, y) =>
      atomicTypes.includes(x.dataType) || atomicTypes.includes(y.dataType)
        ? ann('JsBool', Binary('===', ...[x, y].map(uncast)))
        : ann('JsBool', Call$('equate',  [x, y].map(uncast))),
    'not':             x => ann('JsBool', Unary('!', cast('JsBool', x))),
    'and':        (x, y) => ann('JsBool', Binary('&&', cast('JsBool', x), cast('JsBool', y))),
    'or':         (x, y) => ann('JsBool', Binary('||', cast('JsBool', x), cast('JsBool', y))),
    '+':          (x, y) => ann('Number', Binary('+',  cast('Number', x), cast('Number', y))),
    '-':          (x, y) => ann('Number', Binary('-',  cast('Number', x), cast('Number', y))),
    '*':          (x, y) => ann('Number', Binary('*',  cast('Number', x), cast('Number', y))),
    '/':          (x, y) => ann('Number', Binary('/',  cast('Number', x), cast('NzNumber', y))),
    '<':          (x, y) => ann('JsBool', Binary('<',  cast('Number', x), cast('Number', y))),
    '>':          (x, y) => ann('JsBool', Binary('>',  cast('Number', x), cast('Number', y))),
    '<=':         (x, y) => ann('JsBool', Binary('<=', cast('Number', x), cast('Number', y))),
    '>=':         (x, y) => ann('JsBool', Binary('>=', cast('Number', x), cast('Number', y))),
    'cn':         (x, y) => ann('String', Binary('+',  cast('String', x), cast('String', y))),
    'str':             x => ann('String', Call$('show',     [x].map(uncast))),
    'intern':          x => ann('Symbol', Call$('symbolOf', [cast('String', x)])),
    'number?':         x => ann('JsBool', Call$('isNumber', [x].map(uncast))),
    'string?':         x => ann('JsBool', Call$('isString', [x].map(uncast))),
    'cons?':           x => ann('JsBool', Call$('isCons',   [x].map(uncast))),
    'absvector?':      x => ann('JsBool', Call$('isArray',  [x].map(uncast))),
    'cons':       (x, y) => ann('Cons',   Call$('cons',     [x, y].map(uncast))),
    'hd':              x => Member(cast('Cons', x), Id('head')),
    'tl':              x => Member(cast('Cons', x), Id('tail')),
    'error-to-string': x => ann('String', Member(cast('Error', x), Id('message'))),
    'simple-error':    x => Call$('raise', [cast('String', x)]),
    'read-byte':       x => ann('Number', Call$f('read-byte',  [x].map(uncast))),
    'write-byte': (x, y) => ann('Number', Call$f('write-byte', [x, y].map(uncast))),
    'get-time':   (x, y) => ann('Number', Call$f('get-time',   [x, y].map(uncast))),
    'string->n':       x => ann('Number', Call$f('string->n',  [x].map(uncast))),
    'n->string':       x => ann('String', Call$f('n->string',  [x].map(uncast))),
    'tlstr':           x => ann('String', Call$f('tlstr',      [x].map(uncast))),
    'pos':        (x, y) => ann('String', Call$f('pos',        [x, y].map(uncast)))
  };
  const valueOf = x => symbols.hasOwnProperty(x) ? symbols[x] : raise(`global "${x}" is not defined`);
  const openRead  = options.openRead  || (() => raise('open(in) not supported'));
  const openWrite = options.openWrite || (() => raise('open(out) not supported'));
  const open = (path, mode) =>
    mode === 'in'  ? openRead (asString(valueOf('*home-directory*')) + path) :
    mode === 'out' ? openWrite(asString(valueOf('*home-directory*')) + path) :
    raise(`open only accepts symbols in or out, not ${mode}`);
  const functions = {
    'if':        (b, x, y) => asJsBool(b) ? x : y,
    'and':          (x, y) => asShenBool(asJsBool(x) && asJsBool(y)),
    'or':           (x, y) => asShenBool(asJsBool(x) || asJsBool(y)),
    'open':         (p, m) => open(asString(p), nameOf(asSymbol(m))),
    'close':             x => (asStream(x).close(), null),
    'read-byte':         x => asInStream(x).read(),
    'write-byte':   (b, x) => (asOutStream(x).write(asNumber(b)), b),
    'number?':           x => asShenBool(isNumber(x)),
    'string?':           x => asShenBool(isString(x)),
    'absvector?':        x => asShenBool(isArray(x)),
    'cons?':             x => asShenBool(isCons(x)),
    'hd':                c => asCons(c).head,
    'tl':                c => asCons(c).tail,
    'cons':                   cons,
    'tlstr':             x => asNeString(x).substring(1),
    'cn':           (x, y) => asString(x) + asString(y),
    'string->n':         x => asNeString(x).charCodeAt(0),
    'n->string':         n => String.fromCharCode(asNumber(n)),
    'pos':          (x, i) => asString(x)[asIndex(i, x)],
    'str':                    show,
    'absvector':         n => new Array(asNumber(n)).fill(null),
    '<-address':    (a, i) => asArray(a)[asIndex(i, a)],
    'address->': (a, i, x) => (asArray(a)[asIndex(i, a)] = x, a),
    '+':            (x, y) => asNumber(x) + asNumber(y),
    '-':            (x, y) => asNumber(x) - asNumber(y),
    '*':            (x, y) => asNumber(x) * asNumber(y),
    '/':            (x, y) => asNumber(x) / asNzNumber(y),
    '>':            (x, y) => asShenBool(asNumber(x) >  asNumber(y)),
    '<':            (x, y) => asShenBool(asNumber(x) <  asNumber(y)),
    '>=':           (x, y) => asShenBool(asNumber(x) >= asNumber(y)),
    '<=':           (x, y) => asShenBool(asNumber(x) <= asNumber(y)),
    '=':            (x, y) => asShenBool(equate(x, y)),
    'intern':            x => symbolOf(asString(x)),
    'get-time':          x => getTime(nameOf(asSymbol(x))),
    'simple-error':      x => raise(asString(x)),
    'error-to-string':   x => asError(x).message,
    'set':          (x, y) => symbols[nameOf(asSymbol(x))] = y,
    'value':             x => valueOf(nameOf(asSymbol(x))),
    'type':         (x, _) => x
  };
  Object.keys(functions).forEach(name => functions[name] = fun(functions[name]));
  const context = new Context({ async: options.async, head: true, locals: new Map(), inlines });
  // TODO: needs to be in evaluated situation and if it returns prereq statements put in an iife?
  const compile = expr => uncast(build(context, expr));
  const $ = {
    cons, valueFromArray, valueFromArrayTree, consFromArray, consFromArrayTree,
    consToArray, consToArrayTree, valueToArray, valueToArrayTree,
    asJsBool, asShenBool, asNzNumber, asNeString, symbols, inlines, functions,
    isStream, isInStream, isOutStream, isNumber, isString, isSymbol, isCons, isArray, isError, isFunction,
    asStream, asInStream, asOutStream, asNumber, asString, asSymbol, asCons, asArray, asError, asFunction,
    symbolOf, nameOf, valueOf, show, equate, raise, fun, bounce, settle, future, compile,
    f: functions, s, b: bounce, t: settle, u: future, async: options.async
  };
  const Func = context.async ? AsyncFunction : Function;
  const evalJs = js => Func('$', `return ${js};`)($);
  const evalKl = expr => {
    const fabr = compile(valueToArrayTree(expr));
    return Func('$', generate(Block(...fabr.statements, Return(fabr.expression))))($);
  };
  functions['eval-kl'] = fun(evalKl);
  return Object.assign($, { evalKl, evalJs });
};
