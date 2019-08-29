.. include:: directives.rst

Encoding of Semantics
=====================

Many of Shen's semantics are translated directly to matching concepts in JavaScript. Where there are incongruities, they are described here.

Data Types
----------

numbers, strings, exceptions, absvectors
  Shen numbers, strings, exceptions (Error) and absvectors (array) are just their related JavaScript types with no special handling.

symbols
  Shen symbols are interned JavaScript symbols fetched with :js:`Symbol.for` so two Shen symbols with the same name will be equivalent.

empty list
  JavaScript :js:`null` is used for the empty list.

conses
  ShenScript declares a :js:`Cons` class specifically to represent conses and cons lists.

functions, lambdas, continuations
  All function-like types are JavaScript functions that have been wrapped in logic to automatically perform partial and curried application.

streams
  Streams are implemented in a custom way by the host. Typically, they are objects with a :js:`close` function and a :js:`readByte` or :js:`writeByte` function.

Special Forms
-------------

if, and, or, cond
  Conditional code translates directly into matching JavaScript conditionals. :shen:`cond` expressions are turned into :js:`if` - :js:`else` chains.

simple-error, trap-error
  Error handling works just like JavaScript, using the :js:`throw` and :js:`try-catch` constructs.

  Both :js:`throw` and :js:`try` are statement syntax in JavaScript, so to make them expressions, there is the :js:`raise` function for throwing errors and :js:`try-catch` is wrapped in an `iife <https://javascript.info/closure#iife>`_ so it can be embedded in expressions. That iife is async and its invocation is awaited when in async mode.

defun, lambda, freeze
  All function forms build and return JavaScript functions.

let
  Local variable bindings are translated into immediately-invoked lambda expressions. This is both for brevity and it because it's the most natural way to translate Lisp-style let-as-an-expression since variable declarations are statements in JavaScript.

  Consider that the form :shen:`(let X Y Z)` can be transformed into the behaviorally equivalent :shen:`((lambda X Z) Y)`. ShenScript does not do it precisely this way because of involved optimizations, but that's the idea.

do
  The do form isn't officially a form in Shen, just a function that returns it's second argument, but it is handled as a form in ShenScript in order to take advantage of an additional opportunity for tail-call optimisation.

Shen Booleans vs JavaScript Booleans
------------------------------------

Shen uses the symbols :shen:`true` and :shen:`false` for booleans and does not have truthy or falsy semantics like JavaScript or other Lisps. This can make things tricky since Shen's :shen:`true` and :shen:`false` will always be considered :js:`true` by JavaScript, and in JavaScript, anything not falsy will count as :js:`true` and :js:`false`.

The KLambda-to-JavaScript transpiler does not actually consider booleans to be their own datatype, it treats them as any other symbol.

When doing interop between Shen and JavaScript, it will necessary to carefully convert between the two boolean representations as with so much JavaScript code's dependence on truthy/falsy semantics, there is no general way of doing so.

Equality
--------

Equality sematics are implemented by the :js:`equate` function in the :js:`backend` module.

Values are considered equivalent in ShenScript if they are equal according to the JavaScript :js:`===` operator or in the following cases:

  * Both values are :js:`Cons` and both their :js:`head` and :js:`tail` are equal according to :js:`equate`.
  * Both values are JavaScript arrays of the same length and all of their values are equal according to :js:`equate`.
  * Both values are JavaScript objects with the same constructor, same set of keys and the values for each key are equal according to :js:`equate`.

Partial Function Application
----------------------------

In Shen, functions have precise arities, and when a function is applied to fewer arguments than it takes, it returns a function that takes the remaining arguments. So since :shen:`+` takes two arguments, if it is applied to a single one, as in :shen:`(+ 1)`, the result is a function that takes one number and returns :shen:`1` plus that number.

