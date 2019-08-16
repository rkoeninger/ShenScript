.. include:: directives.rst

Design and Implementation Details
=================================

Equality
--------

Equality sematics are implemented by the :js:`equate` function in the :js:`backend` module.

Values are considered equivalent in ShenScript if they are equal according to the JavaScript :js:`===` operator or in the following cases:

  * Both values are :js:`Cons` and both their :js:`head` and :js:`tail` are equal according to :js:`equate`.
  * Both values are JavaScript arrays of the same length and all of their values are equal according to :js:`equate`.
  * Both values are JavaScript objects with the same constructor, same set of keys and the values for each key are equal according to :js:`equate`.

Other
-----

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
