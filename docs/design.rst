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
  Error handling works just like JavaScript, using the :js:`throw` and :js:`try` / :js:`catch` constructs.

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

Design and Implementation Details
=================================

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
  * The value returned by primitive functions is inferred to be a particular type.
    * The result of :shen:`(+ X Y)` is :code:`Number` regardless of the types of the arguments.
    * :shen:`(tlstr X)` is :code:`String`.
    * :shen:`(cons X Y)` is :code:`Cons`.
  * Local variables in :shen:`let` bindings are inferred to be of the type their bound value was inferred to be.
    * :shen:`(let X 1 (+ X Y))` would not need an :js:`asNumber` cast for :shen:`X`.
  * The parameter to a lambda expression used as an error handler in a :shen:`trap-error` form is inferred to be :code:`Error`.
    * :shen:`(trap-error (whatever) (/. E (error-to-string E)))` does not generate an :js:`asError` check for :shen:`E`.

More sophisticated analysis could be done, but with dimishing returns in the number of cases it actually catches. And consider that user-defined functions can be re-defined, either in a REPL session or in code loaded from a file, meaning assumptions made by optimised functions could be invalidated. When a function was re-defined, all dependent functions would have to be re-visited and potentially all functions dependent on those functions. That's why these return type assumptions are only made for primitives.

Optional Pervasive Asynchronocity
---------------------------------

I/O functions, including primitives like :shen:`read-byte` and :shen:`write-byte` are idiomatically synchronous in Shen. This poses a problem when porting Shen to a platform like JavaScript which pervasively uses asynchronous I/O.

Functions like :shen:`read-byte` and :shen:`open` are especially problematic, because where :shen:`write-byte` and :shen:`close` can be fire-and-forget even if they do need to be async, Shen code will expect :shen:`read-byte` and :shen:`open` to be blocking and the kernel isn't designed to await a promise or even pass a continuation.

In order to make the translation process fairly direct, generated JavaScript uses `async/await <https://javascript.info/async-await>`_ syntax so that code structured like synchronous code can actually be asynchronous.

:js:`async` code generation is actually controlled by a config flag passed when the backend is created. So if your Shen code is using synchronous I/O, or if it's not going to use I/O at all, you can enjoy a significant performance boost from using faster synchronous JavaScript.

Alternate Designs Considered
============================

Hybrid Sync-Async Kernel
------------------------

Fabrs/Fabrications
------------------

KL AST interpreter in case CSP policy prevents use of eval() and Function()
---------------------------------------------------------------------------
