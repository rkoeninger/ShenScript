Accessing ShenScript Internals from JavaScript
==============================================

.. note:: Some of these functions and classes are exported, but they are primarily referred to internally. They are exported so generated JavaScript code will have access to them. Or, in rare cases, they are exported in case your Shen code needs to work around something.

Data
----

.. note:: These objects are not meant to be tampered with by user or client code. Tinker with them if you must, but it will void the warranty.

.. data:: inlines

   Code inlining rules, indexed by the string name of the symbol that triggers them.

.. data:: preprocessors

   Code pre-processor rules, indexed by the string name of the symbol that triggers them.

.. data:: awaitedInlines

   Collection of inlined functions that must be awaited.

.. data:: functions

   Collection of Shen functions, indexed by string name.

   Aliased as :js:`f` for brevity in generated code.

.. data:: symbols

   Collection of Shen global symbols, indexed by string name.

Classes
-------

.. class:: Cons(head, tail)

   The classic Lisp cons cell. :js:`head` and :js:`tail` are akin to :js:`car` and :js:`cdr`.

   When a chain of :js:`Cons` is used to build a list, the last :js:`Cons` in the chain has a :js:`tail` of :js:`null`.

   :param any head: Named :js:`head` because it's typically the head of a list.
   :param any tail: Named :js:`tail` because it's typically the tail of a list.

.. class:: Context(options)

   :js:`Context` objects are passed between calls to the :js:`build` function to track syntax context and rendering options.

   :param object  options:               Collection of code generation options.
   :param boolean options.async:         :js:`true` if code should be generated in async mode.
   :param boolean options.head:          :js:`true` if current expression is in head position.
   :param Map     options.locals:        Used as an immutable map of local variables and their known types.
   :param object  options.inlines:       Object containing code inlining rules.
   :param object  options.preprocessors: Object containing code pre-processing rules.

.. class:: Trampoline(f, args)

   A :js:`Trampoline` represents a deferred tail call.

   :param function f: A JavaScript function.
   :param array args: A JavaScript array of arguments that :code:`f` will get applied to.

Functions
---------

.. function:: symbolOf(name)

   Returns the interned symbol by the given name.

   Aliased as :js:`s` for brevity in generated code.

   :param string name: Symbol name.
   :returns:           Symbol by that name.

.. function:: nameOf(symbol)

   Returns string name of given symbol. Symbol does not have to have been declared.

   :param symbol symbol: A symbol.
   :returns:             Symbol name.

.. function:: raise(message)

   Throws an Error with the given message.

   :param string message: Error message.
   :returns:              Doesn't.
   :throws:               Error with the given message.

.. function:: trapSync(body, handler)

   Invokes :js:`body` with no arguments. If it raises an error, invokes :js:`handler`, passing it the error, and returns the result.

   :param function body:    Zero-parameter function.
   :param function handler: One-parameter function.
   :returns:                The result of calling :js:`body` or the result of :js:`handler` if :js:`body` failed.

.. function:: trapAsync(body, handler)

   Invokes :js:`body` with no arguments and awaits the result. If it raises an error, invokes :js:`handler`, passing it the error, and returns the result.

   :param function body:    Zero-parameter function.
   :param function handler: One-parameter function.
   :returns:                The result of calling :js:`body` or the result of :js:`handler` if :js:`body` failed, wrapped in a :js:`Promise`.

.. function:: bounce(f, args)

   Creates a :js:`Trampoline`.

   Aliased as :js:`b` for brevity in generated code.

   :param function f: A JavaScript function.
   :param args:       A variadic parameter containing any values.
   :returns:          A :js:`Trampoline`.

.. function:: settle(x)

   If given a trampoline, runs trampoline and checks if result is a trampoline, in which case that is then run. Process repeats until result is not a trampoline. Never returns a trampoline. Potentially any function in :js:`functions` will need to be settled after being called to get a useful value.

   Aliased as :js:`t` for brevity in generated code.

   :param any x: May be a :js:`Trampoline`, which will be run, or any other value, which will be returned immediately.
   :returns:     Final non-trampoline result.

.. function:: future(x)

   Same purpose as :js:`settle`, but works asynchronously and will always return a :js:`Promise`, which will yield and non-trampoline value.

   Aliased as :js:`u` for brevity in generated code.

   :param any x: May or may not be a :js:`Promise` and may be a :js:`Trampoline`, which will be run, or any other value, which will be returned immediately.
   :returns:     Final non-trampoline result wrapped in a :js:`Promise`.

.. function:: fun(f)

   Takes a function that takes a precise number of arguments and returns a wrapper that automatically applies partial and curried application.

   Aliased as :js:`l` for brevity in generated code.

   :param function f: Function wrap with partial application logic.
   :returns:          Wrapper function.

.. function:: compile(expr)

   Builds a KLambda expression tree in the root context.

   :param expr expr: Expression to build.
   :returns:         Rendered JavaScript AST.

.. function:: as___(x)

   There are several functions following this naming pattern which first check if their argument passes the related :js:`is___` function and returns it if it does. If it does not pass the type check, an error is raised.

   :param any x: Whatever.
   :returns:     The same value.
   :throws:      If argument does not pass the type check.

.. function:: is___(x)

   There are several functions following this naming pattern which checks if the argument qualifies as the type it's named for.

   :param any x: Whatever.
   :returns:     A JavaScript boolean.

Accessing ShenScript Internals from Shen
========================================

Functions
---------

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
