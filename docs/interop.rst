.. include:: directives.rst

Shen Interop
============

The environment object, $, comes with additional functions to make JS functions callable from Shen, setting global symbols, declaring types and macros, etc.

Some of these will return a promise if the environment with built in async mode.

parse
caller
valueOf
show
equate
define
defineTyped
defmacro
symbol
inline
pre
load
evalShen
evalJs
evalKl
exec
execShen
cons
consFromArray, r
consToArray
consFromArrayTree
consToArrayTree
valueFromArray
valueFromArrayTree
valueToArray
valueToArrayTree

JavaScript Interop
==================

ShenScript provides functions in the `js.` namespace to access JavaScript standard classes and functionality.

AST Functions
-------------

Functions in the `js.ast.` namespace are used to construct, emit and evaluate arbitrary javascript code.

js.ast.literal
js.ast.array
js.ast.id
js.ast.safe-id
js.ast.const
js.ast.let
js.ast.var
js.ast.arguments
js.ast.debugger
js.ast.new-target
js.ast.this
js.ast.unary
js.ast.binary
js.ast.cond
js.ast.assign
js.ast.update
js.ast.call
js.ast.spread
js.ast.super
js.ast.block
js.ast.empty
js.ast.sequence
js.ast.member
js.ast.object
js.ast.class
js.ast.slot
js.ast.constructor
js.ast.method
js.ast.getter
js.ast.setter
js.ast.arrow
js.ast.function
js.ast.function*
js.ast.return
js.ast.yield
js.ast.yield*
js.ast.await
js.ast.async
js.ast.static
js.ast.if
js.ast.try
js.ast.catch
js.ast.while
js.ast.for
js.ast.for-in
js.ast.for-of
js.ast.statement

js.ast.eval
js.ast.inline

Unchecked Math Operators
------------------------

.. function:: js.unchecked.+

   Applies the JavaScript :code:`+` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`+` does based on JavaScript-specific behavior.

.. function:: js.unchecked.-

   Applies the JavaScript :code:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`-` does based on JavaScript-specific behavior.

.. function:: js.unchecked.*

   Applies the JavaScript :code:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`*` does based on JavaScript-specific behavior.

.. function:: js.unchecked./

   Applies the JavaScript :code:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`/` does based on JavaScript-specific behavior.

.. function:: js.unchecked.**

   Applies the JavaScript :code:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`**` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.not

   Applies the JavaScript :code:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`!` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.and

   Applies the JavaScript :code:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`&` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.or

   Applies the JavaScript :code:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`|` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.xor

   Applies the JavaScript :code:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`^` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.left-shift

   Applies the JavaScript :code:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`<<` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift

   Applies the JavaScript :code:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`>>` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift-unsigned

   Applies the JavaScript :code:`>>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X:
   :param Y:
   :returns: Whatever :code:`>>>` does based on JavaScript-specific behavior.

Typed Operators
---------------

.. function:: js.% : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`%` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.** : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`**` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.not : number --> number

   Checks argument is a number and then applies the JavaScript :code:`~` operator.

   :param number X:
   :returns: A Shen number.

.. function:: js.bitwise.and : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`&` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.or : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`|` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.xor : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`^` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.left-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`<<` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.right-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

.. function:: js.bitwise.right-shift-unsigned : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>>` operator.

   :param number X:
   :param number Y:
   :returns: A Shen number.

Object Construction, Member Access
----------------------------------

Remember that properties on JavaScript object are named with strings, so using Shen strings for property names is recommended for these functions. For example, the JavaScript code :code:`x.y` would get written like :code:`(js.get X "y")`.

Idle symbols can be used for property names, but they will represented with interned JavaScript symbols.

.. function:: js.new

   Creates new instance of class by calling given constructor on argument list.

   :param constructor Class: Constructor to call.
   :param list Args:         Constructor arguments in a Shen list.
   :returns:                 New instance of :code:`Class`.

.. function:: js.obj

   Creates new :code:`Object` with properties of given names and values.

   :param list Values: Shen list of property names and values, every other like :code:`["name1" Val1 "name2" Val2]`.
   :returns:           New :code:`Object`.

.. function:: js.obj-macro

   Macro that converts syntax like :code:`({ A B C D })` to :code:`(js.obj [A B C D])`.

.. function:: js.set

   Assigns property on a JavaScript object.

   :param object Object: Object to write to.
   :param any Property:  Property name to set.
   :param any Value:     Value to assign.
   :returns:             :code:`Value`, just like the JavaScript assignment operator.

.. function:: js.get

   Retrieves a property's value from a JavaScript object.

   :param object Object: Object to read from.
   :param any Property:  Property name to get.
   :returns:             Property value.

