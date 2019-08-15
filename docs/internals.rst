ShenScript Implementation Internals
===================================

.. note:: Some of these functions and classes are exported, but they are primarily referred to internally. They are exported so generated JavaScript code will have access to them.

Functions
---------

symbolOf, s
nameOf
raise
trapSync
trapAsync
bounce, b
settle, t
future, u
fun, l
functions, f
symbols
compile
inlines
preprocessors
awaitedInlines
as*
is*

Classes
-------

.. class:: Cons(head, tail)

   The classic Lisp cons cell. :js:`head` and :js:`tail` are akin to :js:`car` and :js:`cdr`.

   When a chain of :js:`Cons` is used to build a list, the last :js:`Cons` in the chain has a :js:`tail` of :js:`null`.

   :param any head: Named :js:`head` because it's typically the head of a list.
   :param any tail: Named :js:`tail` because it's typically the tail of a list.

.. class:: Trampoline(f, args)

   A :js:`Trampoline` represents a deferred tail call.

   :param function f: A JavaScript function.
   :param array args: A JavaScript array of arguments that :code:`f` will get applied to.

.. function:: bounce(f, args)

   Creates a :js:`Trampoline`.

   :param function f: A JavaScript function.
   :param args:       A variadic parameter containing any values.
   :returns:          A :js:`Trampoline`.

.. function:: settle(x)

   If given a trampoline, runs trampoline and checks if result is a trampoline, in which case that is then run. Process repeats until result is not a trampoline. Never returns a trampoline. Potentially any function in :js:`functions` will need to be settled after being called to get a useful value.

   :param any x: May be a :js:`Trampoline`, which will be run, or any other value, which will be returned immediately.
   :returns:     Final non-trampoline result.

.. function:: future(x)

   Same purpose as :js:`settle`, but works asynchronously and will always return a :js:`Promise`, which will yield and non-trampoline value.

   :param any x: May or may not be a :js:`Promise` and may be a :js:`Trampoline`, which will be run, or any other value, which will be returned immediately.
   :returns:     Final non-trampoline result wrapped in a :js:`Promise`.

ShenScript Interals Access Functions
------------------------------------

These functions are callable from Shen to give access to the implementation details of ShenScript.

.. function:: shen-script.lookup-function

   Allows lookup of global function by name instead of building wrapper lambdas or the like.

   :param symbol Name: Name of function to lookup.
   :returns:           Shen function by that name, or :shen:`[]` when function does not exist.

.. function:: shen-script.$

   Provides access to the ShenScript environment object, which when combined with :code:`js` interop functions, allows arbitrary manipulation of the port's implementation details from Shen.

   :returns: ShenScript environment object.

.. function:: shen-script.boolean.js->shen

   Converts a JavaScript boolean to a Shen boolean. Any truthy value counts as JavaScript :js:`true` and any falsy value counts as JavaScript :js:`false`.

   :param any X: Accepts any value as an argument.
   :returns:     A Shen boolean.

.. function:: shen-script.boolean.shen->js

   Converts a Shen boolean to a JavaScript boolean.

   :param boolean X: A Shen boolean.
   :returns:         A JavaScript boolean.
   :throws:          Error if argument is not a Shen boolean.
