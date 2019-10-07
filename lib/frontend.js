const { AsyncFunction, GeneratorFunction, flatMap, last, mapAsync, pairs } = require('./utils.js');
const ast = require('./ast.js');
const {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger, DoWhile, Empty,
  For, ForIn, ForOf, Generator, Id, If, Let, Literal, Member, NewObj, NewTarget, Procedure, Property, Return,
  SafeId, Sequence, Slot, Spread, Statement, Static, Super, This, Try, Unary, Var, Vector, While, Yield, YieldMany,
  generate
} = ast;

module.exports = async $ => {
  const {
    asFunction, asJsBool, asList, asNumber, asShenBool, asString, asSymbol, async, compile, cons,
    defun, evalJs, fun, future, inlines, isArray, isSymbol, lookup, nameOf, s, settle, symbolOf,
    toArray, toArrayTree, toListTree, valueOf
  } = $;
  const signedfuncs = lookup('shen.*signedfuncs*');
  const macroregCell = lookup('shen.*macroreg*');
  const macrosCell = lookup('*macros*');
  const propertyVectorCell = lookup('*property-vector*');
  const run = async ? future : settle;
  const caller = name => {
    const cell = lookup(name);
    return (...args) => run(cell.f(...args));
  };
  const curryType = caller('shen.curry-type');
  const incInfs = caller('shen.incinfs');
  const newpv = caller('shen.newpv');
  const unify = caller('unify!');
  const load = caller('load');
  const parse = caller('read-from-string');
  const put = caller('put');
  const evaluate = caller('eval');
  const define = (name, f) => {
    const id = symbolOf(name);
    defun(name, f);

    if (async) {
      return (async () => {
        await put(id, s`shen.lambda-form`, f, propertyVectorCell.get());
        await put(id, s`arity`, f.length, propertyVectorCell.get());
        return id;
      })();
    } else {
      put(id, s`shen.lambda-form`, f, propertyVectorCell.get());
      put(id, s`arity`, f.length, propertyVectorCell.get());
      return id;
    }
  };
  const setSignedFuncs = (id, type) => signedfuncs.set(cons(cons(id, type), signedfuncs.get()));
  const freeVariables = expr =>
    isArray(expr) ? [...new Set(flatMap(expr, freeVariables)).values()] :
    isSymbol(expr) && nameOf(expr).charCodeAt(0) >= 65 && nameOf(expr).charCodeAt(0) <= 90 ? [expr] :
    [];
  const substitute = (map, expr) =>
    isArray(expr) ? expr.map(x => substitute(map, x)) :
    map.has(expr) ? map.get(expr) :
    expr;
  const declareType = (name, type) => {
    setSignedFuncs(symbolOf(name), type);
    if (async) {
      return (async () => {
        await define('shen.type-signature-of-' + name, async (goal, proc, cont) => {
          const variableMap = new Map(await mapAsync(freeVariables(type), async x => [x, await newpv(proc)]));
          await incInfs();
          return await unify(goal, substitute(variableMap, type), proc, cont);
        });
      })();
    } else {
      define('shen.type-signature-of-' + name, (goal, proc, cont) => {
        const variableMap = new Map(freeVariables(type).map(x => [x, newpv(proc)]));
        incInfs();
        return unify(goal, substitute(variableMap, type), proc, cont);
      });
    }
  };
  const defineTyped = (name, type, f) => {
    if (async) {
      return (async () => {
        const id = await define(name, f);
        await declareType(name, await curryType(toListTree(type)));
        return id;
      })();
    } else {
      const id = define(name, f);
      declareType(name, curryType(toListTree(type)));
      return id;
    }
  };
  const defmacro = async (name, f) => {
    const macrofn = expr => {
      const result = toListTree(f(toArrayTree(expr)));
      return result === undefined ? expr : result;
    };
    await define(name, macrofn);
    const macroreg = macroregCell.get();
    const macros = macrosCell.get();
    const id = symbolOf(name);
    if (!toArray(macroreg).includes(id)) {
      macroregCell.set(cons(id, macroreg));
      macrosCell.set(cons(fun(x => macrofn(x)), macros));
    }
    return id;
  };
  const evalShen = expr => evaluate(toListTree(expr));
  const execEach = async
    ? async source => mapAsync(toArray(await parse(source)), evalShen)
    :       source => toArray(parse(source)).map(evalShen);
  const exec = async
    ? async source => last(await execEach(source))
    :       source => last(execEach(source));
  const symbol = (name, value) => {
    const index = name.lastIndexOf('.') + 1;
    const starredName = `${name.substr(0, index)}*${name.substr(index)}*`;
    lookup(starredName).set(value);
    return async
      ? define(name, () => valueOf(starredName)).then(_ => value)
      : (define(name, () => valueOf(starredName)), value);
  };
  const inline = (name, f) => inlines[name] = f;
  const sleep = duration => new Promise(resolve => setTimeout(() => resolve(null), duration));
  const delay = (duration, callback) => setTimeout(() => run(callback()), duration);
  const repeat = (duration, callback) => setInterval(() => run(callback()), duration);

  /*************************
   * AST Builder Functions *
   *************************/

  await define('js.ast.arguments',               () => Id('arguments'));
  await define('js.ast.array',             elements => Vector(toArray(elements)));
  await define('js.ast.arrow',       (params, body) => Arrow(toArray(params), body));
  await define('js.ast.assign',              (x, y) => Assign(x, y));
  await define('js.ast.async',                  arg => Async(arg));
  await define('js.ast.await',                  arg => Await(arg));
  await define('js.ast.binary',          (op, x, y) => Binary(op, x, y));
  await define('js.ast.block',                 body => Block(...toArray(body)));
  await define('js.ast.call',             (f, args) => Call(f, toArray(args)));
  await define('js.ast.catch',        (param, body) => Catch(param, body));
  await define('js.ast.class',    (id, base, slots) => Class(id, base, toArray(slots)));
  await define('js.ast.const',           (id, init) => Const(id, init));
  await define('js.ast.constructor',           body => Slot('constructor', Id('constructor'), body));
  await define('js.ast.debugger',                () => Debugger());
  await define('js.ast.do-while',      (test, body) => DoWhile(test, body));
  await define('js.ast.empty',                   () => Empty());
  await define('js.ast.for',        (x, y, z, body) => For(x, y, z, body));
  await define('js.ast.for-await-of', (x, xs, body) => ForOf(x, xs, body, true));
  await define('js.ast.for-in',       (x, xs, body) => ForIn(x, xs, body));
  await define('js.ast.for-of',       (x, xs, body) => ForOf(x, xs, body));
  await define('js.ast.function',     (i, ps, body) => Procedure(i, toArray(ps), body));
  await define('js.ast.function*',    (i, ps, body) => Generator(i, toArray(ps), body));
  await define('js.ast.getter',          (id, body) => Slot('get', id, body));
  await define('js.ast.id',                    name => Id(name));
  await define('js.ast.if',            (test, x, y) => If(test, x, y));
  await define('js.ast.let',             (id, init) => Let(id, init));
  await define('js.ast.literal',              value => Literal(value));
  await define('js.ast.member',         (obj, prop) => Member(obj, prop));
  await define('js.ast.method',          (id, body) => Slot('method', id, body));
  await define('js.ast.new-target',              () => NewTarget());
  await define('js.ast.object',               props => NewObj(pairs(toArray(props)).map(([x, y]) => Property(x, y))));
  await define('js.ast.return',                 arg => Return(arg));
  await define('js.ast.safe-id',               name => SafeId(name));
  await define('js.ast.setter',          (id, body) => Slot('set', id, body));
  await define('js.ast.sequence',             exprs => Sequence(...toArray(exprs)));
  await define('js.ast.slot',      (kind, id, body) => Slot(kind, id, body));
  await define('js.ast.spread',                 arg => Spread(toArray(arg)));
  await define('js.ast.statement',             expr => Statement(expr));
  await define('js.ast.static',                 arg => Static(arg));
  await define('js.ast.super',                   () => Super());
  await define('js.ast.ternary',          (x, y, z) => Conditional(x, y, z));
  await define('js.ast.this',                    () => This());
  await define('js.ast.try',        (body, handler) => Try(body, handler));
  await define('js.ast.update',          (op, x, y) => Assign(x, y, op + '='));
  await define('js.ast.unary',              (op, x) => Unary(op, x));
  await define('js.ast.var',             (id, init) => Var(id, init));
  await define('js.ast.while',         (test, body) => While(test, body));
  await define('js.ast.yield',                  arg => Yield(arg));
  await define('js.ast.yield*',                 arg => YieldMany(arg));

  await define('js.ast.compile', x => compile(toArrayTree(x)));
  await define('js.ast.eval',    x => evalJs(x));
  await define('js.ast.render',  x => generate(x));

  /*****************
   * Raw Operators *
   *****************/

  await define('js.raw.==',          (x, y) => x == y);
  await define('js.raw.===',         (x, y) => x === y);
  await define('js.raw.!=',          (x, y) => x != y);
  await define('js.raw.!==',         (x, y) => x !== y);
  await define('js.raw.not',              x => !x);
  await define('js.raw.and',         (x, y) => x && y);
  await define('js.raw.or',          (x, y) => x || y);
  await define('js.raw.+',           (x, y) => x + y);
  await define('js.raw.-',           (x, y) => x - y);
  await define('js.raw.*',           (x, y) => x * y);
  await define('js.raw./',           (x, y) => x / y);
  await define('js.raw.%',           (x, y) => x % y);
  await define('js.raw.**',          (x, y) => x ** y);
  await define('js.raw.<',           (x, y) => x < y);
  await define('js.raw.>',           (x, y) => x > y);
  await define('js.raw.<=',          (x, y) => x <= y);
  await define('js.raw.>=',          (x, y) => x >= y);
  await define('js.raw.bitwise.not',      x => ~x);
  await define('js.raw.bitwise.and', (x, y) => x & y);
  await define('js.raw.bitwise.or',  (x, y) => x | y);
  await define('js.raw.bitwise.xor', (x, y) => x ^ y);
  await define('js.raw.<<',          (x, y) => x << y);
  await define('js.raw.>>',          (x, y) => x >> y);
  await define('js.raw.>>>',         (x, y) => x >>> y);
  await define('js.raw.delete',      (x, y) => delete x[y]);
  await define('js.raw.eval',             x => eval(x));
  await define('js.raw.in',          (x, y) => x in y);
  await define('js.raw.instanceof',  (x, y) => x instanceof y);
  await define('js.raw.typeof',           x => typeof x);
  await define('js.raw.void',             x => void x);

  inline('js.raw.==',          (x, y) => Binary('==', x, y));
  inline('js.raw.===',         (x, y) => Binary('===', x, y));
  inline('js.raw.!=',          (x, y) => Binary('!=', x, y));
  inline('js.raw.!==',         (x, y) => Binary('!==', x, y));
  inline('js.raw.not',              x => Unary('!', x));
  inline('js.raw.and',         (x, y) => Binary('&&', x, y));
  inline('js.raw.or',          (x, y) => Binary('||', x, y));
  inline('js.raw.+',           (x, y) => Binary('+', x, y));
  inline('js.raw.-',           (x, y) => Binary('-', x, y));
  inline('js.raw.*',           (x, y) => Binary('*', x, y));
  inline('js.raw./',           (x, y) => Binary('/', x, y));
  inline('js.raw.%',           (x, y) => Binary('%', x, y));
  inline('js.raw.**',          (x, y) => Binary('**', x, y));
  inline('js.raw.<',           (x, y) => Binary('<', x, y));
  inline('js.raw.>',           (x, y) => Binary('>', x, y));
  inline('js.raw.<=',          (x, y) => Binary('<=', x, y));
  inline('js.raw.>=',          (x, y) => Binary('>=', x, y));
  inline('js.raw.bitwise.not',      x => Unary('~', x));
  inline('js.raw.bitwise.and', (x, y) => Binary('&', x, y));
  inline('js.raw.bitwise.or',  (x, y) => Binary('|', x, y));
  inline('js.raw.bitwise.xor', (x, y) => Binary('^', x, y));
  inline('js.raw.<<',          (x, y) => Binary('<<', x, y));
  inline('js.raw.>>',          (x, y) => Binary('>>', x, y));
  inline('js.raw.>>>',         (x, y) => Binary('>>>', x, y));
  inline('js.raw.delete',      (x, y) => Unary('delete', Member(x, y)));
  inline('js.raw.eval',             x => Call(Id('eval'), [x]));
  inline('js.raw.in',          (x, y) => Binary('in', x, y));
  inline('js.raw.instanceof',  (x, y) => Binary('instanceof', x, y));
  inline('js.raw.typeof',           x => Unary('typeof', x));
  inline('js.raw.void',             x => Unary('void', x));

  /******************************************
   * Typed Operators and Standard Functions *
   ******************************************/

  const funType = (first, ...rest) =>
    rest.length === 0
      ? [s`-->`, symbolOf(first)]
      : [symbolOf(first), ...flatMap(rest, x => [s`-->`, symbolOf(x)])];
  const A_B_boolean          = funType('A', 'B', 'boolean');
  const number_number        = funType('number', 'number');
  const number_number_number = funType('number', 'number', 'number');
  const string_string        = funType('string', 'string');
  const string_A             = funType('string', 'A');
  const A_unit               = funType('A', 'unit');
  const string_number        = funType('string', 'number');
  const string_number_number = funType('string', 'number', 'number');
  const A_boolean            = funType('A', 'boolean');
  const timeout_unit         = funType('js.timeout', 'unit');
  const number_unit          = funType('number', 'unit');
  const number_lazy_timeout  = [s`number`, s`-->`, [s`lazy`, s`A`], s`-->`, s`js.timeout`];

  await defineTyped('js.==',                   A_B_boolean,          (x, y) => asShenBool(x == y));
  await defineTyped('js.!=',                   A_B_boolean,          (x, y) => asShenBool(x != y));
  await defineTyped('js.===',                  A_B_boolean,          (x, y) => asShenBool(x === y));
  await defineTyped('js.!==',                  A_B_boolean,          (x, y) => asShenBool(x !== y));
  await defineTyped('js.%',                    number_number_number, (x, y) => asNumber(x) % asNumber(y));
  await defineTyped('js.**',                   number_number_number, (x, y) => asNumber(x) ** asNumber(y));
  await defineTyped('js.bitwise.not',          number_number,             x => ~asNumber(x));
  await defineTyped('js.bitwise.and',          number_number_number, (x, y) => asNumber(x) & asNumber(y));
  await defineTyped('js.bitwise.or',           number_number_number, (x, y) => asNumber(x) | asNumber(y));
  await defineTyped('js.bitwise.xor',          number_number_number, (x, y) => asNumber(x) ^ asNumber(y));
  await defineTyped('js.<<',                   number_number_number, (x, y) => asNumber(x) << asNumber(y));
  await defineTyped('js.>>',                   number_number_number, (x, y) => asNumber(x) >> asNumber(y));
  await defineTyped('js.>>>',                  number_number_number, (x, y) => asNumber(x) >>> asNumber(y));
  await defineTyped('js.clear',                timeout_unit,              x => (clearTimeout(x), null));
  await defineTyped('js.decode-uri',           string_string,             x => decodeURI(asString(x)));
  await defineTyped('js.decode-uri-component', string_string,             x => decodeURIComponent(asString(x)));
  await defineTyped('js.delay',                number_lazy_timeout,  (t, f) => delay(asNumber(t), asFunction(f)));
  await defineTyped('js.encode-uri',           string_string,             x => encodeURI(asString(x)));
  await defineTyped('js.encode-uri-component', string_string,             x => encodeURIComponent(asString(x)));
  await defineTyped('js.eval',                 string_A,                  x => eval(asString(x)));
  await defineTyped('js.log',                  A_unit,                    x => (console.log(x), null));
  await defineTyped('js.parse-float',          string_number,             x => parseFloat(asString(x)));
  await defineTyped('js.parse-int',            string_number,             x => parseInt(asString(x), 10));
  await defineTyped('js.parse-int-with-radix', string_number_number, (x, r) => parseInt(asString(x), asNumber(r)));
  await defineTyped('js.repeat',               number_lazy_timeout,  (t, f) => repeat(asNumber(t), asFunction(f)));
  await defineTyped('js.sleep',                number_unit,               t => sleep(asNumber(t)));

  /************************
   * Recognisor Functions *
   ************************/

  await defineTyped('js.array?',     A_boolean, x => asShenBool(Array.isArray(x)));
  await defineTyped('js.async?',     A_boolean, x => asShenBool(x instanceof AsyncFunction));
  await defineTyped('js.boolean?',   A_boolean, x => asShenBool(typeof x === 'boolean'));
  await defineTyped('js.defined?',   A_boolean, x => asShenBool(typeof x !== 'undefined'));
  await defineTyped('js.false?',     A_boolean, x => asShenBool(x === false));
  await defineTyped('js.falsy?',     A_boolean, x => asShenBool(!x));
  await defineTyped('js.finite?',    A_boolean, x => asShenBool(Number.isFinite(x)));
  await defineTyped('js.function?',  A_boolean, x => asShenBool(typeof x === 'function'));
  await defineTyped('js.generator?', A_boolean, x => asShenBool(x instanceof GeneratorFunction));
  await defineTyped('js.infinite?',  A_boolean, x => asShenBool(!Number.isFinite(x)));
  await defineTyped('js.+infinity?', A_boolean, x => asShenBool(x === Infinity));
  await defineTyped('js.-infinity?', A_boolean, x => asShenBool(x === -Infinity));
  await defineTyped('js.integer?',   A_boolean, x => asShenBool(Number.isInteger(x)));
  await defineTyped('js.+integer?',  A_boolean, x => asShenBool(Number.isInteger(x) && x > 0));
  await defineTyped('js.-integer?',  A_boolean, x => asShenBool(Number.isInteger(x) && x < 0));
  await defineTyped('js.nan?',       A_boolean, x => asShenBool(Number.isNaN(x)));
  await defineTyped('js.null?',      A_boolean, x => asShenBool(x === null));
  await defineTyped('js.object?',    A_boolean, x => asShenBool(typeof x === 'object' && x !== null && !Array.isArray(x)));
  await defineTyped('js.symbol?',    A_boolean, x => asShenBool(typeof x === 'symbol'));
  await defineTyped('js.true?',      A_boolean, x => asShenBool(x === true));
  await defineTyped('js.truthy?',    A_boolean, x => asShenBool(!!x));
  await defineTyped('js.undefined?', A_boolean, x => asShenBool(typeof x === 'undefined'));

  /**************************************
   * Object Construction, Member Access *
   **************************************/

  await define('js.get', (object, property) => {
    const value = object[property];
    return typeof value === 'function' ? value.bind(object) : value;
  });
  await defmacro('js.get-macro', expr => {
    if (isArray(expr) && expr[0] === s`.` && expr.length >= 2) {
      return expr.slice(2).reduce((whole, prop) => [s`js.get`, whole, prop], expr[1]);
    }
  });
  await define('js.new', (Class, args) => new Class(...toArray(asList(args))));
  await define('js.obj', values =>
    pairs(toArray(asList(values)))
      .reduce((obj, [name, value]) => (obj[name] = value, obj), {}));
  await defmacro('js.obj-macro', expr => {
    if (isArray(expr) && expr[0] === s`{` && expr[expr.length - 1] === s`}`) {
      return [
        s`js.obj`,
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [s`cons`, head, tail], [])
      ];
    }
  });
  await define('js.set', (object, property, value) => object[property] = value);

  /**************************************
   * Global Classes, Objects and Values *
   **************************************/

  await symbol('js.Array',             Array);
  await symbol('js.ArrayBuffer',       ArrayBuffer);
  await symbol('js.AsyncFunction',     AsyncFunction);
  await symbol('js.Boolean',           Boolean);
  await symbol('js.console',           console);
  await symbol('js.DataView',          DataView);
  await symbol('js.Date',              Date);
  await symbol('js.Function',          Function);
  await symbol('js.GeneratorFunction', GeneratorFunction);
  await symbol('js.Infinity',          Infinity);
  await symbol('js.JSON',              JSON);
  await symbol('js.Map',               Map);
  await symbol('js.Math',              Math);
  await symbol('js.NaN',               NaN);
  await symbol('js.Number',            Number);
  await symbol('js.null',              null);
  await symbol('js.Object',            Object);
  await symbol('js.Promise',           Promise);
  await symbol('js.Proxy',             Proxy);
  await symbol('js.Reflect',           Reflect);
  await symbol('js.RegExp',            RegExp);
  await symbol('js.Set',               Set);
  await symbol('js.String',            String);
  await symbol('js.Symbol',            Symbol);
  await symbol('js.undefined',         undefined);
  await symbol('js.WeakMap',           WeakMap);
  await symbol('js.WeakSet',           WeakSet);
  await symbol('js.WebAssembly',       WebAssembly);

  if (typeof Atomics !== 'undefined') {
    await symbol('js.Atomics', Atomics);
  }

  if (typeof globalThis !== 'undefined') {
    await symbol('js.globalThis', globalThis);
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    await symbol('js.SharedArrayBuffer', SharedArrayBuffer);
  }

  /************************
   * ShenScript Internals *
   ************************/

  await define('shen-script.lookup-function', x => lookup(nameOf(asSymbol(x))).f || null);
  await symbol('shen-script.ast', ast);
  await symbol('shen-script.$', $);

  await define('shen-script.boolean.js->shen', x => asShenBool(x));
  await define('shen-script.boolean.shen->js', x => asJsBool(x));
  // TODO: shen->js recursive, js->shen recursive

  return Object.assign($, {
    caller, define, defineTyped, defmacro, evalShen, exec, execEach, inline, load, parse, run, symbol
  });
};
