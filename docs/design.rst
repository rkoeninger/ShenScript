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

Shen uses the symbols :shen:`true` and :shen:`false` for booleans and does not have truthy or falsy semantics like JavaScript or other Lisps. This can make things tricky since Shen's :shen:`true` and :shen:`false` will always be considered :js:`true` by JavaScript, and in JavaScript, anything can count as :js:`true` and :js:`false`.

The KLambda-to-JavaScript transpiler does not actually consider booleans to be their own datatype.

When doing interop between Shen and JavaScript, it will necessary to carefully convert between the two boolean representations as with so much JavaScript code's dependence on truthy/falsy semantics, there is no general way of doing so.

Equality
--------

Equality sematics are implemented by the :js:`equate` function in the :js:`backend` module.

Values are considered equivalent in ShenScript if they are equal according to the JavaScript :js:`===` operator or in the following cases:

  * Both values are :js:`Cons` and both their :js:`head` and :js:`tail` are equal according to :js:`equate`.
  * Both values are JavaScript arrays of the same length and all of their values are equal according to :js:`equate`.
  * Both values are JavaScript objects with the same constructor, same set of keys and the values for each key are equal according to :js:`equate`.

Design and Implementation Details
=================================

  * Translating KL to ESTree, rendering with astring and evaluating with Function()
  * js.ast functions, inlines, preprocessors to allow port to control code generation
  * The use of $ as special escape char
  * Functions decorated with Partial/Curried Application
  * TCO using Trampolines
  * Optional Pervasive Async

Alternate Designs Considered
============================

  * Fabrs/Fabrications
  * KL AST interpreter in case CSP policy prevents use of eval() and Function()