ShenScript also supports curried application, where there are more arguments than the function actually takes. The function is applied to the first :code:`N` arguments equal to the function's arity, the result is asserted to be a function, and then the resulting function is applied to the remaining arguments. Repeat this process until there are no remaining arguments or until a non-function is returned and an error is raised.

.. warning:: Curried application is not a part of the Shen standard, is not supported by `shen-cl <https://github.com/Shen-Language/shen-cl>`_, and might be removed from ShenScript.

This is implemented in ShenScript for primitives, kernel functions and user-defined functions by wrapping them in a function that takes a variable number of arguments, checks the number passed in, and then returns another function to take the remaining arguments, performs curried application, or simply returns the result.

Tail-Call Optimization
----------------------

Tail-call optimization is required by the Shen standard and Shen code make prolific use of recursion making TCO a necessity.

In ShenScript, tail calls are handled dynamically using `trampolines <https://en.wikipedia.org/wiki/Trampoline_(computing)>`_. When a function is built by the transpiler, the lexical position of expressions are tracked as being in head or tail position. Function calls in head position are a simple invocation and the result is settled; calls in tail position are bounced.

settle
  Settling is the process of taking a value that might be a :js:`Trampoline`, checking if it's a tramoline, and if it is, running it. The result of running the trampoline is checked if it's a trampoline, and if so, that is run and this process is repeated until the final result is a non-trampoline value, which is returned.

bounce
  Bouncing a function call means making a trampoline from a reference to the function and the list of arguments and returning. The function will actually be invoked when the trampoline is settled at some point later.

Generation of Syntax
====================

Generating JavaScript
---------------------

ShenScript code generation is built on rendering objects rendering a JavaScript abstract syntax tree conforming to the informal `ESTree <https://github.com/estree/estree>`_ standard. These ASTs are then rendered to strings using the `astring <https://github.com/davidbonnet/astring>`_ library and then evaluated with an immediately-applied `Function <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function>`_ constructor.

The Function constructor acts as a kind of isolated-scope version of eval. When a Function is created this way, it does not capture local variables like eval does. This prevents odd behavior from cropping up where Shen code uses a variable or function name that matches some local variable.

Escaping Special Variable Names
-------------------------------

There are still some variables that need to be accessible to generated code, but not to the source code - referenceable in JavaScript, but not Shen. The main example is the environment object, conventionally named :js:`$`. Dollar signs and other special characters get escaped by replacing them with a dollar sign followed by the two-digit hex code for that character. Since dollar signs are valid identifier characters in JavaScript, hidden environment variables can be named ending with dollar sign, because if a Shen variable ends with :shen:`$`, the escaped JavaScript name will have a trailing :js:`$24` instead.

Dynamic Type-Checking
---------------------

Many JavaScript operators, like the :js:`+` operator, are not limited to working with specific types like they are in Shen. In JavaScript, :js:`+` can do numberic addition, string concatenation and offers a variety of strange behaviors are argument types are mixed. In Shen, the :shen:`+` function only works on numbers and passing a non-number is an error.

So in order to make sure these primitive functions are being applied to the correct types, there are a series of :js:`is` functions like :js:`isNumber`, :js:`isString` and :js:`isCons`, which determine if a value is of that type. There are also a series of :js:`as` functions for the same types which check if the argument is of that type and returns it if it is, but raises an error if it is not.

This allows concise definition of primitive functions. The :shen:`+` primitve is defined like this:

   .. code-block:: js

      (x, y) => asNumber(x) + asNumber(y)

and the :shen:`cn` primitive is defined like this:

   .. code-block:: js

      (x, y) => asString(x) + asString(y)

Code Inlining and Optimisation
------------------------------

To reduce the volume of generated code, and to improve performance, most primitive operations are inlined when fully applied. Since the type checks described in the previous section are still necessary, they get inlined as well, but can be excluded on certain circumstances. For instance, when generating code for the expression :shen:`(+ 1 X)`, it is certain that the argument expression :shen:`1` is of a numeric type as it is a numeric constant. So instead of generating the code :js:`asNumber(1) + asNumber(X)`, we can just render :js:`1 + asNumber(X)`.

