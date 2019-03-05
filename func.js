const fun = (f, id = f.name, arity = f.length) =>
  Object.assign(
    (...args) =>
      args.length === arity ? f(...args) :
      args.length > arity ? f(...args.slice(0, arity))(args.slice(f.arity)) :
      fun((...more) => f(...args, ...more), `${id}(${args.length})`, arity - args.length),
    { id, arity });

const plus = fun((x, y) => x + y, 'plus', 2);
const plus1 = plus(1);
const plusResult = plus1(2);
const add = fun(x => fun(y => x + y, 'add_', 1), 'add', 1);
const add1 = add(1);
const addResult = add1(2);

console.log('plus:');
console.log(plus);
console.log('plus.id:');
console.log(plus.id);
console.log('plus.arity:');
console.log(plus.arity);
console.log('plus1:');
console.log(plus1);
console.log('plus1.id:');
console.log(plus1.id);
console.log('plus1.arity:');
console.log(plus1.arity);
console.log('plusResult:');
console.log(plusResult);
console.log('plusResult.id:');
console.log(plusResult.id);
console.log('plusResult.arity:');
console.log(plusResult.arity);

console.log('add:');
console.log(add);
console.log('add.id:');
console.log(add.id);
console.log('add.arity:');
console.log(add.arity);
console.log('add1:');
console.log(add1);
console.log('add1.id:');
console.log(add1.id);
console.log('add1.arity:');
console.log(add1.arity);
console.log('addResult:');
console.log(addResult);
console.log('addResult.id:');
console.log(addResult.id);
console.log('addResult.arity:');
console.log(addResult.arity);
