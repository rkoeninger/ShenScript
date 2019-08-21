const { AsyncFunction, GeneratorFunction, flatMap, last, mapAsync, pairs } = require('./utils');
const ast = require('./ast');
const {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger, DoWhile, Empty,
  For, ForIn, ForOf, Generator, Id, If, Let, Literal, Member, NewObj, NewTarget, Procedure, Property, Return,
  SafeId, Sequence, Slot, Spread, Statement, Static, Super, This, Try, Unary, Var, Vector, While, Yield, YieldMany,
  generate
} = ast;

module.exports = $ => {
  const {
    asNumber, asJsBool, asList, asShenBool, asSymbol, async, compile, cons, evalJs,
    fun, functions, future, inlines, isArray, nameOf, preprocessors, s, settle, symbolOf,
    symbols, toArray, toArrayTree, toList, toListTree, valueOf
  } = $;
  const run = async ? future : settle;
  const caller = name => (...args) => run(functions[name](...args));
  const define = (name, f) => {
    const nameSymbol = symbolOf(name);
    const funf = functions[name] = fun(f);

    if (async) {
      return (async () => {
        await run(functions.put(nameSymbol, s`shen.lambda-form`, funf, valueOf('*property-vector*')));
        await run(functions.put(nameSymbol, s`arity`, f.length, valueOf('*property-vector*')));
        return nameSymbol;
      })();
    } else {
      run(functions.put(nameSymbol, s`shen.lambda-form`, funf, valueOf('*property-vector*')));
      run(functions.put(nameSymbol, s`arity`, f.length, valueOf('*property-vector*')));
      return nameSymbol;
    }
  };
  const defineTyped = (name, type, f) => {
    if (async) {
      return (async () => {
        const nameSymbol = await define(name, f);
        await run(functions.declare(nameSymbol, toListTree(type)));
        return nameSymbol;
      })();
    } else {
      const nameSymbol = define(name, f);
      run(functions.declare(nameSymbol, toListTree(type)));
      return nameSymbol;
    }
  };
  const defmacro = (name, f) => {
    const macrofn = expr => {
      const result = toListTree(f(toArrayTree(expr)));
      return result === undefined ? expr : result;
    };
    define(name, macrofn);
    const macroreg = valueOf('shen.*macroreg*');
    const macros = valueOf('*macros*');
    const nameSymbol = symbolOf(name);
    if (!toArray(macroreg).includes(nameSymbol)) {
      symbols['shen.*macroreg*'] = cons(nameSymbol, macroreg);
      symbols['*macros*'] = cons(fun(x => macrofn(x)), macros);
    }
    return nameSymbol;
  };
  const evalShen = expr => run(functions.eval(toListTree(expr)));
  const execEach = async
    ? async source => mapAsync(toArray(await parse(source)), evalShen)
    :       source => toArray(parse(source)).map(evalShen);
  const exec = async
    ? async source => last(await execEach(source))
    :       source => last(execEach(source));
  const symbol = (name, value) => {
    const index = name.lastIndexOf('.') + 1;
    const starredName = `${name.substr(0, index)}*${name.substr(index)}*`;
    define(name, () => valueOf(starredName));
    return symbols[starredName] = value;
  };
  const inline = (name, f) => inlines[name] = f;
  const pre = (name, f) => preprocessors[name] = f;
  const load = caller('load');
  const parse = caller('read-from-string');

  define('js.ast.arguments',            () => Id('arguments'));
  define('js.ast.array',          elements => Vector(toArray(elements)));
  define('js.ast.arrow',    (params, body) => Arrow(toArray(params), body));
  define('js.ast.assign',           (x, y) => Assign(x, y));
  define('js.ast.async',               arg => Async(arg));
  define('js.ast.await',               arg => Await(arg));
  define('js.ast.binary',       (op, x, y) => Binary(op, x, y));
  define('js.ast.block',              body => Block(...toArray(body)));
  define('js.ast.call',          (f, args) => Call(f, toArray(args)));
  define('js.ast.catch',     (param, body) => Catch(param, body));
  define('js.ast.class', (id, base, slots) => Class(id, base, toArray(slots)));
  define('js.ast.const',        (id, init) => Const(id, init));
  define('js.ast.constructor',        body => Slot('constructor', Id('constructor'), body));
  define('js.ast.debugger',             () => Debugger());
  define('js.ast.do-while',   (test, body) => DoWhile(test, body));
  define('js.ast.empty',                () => Empty());
  define('js.ast.for',     (x, y, z, body) => For(x, y, z, body));
  define('js.ast.for-in',    (x, xs, body) => ForIn(x, xs, body));
  define('js.ast.for-of',    (x, xs, body) => ForOf(x, xs, body));
  define('js.ast.function',  (i, ps, body) => Procedure(i, toArray(ps), body));
  define('js.ast.function*', (i, ps, body) => Generator(i, toArray(ps), body));
  define('js.ast.getter',       (id, body) => Slot('get', id, body));
  define('js.ast.id',                 name => Id(name));
  define('js.ast.if',         (test, x, y) => If(test, x, y));
  define('js.ast.let',          (id, init) => Let(id, init));
  define('js.ast.literal',           value => Literal(value));
  define('js.ast.member',      (obj, prop) => Member(obj, prop));
  define('js.ast.method',       (id, body) => Slot('method', id, body));
  define('js.ast.new-target',           () => NewTarget());
  define('js.ast.object',            props => NewObj(pairs(toArray(props)).map(([x, y]) => Property(x, y))));
  define('js.ast.return',              arg => Return(arg));
  define('js.ast.safe-id',            name => SafeId(name));
  define('js.ast.setter',       (id, body) => Slot('set', id, body));
  define('js.ast.sequence',          exprs => Sequence(...toArray(exprs)));
  define('js.ast.slot',   (kind, id, body) => Slot(kind, id, body));
  define('js.ast.spread',              arg => Spread(toArray(arg)));
  define('js.ast.statement',          expr => Statement(expr));
  define('js.ast.static',              arg => Static(arg));
  define('js.ast.super',                () => Super());
  define('js.ast.ternary',       (x, y, z) => Conditional(x, y, z));
  define('js.ast.this',                 () => This());
  define('js.ast.try',     (body, handler) => Try(body, handler));
  define('js.ast.update',       (op, x, y) => Assign(x, y, op + '='));
  define('js.ast.unary',           (op, x) => Unary(op, x));
  define('js.ast.var',          (id, init) => Var(id, init));
  define('js.ast.while',      (test, body) => While(test, body));
  define('js.ast.yield',               arg => Yield(arg));
  define('js.ast.yield*',              arg => YieldMany(arg));

  define('js.ast.compile', x => compile(x));
  define('js.ast.eval',    x => evalJs(x));
  pre('js.ast.inline',     x => evalShen(x));
  define('js.ast.render',  x => generate(x));

  define('js.raw.==',                           (x, y) => x == y);
  define('js.raw.===',                          (x, y) => x === y);
  define('js.raw.!=',                           (x, y) => x != y);
  define('js.raw.!==',                          (x, y) => x !== y);
  define('js.raw.not',                               x => !x);
  define('js.raw.and',                          (x, y) => x && y);
  define('js.raw.or',                           (x, y) => x || y);
  define('js.raw.+',                            (x, y) => x + y);
  define('js.raw.-',                            (x, y) => x - y);
  define('js.raw.*',                            (x, y) => x * y);
  define('js.raw./',                            (x, y) => x / y);
  define('js.raw.%',                            (x, y) => x % y);
  define('js.raw.**',                           (x, y) => x ** y);
  define('js.raw.bitwise.not',                       x => ~x);
  define('js.raw.bitwise.and',                  (x, y) => x & y);
  define('js.raw.bitwise.or',                   (x, y) => x | y);
  define('js.raw.bitwise.xor',                  (x, y) => x ^ y);
  define('js.raw.bitwise.left-shift',           (x, y) => x << y);
  define('js.raw.bitwise.right-shift',          (x, y) => x >> y);
  define('js.raw.bitwise.right-shift-unsigned', (x, y) => x >>> y);

  inline('js.raw.and', (x, y) => Binary('&&', x, y));
  inline('js.raw.or',  (x, y) => Binary('||', x, y));

  const funType = (first, ...rest) =>
    rest.length === 0
      ? [s`-->`, symbolOf(first)]
      : [first, ...flatMap(rest, x => [s`-->`, symbolOf(x)])];
  const A_B_boolean = funType('A', 'B', 'boolean');
  const number_number = funType('number', 'number');
  const number_number_number = funType('number', 'number', 'number');

  defineTyped('js.==',                           A_B_boolean,          (x, y) => asShenBool(x == y));
  defineTyped('js.!=',                           A_B_boolean,          (x, y) => asShenBool(x != y));
  defineTyped('js.===',                          A_B_boolean,          (x, y) => asShenBool(x === y));
  defineTyped('js.!==',                          A_B_boolean,          (x, y) => asShenBool(x !== y));
  defineTyped('js.%',                            number_number_number, (x, y) => asNumber(x) ** asNumber(y));
  defineTyped('js.**',                           number_number_number, (x, y) => asNumber(x) ** asNumber(y));
  defineTyped('js.bitwise.not',                  number_number,             x => ~asNumber(x));
  defineTyped('js.bitwise.and',                  number_number_number, (x, y) => asNumber(x) & asNumber(y));
  defineTyped('js.bitwise.or',                   number_number_number, (x, y) => asNumber(x) | asNumber(y));
  defineTyped('js.bitwise.xor',                  number_number_number, (x, y) => asNumber(x) ^ asNumber(y));
  defineTyped('js.bitwise.left-shift',           number_number_number, (x, y) => asNumber(x) << asNumber(y));
  defineTyped('js.bitwise.right-shift',          number_number_number, (x, y) => asNumber(x) >> asNumber(y));
  defineTyped('js.bitwise.right-shift-unsigned', number_number_number, (x, y) => asNumber(x) >>> asNumber(y));

  define('js.log',                       x => console.log(x));
  define('js.decode-uri',                x => decodeURI(x));
  define('js.decode-uri-component',      x => decodeURIComponent(x));
  define('js.encode-uri',                x => encodeURI(x));
  define('js.encode-uri-component',      x => encodeURIComponent(x));
  define('js.parse-float',               x => parseFloat(x));
  define('js.parse-int',                 x => parseInt(x, 10));
  define('js.parse-int-with-radix', (x, r) => parseInt(x, r));

  // TODO: separate namespace for functions that return js bool vs shen bool?
  // TODO: type could still be defined as A --> B --> boolean
  //       but if it returns boolean, make sure to apply asShenBool()
  define('js.defined?',        x => typeof x !== 'undefined');
  define('js.undefined?',      x => typeof x === 'undefined');
  define('js.truthy?',         x => !!x);
  define('js.falsy?',          x => !x);
  define('js.array?',          x => Array.isArray(x));
  define('js.async?',          x => x instanceof AsyncFunction);
  define('js.boolean?',        x => typeof x === 'boolean');
  define('js.finite?',         x => Number.isFinite(x));
  define('js.generator?',      x => x instanceof GeneratorFunction);
  define('js.infinite?',       x => !Number.isFinite(x));
  define('js.+infinity?',      x => x === Infinity);
  define('js.-infinity?',      x => x === -Infinity);
  define('js.integer?',        x => Number.isInteger(x));
  define('js.+integer?',       x => Number.isInteger(x) && x > 0);
  define('js.-integer?',       x => Number.isInteger(x) && x < 0);
  define('js.function?',       x => typeof x === 'function');
  define('js.null?',           x => x === null);
  define('js.nan?',            x => Number.isNaN(x));
  define('js.object?',         x => typeof x === 'object' && x !== null && !Array.isArray(x));
  define('js.symbol?',         x => typeof x === 'symbol');
  define('js.delete',     (x, y) => delete x[y]);
  define('js.eval',            x => eval(x));
  define('js.in',         (x, y) => x in y);
  define('js.instanceof', (x, y) => x instanceof y);
  define('js.typeof',          x => typeof x);
  define('js.void',            x => void x);

  define('js.new', (Class, args) => new Class(...toArray(asList(args))));
  define('js.set', (object, property, value) => object[property] = value);
  define('js.get', (object, property) => {
    const value = object[property];
    return typeof value === 'function' ? value.bind(object) : value;
  });
  defmacro('js.get-macro', expr => {
    if (isArray(expr) && expr[0] === s`.` && expr.length >= 2) {
      return expr.slice(2).reduce((whole, prop) => [s`js.get`, whole, prop], expr[1]);
    }
  });

  define('js.obj', values =>
    pairs(toArray(asList(values)))
      .reduce((obj, [name, value]) => (obj[name] = value, obj), {}));
  defmacro('js.obj-macro', expr => {
    if (isArray(expr) && expr[0] === s`{` && expr[expr.length - 1] === s`}`) {
      return [
        s`js.obj`,
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [s`cons`, head, tail], [])
      ];
    }
  });

  symbol('js.Array',             Array);
  symbol('js.ArrayBuffer',       ArrayBuffer);
  symbol('js.AsyncFunction',     AsyncFunction);
  symbol('js.Boolean',           Boolean);
  symbol('js.console',           console);
  symbol('js.DataView',          DataView);
  symbol('js.Date',              Date);
  symbol('js.Function',          Function);
  symbol('js.GeneratorFunction', GeneratorFunction);
  symbol('js.Infinity',          Infinity);
  symbol('js.JSON',              JSON);
  symbol('js.Map',               Map);
  symbol('js.Math',              Math);
  symbol('js.NaN',               NaN);
  symbol('js.Number',            Number);
  symbol('js.null',              null);
  symbol('js.Object',            Object);
  symbol('js.Promise',           Promise);
  symbol('js.Proxy',             Proxy);
  symbol('js.Reflect',           Reflect);
  symbol('js.RegExp',            RegExp);
  symbol('js.Set',               Set);
  symbol('js.String',            String);
  symbol('js.Symbol',            Symbol);
  symbol('js.undefined',         undefined);
  symbol('js.WeakMap',           WeakMap);
  symbol('js.WeakSet',           WeakSet);
  symbol('js.WebAssembly',       WebAssembly);

  if (typeof Atomics !== 'undefined') {
    symbol('js.Atomics', Atomics);
  }

  if (typeof globalThis !== 'undefined') {
    symbol('js.globalThis', globalThis);
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    symbol('js.SharedArrayBuffer', SharedArrayBuffer);
  }

  define('shen-script.lookup-function', x => functions[nameOf(asSymbol(x))] || null);
  symbol('shen-script.ast', ast);
  symbol('shen-script.$', $);

  define('shen-script.boolean.js->shen', x => asShenBool(x));
  define('shen-script.boolean.shen->js', x => asJsBool(x));
  // TODO: shen->js recursive, js->shen recursive

  defineTyped(
    'parallel.map',
    [[s`A`, s`-->`, s`B`], s`-->`, [s`list`, s`A`], s`-->`, [s`list`, s`B`]],
    (f, xs) => Promise.all(toArray(xs).map(x => run(f(x)))).then(a => toList(a)));
  defineTyped(
    'parallel.filter',
    [[s`A`, s`-->`, s`boolean`], s`-->`, [s`list`, s`A`], s`-->`, [s`list`, s`A`]],
    (f, xs) => Promise.all(toArray(xs).map(async x => ({ pass: asJsBool(await run(f(x))), value: x }))).then(a => toList(a.filter(x => x.pass).map(x => x.value))));
  // TODO: parallel.reduce typed function

  return Object.assign($, {
    caller, define, defineTyped, defmacro, evalShen, exec, execEach, inline, load, parse, pre, symbol
  });
};