The transpiler does this simple type inference following a few rules:

  * Literal numeric, string and idle symbol values are inferred to be of those types.

    * :shen:`123` is :code:`Number`.
    * :shen:`"hello"` is :code:`String`.
    * :shen:`thing` is :code:`Symbol`.

  * The value returned by a primitive function is inferred to be of that function's known return type, regardless of the type of the arguments. If the arguments are of an unexpected type, an error will be raised anyway.

    * :shen:`(+ X Y)` is :code:`Number`.
    * :shen:`(tlstr X)` is :code:`String`.
    * :shen:`(cons X Y)` is :code:`Cons`.

  * Local variables in :shen:`let` bindings are inferred to be of the type their bound value was inferred to be.

    * The :shen:`X` in :shen:`(+ X Y)` in :shen:`(let X 1 (+ X Y))` is :code:`Number`. :shen:`X` would not need an :js:`asNumber` cast in :shen:`(+ X Y)`.

  * The parameter to a lambda expression used as an error handler in a :shen:`trap-error` form is inferred to be :code:`Error`.

    * :shen:`(trap-error (whatever) (/. E (error-to-string E)))` does not generate an :js:`asError` check for :shen:`E`.

More sophisticated analysis could be done, but with dimishing returns in the number of cases it actually catches. And consider that user-defined functions can be re-defined, either in a REPL session or in code loaded from a file, meaning assumptions made by optimised functions could be invalidated. When a function was re-defined, all dependent functions would have to be re-visited and potentially all functions dependent on those functions. That's why these return type assumptions are only made for primitives.

Optional Pervasive Asynchronocity
---------------------------------

I/O functions, including primitives like :shen:`read-byte` and :shen:`write-byte` are idiomatically synchronous in Shen. This poses a problem when porting Shen to a platform like JavaScript which pervasively uses asynchronous I/O.

Functions like :shen:`read-byte` and :shen:`open` are especially problematic, because where :shen:`write-byte` and :shen:`close` can be fire-and-forget even if they do need to be async, Shen code will expect :shen:`read-byte` and :shen:`open` to be blocking and the kernel isn't designed to await a promise or even pass a continuation.

In order to make the translation process fairly direct, generated JavaScript uses `async/await <https://javascript.info/async-await>`_ syntax so that code structured like synchronous code can actually be asynchronous. This allows use of async functions to look just like the use of sync functions in Shen, but be realized however necessary in the host language.

:js:`async` code generation is actually controlled by a config flag passed when the backend is created. So if your Shen code is using synchronous I/O, or if it's not going to use I/O at all, you can enjoy a significant performance boost from using faster synchronous JavaScript.

Future Design Options
=====================

Some designs are still up in the air. They either solve remaining problems like performance or provide additional capabilites.

KLambda-Expression Interpreter
------------------------------

Some JavaScript environments will have a `Content Security Policy <https://developer.chrome.com/extensions/contentSecurityPolicy#JSEval>`_ enabled that forbids the use of :js:`eval` and :js:`Function`. This would completely break the current design of the ShenScript evaluator. The transpiler would continue to work, and could produce JavaScript ASTs, but they could not be evaluated.

A scratch ESTree interpreter could be written, but as it might need to support most of the capabilities of JavaScript itself, it would easier to write an interpreter that acts on the incoming KLambda expression trees themselves and forgo the transpiler entirely.

The obvious downside is that the interpreter would be much slower that generated JavaScript which would enjoy all the optimisations built into a modern runtime like V8. The interpreter would only be used when it was absolutely necessary.

Hybrid Sync-Async Kernel
------------------------

Currently, there is an option passed into the environment builder function that either loads a kernel rendered with all synchronous code or one with async/await. This results in using async functions when it isn't required and evaluating additional promise chains when a simple synchronous function call would do.

