const { AsyncFunction, GeneratorFunction, last, mapAsync, produce, raise } = require('./utils');
const {
  Arrow, Assign, Async, Await, Binary, Block, Call, Catch, Class, Conditional, Const, Debugger, Empty,
  For, ForIn, ForOf, Generator, Id, If, Let, Literal, Member, NewObj, NewTarget, Procedure, Property, Return,
  SafeId, Sequence, Slot, Spread, Statement, Static, Super, This, Try, Unary, Var, Vector, While, Yield, YieldMany
} = require('./ast');

module.exports = $ => {
  const {
    asCons, asShenBool, asString, async, cons, consToArray, evalJs, fun, functions, future, inlines,
    isArray, isCons, s, settle, symbolOf, symbols, valueOf, valueFromArrayTree, valueToArrayTree
  } = $;
  const run = async ? future : settle;
  const parse = source => run(functions['read-from-string'](source));
  const caller = name => (...args) => run(functions[name](...args));
  const define = (name, f) => {
    const nameSymbol = symbolOf(name);
    const funf = fun(f);
    // TODO: calls to (put) need to be awaited if in async mode
    //       i'd rather not do that, but the structure of the *property-vector*
    //       is dictated by the kernel and i can't muck with it
    functions.put(nameSymbol, s`shen.lambda-form`, funf, valueOf('*property-vector*'));
    functions.put(nameSymbol, s`arity`, f.length, valueOf('*property-vector*'));
    functions[name] = funf;
    return nameSymbol;
  }
  const defmacro = (name, fn) => {
    const macrofn = expr => {
      const result = valueFromArrayTree(fn(valueToArrayTree(expr)));
      return result === undefined ? expr : result;
    };
    define(name, macrofn);
    const macroreg = valueOf('shen.*macroreg*');
    const macros = valueOf('*macros*');
    const nameSymbol = symbolOf(name);
    if (!consToArray(macroreg).includes(nameSymbol)) {
      symbols['shen.*macroreg*'] = cons(nameSymbol, macroreg);
      symbols['*macros*'] = cons(fun(x => macrofn(x)), macros);
    }
    return nameSymbol;
  };
  const evalShen = expr => run(functions.eval(expr));
  const execEach = async
    ? async source => mapAsync(consToArray(await parse(source)), evalShen)
    :       source => consToArray(parse(source)).map(evalShen);
  const exec = async
    ? async source => last(await execEach(source))
    :       source => last(execEach(source));
  const symbol = (name, value) => {
    const index = name.lastIndexOf('.') + 1;
    const starredName = `${name.substr(0, index)}*${name.substr(index)}*`;
    define(name, () => valueOf(starredName));
    return symbols[starredName] = value;
  };
  const inline = (name, fn) => inlines[name] = fn;
  const load = caller('load');

  define('js.ast.literal',           value => Literal(value));
  define('js.ast.array',          elements => Vector(consToArray(elements)));
  define('js.ast.id',                 name => Id(name));
  define('js.ast.safe-id',            name => SafeId(name));
  define('js.ast.const',        (id, init) => Const(id, init));
  define('js.ast.let',          (id, init) => Let(id, init));
  define('js.ast.var',          (id, init) => Var(id, init));
  define('js.ast.arguments',            () => Id('arguments'));
  define('js.ast.debugger',             () => Debugger());
  define('js.ast.new-target',           () => NewTarget());
  define('js.ast.this',                 () => This());
  define('js.ast.unary',           (op, x) => Unary(op, x));
  define('js.ast.binary',       (op, x, y) => Binary(op, x, y));
  define('js.ast.cond',          (x, y, z) => Conditional(x, y, z));
  define('js.ast.assign',           (x, y) => Assign(x, y));
  define('js.ast.update',       (op, x, y) => Assign(x, y, op + '='));
  define('js.ast.call',          (f, args) => Call(f, consToArray(args)));
  define('js.ast.spread',              arg => Spread(consToArray(arg)));
  define('js.ast.super',                () => Super());
  define('js.ast.block',              body => Block(...consToArray(body)));
  define('js.ast.empty',                () => Empty());
  define('js.ast.sequence',          exprs => Sequence(...consToArray(exprs)));
  define('js.ast.member',      (obj, prop) => Member(obj, prop));
  define('js.ast.object',            props => NewObj(valueToArrayTree(props).map(([x, y]) => Property(x, y))));
  define('js.ast.class', (id, base, slots) => Class(id, base, slots));
  define('js.ast.slot',   (kind, id, body) => Slot(kind, id, body));
  define('js.ast.constructor',        body => Slot('constructor', Id('constructor'), body));
  define('js.ast.method',       (id, body) => Slot('method', id, body));
  define('js.ast.getter',       (id, body) => Slot('get', id, body));
  define('js.ast.setter',       (id, body) => Slot('set', id, body));
  define('js.ast.arrow',    (params, body) => Arrow(consToArray(params), body));
  define('js.ast.function',           body => Procedure(body));
  define('js.ast.function*',          body => Generator(body));
  define('js.ast.return',              arg => Return(arg));
  define('js.ast.yield',               arg => Yield(arg));
  define('js.ast.yield*',              arg => YieldMany(arg));
  define('js.ast.await',               arg => Await(arg));
  define('js.ast.async',               arg => Async(arg));
  define('js.ast.static',              arg => Static(arg));
  define('js.ast.if',         (test, x, y) => If(test, x, y));
  define('js.ast.try',     (body, handler) => Try(body, handler));
  define('js.ast.catch',     (param, body) => Catch(param, body));
  define('js.ast.while',      (test, body) => While(test, body));
  define('js.ast.for',     (x, y, z, body) => For(x, y, z, body));
  define('js.ast.for-in',    (x, xs, body) => ForIn(x, xs, body));
  define('js.ast.for-of',    (x, xs, body) => ForOf(x, xs, body));
  define('js.ast.statement',          expr => Statement(expr));

  define('js.ast.eval',   x => evalJs(x));
  inline('js.ast.inline', x => Call(Member(Id('$'), Id('evalJs')), [x]));

  // TODO: js. functions can do asX() type-checking
  // TODO: declare types for these functions where possible?
  define('js.log',             x => console.log(x));
  define('js.new', (Class, args) => new Class(...consToArray(asCons(args))));
  define('js.==',         (x, y) => x == y);
  define('js.===',        (x, y) => x === y);
  define('js.!',               x => !x);
  define('js.&&',         (x, y) => x && y);
  define('js.||',         (x, y) => x || y);
  define('js.~',               x => ~x);
  define('js.&',          (x, y) => x & y);
  define('js.|',          (x, y) => x | y);
  define('js.><',         (x, y) => x ^ y);
  define('js.<<',         (x, y) => x << y);
  define('js.>>',         (x, y) => x >> y);
  define('js.>>>',        (x, y) => x >>> y);
  define('js.defined?',        x => typeof x !== 'undefined');
  define('js.undefined?',      x => typeof x === 'undefined');
  define('js.truthy?',         x => asShenBool(x));
  define('js.falsy?',          x => asShenBool(!x));
  // TODO: shen->js bool, js->shen bool
  // TODO: shen->js recursive, js->shen recursive
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

  define('js.new-obj', values => {
    const array = consToArray(asCons(values));
    return array.length % 2 === 0
      ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), array)
        .reduce((obj, [name, value]) => (obj[name] = value, obj), {})
      : raise('js.new-obj must take an even-length key-value list');
  });
  defmacro('js.new-obj-macro', expr => {
    if (isArray(expr) && expr[0] === s`{` && expr[expr.length - 1] === s`}`) {
      return [
        s`js.new-obj`,
        expr.slice(1, expr.length - 1).reduceRight((tail, head) => [s`cons`, head, tail], [])
      ];
    }
  });

  symbol('js.Array',              Array);
  symbol('js.ArrayBuffer',        ArrayBuffer);
  symbol('js.AsyncFunction',      AsyncFunction);
  symbol('js.Boolean',            Boolean);
  symbol('js.console',            console);
  symbol('js.DataView',           DataView);
  symbol('js.Date',               Date);
  symbol('js.decodeURI',          decodeURI);
  symbol('js.decodeURIComponent', decodeURIComponent);
  symbol('js.encodeURI',          encodeURI);
  symbol('js.encodeURIComponent', encodeURIComponent);
  symbol('js.Function',           Function);
  symbol('js.GeneratorFunction',  GeneratorFunction);
  symbol('js.Infinity',           Infinity);
  symbol('js.JSON',               JSON);
  symbol('js.Map',                Map);
  symbol('js.Math',               Math);
  symbol('js.NaN',                NaN);
  symbol('js.Number',             Number);
  symbol('js.null',               null);
  symbol('js.Object',             Object);
  symbol('js.parseFloat',         parseFloat);
  symbol('js.parseInt',           parseInt);
  symbol('js.Promise',            Promise);
  symbol('js.Proxy',              Proxy);
  symbol('js.Reflect',            Reflect);
  symbol('js.RegExp',             RegExp);
  symbol('js.Set',                Set);
  symbol('js.String',             String);
  symbol('js.Symbol',             Symbol);
  symbol('js.undefined',          undefined);
  symbol('js.WeakMap',            WeakMap);
  symbol('js.WeakSet',            WeakSet);
  symbol('js.WebAssembly',        WebAssembly);

  if (typeof Atomics !== 'undefined') {
    symbol('js.Atomics', Atomics);
  }

  if (typeof globalThis !== 'undefined') {
    symbol('js.globalThis', globalThis);
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    symbol('js.SharedArrayBuffer', SharedArrayBuffer);
  }

  define('shen-script.lookup-function', x => functions[asString(x)] || null);
  symbol('shen-script.$', $);
  return Object.assign($, { caller, define, defmacro, evalShen, exec, execEach, load, symbol, inline, parse });
};