.. function:: js.get-macro

   Macro that converts variable-depth accessor syntax like :code:`(. X Y Z)` to :code:`(js.get (js.get X Y) Z)`.

Global Functions
----------------

js.log
js.decodeURI
js.decodeURIComponent
js.encodeURI
js.encodeURIComponent
js.parseFloat
js.parseInt
js.parseIntRadix
js.==
js.===
js.!=
js.!==
js.not
js.and
js.or
js.defined?
js.undefined?
js.truthy?
js.falsy?
js.array?
js.async?
js.boolean?
js.finite?
js.generator?
js.infinite?
js.+infinity?
js.-infinity?
js.integer?
js.+integer?
js.-integer?
js.function?
js.null?
js.nan?
js.object?
js.symbol?
js.delete
js.eval
js.in
js.instanceof
js.typeof
js.void

Global Classes, Values and Functions
------------------------------------

Functions to retrieve common JavaScript globals.

.. Hint:: You can check if a symbol is defined with :shen:`(bound? Symbol)`.

.. function:: js.Array

   Calling with no arguments returns the global JavaScript :code:`Array` class.

.. function:: js.ArrayBuffer

   Calling with no arguments returns the global JavaScript :code:`ArrayBuffer` class.

.. function:: js.AsyncFunction

   Calling with no arguments returns the global JavaScript :code:`AsyncFunction` class.

.. function:: js.Atomics

   Calling with no arguments returns the global JavaScript :code:`Atomics` class. This is not available in Firefox.

.. function:: js.Boolean

   Calling with no arguments returns the global JavaScript :code:`Boolean` class.

.. function:: js.console

   Calling with no arguments returns the global JavaScript :code:`console` object.

.. function:: js.DataView

   Calling with no arguments returns the global JavaScript :code:`DataView` class.

.. function:: js.Date

   Calling with no arguments returns the global JavaScript :code:`Date` class.

.. function:: js.Function

   Calling with no arguments returns the global JavaScript :code:`Function` class.

.. function:: js.GeneratorFunction

   Calling with no arguments returns the global JavaScript :code:`GeneratorFunction` class.

.. function:: js.globalThis

   Calling with no arguments returns the global JavaScript :code:`globalThis` object. If :code:`globalThis` is not defined in this JavaScript environment, then :code:`window`, :code:`global`, etc is used as appropriate.

.. function:: js.Infinity

   Calling with no arguments returns the JavaScript :code:`Infinity` value.

.. function:: js.JSON

   Calling with no arguments returns the global JavaScript :code:`JSON` object.

.. function:: js.Map

   Calling with no arguments returns the global JavaScript :code:`Map` class.

.. function:: js.NaN

   Calling with no arguments returns the JavaScript :code:`NaN` value.

.. function:: js.Number

   Calling with no arguments returns the global JavaScript :code:`Number` class.

.. function:: js.null

   Calling with no arguments returns the JavaScript :code:`null` value.

.. function:: js.Object

   Calling with no arguments returns the global JavaScript :code:`Object` class.

.. function:: js.Promise

   Calling with no arguments returns the global JavaScript :code:`Promise` class.

.. function:: js.Proxy

   Calling with no arguments returns the global JavaScript :code:`Proxy` class.

.. function:: js.Reflect

   Calling with no arguments returns the global JavaScript :code:`Reflect` class.

.. function:: js.RegExp

   Calling with no arguments returns the global JavaScript :code:`RegExp` class.

.. function:: js.Set

   Calling with no arguments returns the global JavaScript :code:`Set` class.

.. function:: js.SharedArrayBuffer

   Calling with no arguments returns the global JavaScript :code:`SharedArrayBuffer` class. This is not available in Firefox.

.. function:: js.String

   Calling with no arguments returns the global JavaScript :code:`String` class.

.. function:: js.Symbol

   Calling with no arguments returns the global JavaScript :code:`Symbol` class.

.. function:: js.undefined

   Calling with no arguments returns the JavaScript :code:`undefined` value.

.. function:: js.WeakMap

   Calling with no arguments returns the global JavaScript :code:`WeakMap` class.

.. function:: js.WeakSet

   Calling with no arguments returns the global JavaScript :code:`WeakSet` class.

.. function:: js.WebAssembly

   Calling with no arguments returns the global JavaScript :code:`WebAssembly` class.

Web-specific Interop
--------------------

web.confirm?
web.self
web.window
web.document
web.navigator
web.fetch
web.fetch-json

Node-specific Interop
---------------------

node.exit
node.exit-macro
node.require
node.global