Instead, the environment could load a kernel with both versions of each function and generate sync and async versions of each user-defined function and use one or the other on a case-by-case basis.

For example, if we have Shen code like :shen:`(map F Xs)` and :shen:`F` is known not to be async, we can call the sync version of :shen:`map` which is tail-recursive or is a simple for-loop by way of a pinhole optimisation. This way, we won't have to evaluate the long chain of promises and trampolines the async version would result in for any list of decent length.

If we think of the dependencies between functions in the kernel and user code as a tree or a graph, there is one leg going down the side of it that actually needs to be async and the rest of it can remain sync. Detecting and isolating that sub-graph allows for plentiful optimisation.

Historical and Abandoned Design
===============================

String Concatenation
--------------------

In a much earlier version, code generation was done with JavaScript template strings and string concatenation. This was replaced with the use of the astring library since it is cleaner, more reliable and more flexible to have an AST that can undergo further manipulation as opposed to a final code string that can only be concatenated.

Fabrications
------------

Shen's code style is very expression-oriented and is most easily translated to another expression-oriented language. Most of Shen's forms translate directly to expression syntax in JavaScript without a problem. All function calls are expressions in JavaScript, conditions can use the :js:`? :` ternary operator, etc. Two forms in particular pose a problem: :shen:`let` and :shen:`trap-error` would most naturally be represented with statements in JavaScript.

We could just emit :code:`VariableDeclaration` and :code:`TryStatement` AST nodes for these forms, but that causes a compilication when either a statement or an expression might be emitted by the transpiler at any point in the code. And while it's easy to embed an expression in a statement construct - just by wrapping in an :code:`ExpressionStatement` - it's harder to embed a statement in an expression.

An expression like :shen:`(+ 1 (trap-error (whatever) (/. _ 0)))` would normally be rendered like :js:`1 + asNumber(trap(() => whatever(), _ => 0))`. How would it be rendered if we wanted to inline a :js:`try-catch` instead of using the :js:`trap` function?

The concept of a Fabrication (aka "fabr") was introduced to represent the composition of the two forms of syntax. Whenever a child form is built, it would return a fabr, consisting of a list of prerequiste statements and a resulting expression. Fabrs are typically composed by making a new fabr with all the statements from the first fabr, followed by the statements from the second fabr and then the result expressions are combined as they would be in the current design.

Since every fabr needs a result expression, for statement syntax, an additional variable declaration is added for a result variable and the result of the fabr is just the identifier expression for that variable.

An example like :shen:`(+ (let X 3 (* X 2)) (trap-error (whatever) (/. _ 0)))` would get rendered like this. The :shen:`(let X 3 (* X 2))` expression becomes:

   .. code-block:: none

      {
        "statements": [
          << const X = 3; >>
        ],
        "result": << X * 2 >>
      }

The :shen:`(trap-error (whatever) (/. _ 0))` becomes:

   .. code-block:: none

      {
        "statements": [
          << let R123$; >>,
          <<
            try {
              R123$ = settle(whatever());
            } catch (e$) {
              R123$ = 0;
            }
          >>
        ],
        "result": << R123$ >>
      }

And composed together, they are:

   .. code-block:: none

      {
        "statements": [
          << const X = 3; >>
          << let R123$; >>,
          <<
            try {
              R123$ = settle(whatever());
            } catch (e$) {
              R123$ = 0;
            }
          >>
        ],
        "result": << (X * 2) + asNumber(R123$) >>
      }

This whole approach was attempted on the premise that using more idiomatic JavaScript syntax would give the runtime more opportunities to identify optimisations vs using :js:`trap` and immediately-invoked lambdas. Turns out using fabrs produced about twice the code volume and benchmarks took 3-4 times as long to run. I guess V8 is really good at optimising IIFEs. So fabrs were reverted. The design is documented here for historical reasons.
