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
