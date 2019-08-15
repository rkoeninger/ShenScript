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

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`+` does.

.. function:: js.unchecked.-

   Applies the JavaScript :code:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`-` does.

.. function:: js.unchecked.*

   Applies the JavaScript :code:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`*` does.

.. function:: js.unchecked./

   Applies the JavaScript :code:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`/` does.

.. function:: js.unchecked.**

   Applies the JavaScript :code:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`**` does.

.. function:: js.unchecked.bitwise.not

   Applies the JavaScript :code:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`!` does.

.. function:: js.unchecked.bitwise.and

   Applies the JavaScript :code:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`&` does.

.. function:: js.unchecked.bitwise.or

   Applies the JavaScript :code:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`|` does.

.. function:: js.unchecked.bitwise.xor

   Applies the JavaScript :code:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`^` does.

.. function:: js.unchecked.bitwise.left-shift

   Applies the JavaScript :code:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`<<` does.

.. function:: js.unchecked.bitwise.right-shift

   Applies the JavaScript :code:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`>>` does.

.. function:: js.unchecked.bitwise.right-shift-unsigned

   Applies the JavaScript :code:`>>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Any value.
   :param Y: Any value.
   :returns: Whatever :code:`>>>` does.

Typed Operators
---------------

.. function:: js.% : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`%` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.** : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`**` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.not : number --> number

   Checks argument is a number and then applies the JavaScript :code:`~` operator.

   :param X: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.and : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`&` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.or : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`|` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.xor : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`^` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.left-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`<<` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.right-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

.. function:: js.bitwise.right-shift-unsigned : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>>` operator.

   :param X: A Shen number.
   :param Y: A Shen number.
   :returns: A Shen number.

Object Construction, Member Access
----------------------------------

Remember that properties on JavaScript object are named with strings, so using Shen strings for property names is recommended for these functions. For example, the JavaScript code :code:`x.y` would get written like :code:`(js.get X "y")`.

Idle symbols can be used for property names, but they will represented with interned JavaScript symbols.

.. function:: js.new

   Creates new instance of class by calling given constructor on argument list.

   :param Class: Constructor to call.
   :param Args:  Constructor arguments in a Shen list.
   :returns:     New instance of :code:`Class`.

.. function:: js.obj

   Creates new :code:`Object` with properties of given names and values.

   :param Values: Shen list of property names and values, every other like :code:`["name1" Val1 "name2" Val2]`.
   :returns:      New :code:`Object`.

.. function:: js.obj-macro

   Macro that converts syntax like :code:`({ A B C D })` to :code:`(js.obj [A B C D])`.

.. function:: js.set

   Assigns property on a JavaScript object.

   :param Object:   Object to write to.
   :param Property: Property name to set.
   :param Value:    Value to assign.
   :returns:        :code:`Value`, just like the JavaScript assignment operator.

.. function:: js.get

   Retrieves a property's value from a JavaScript object.

   :param Object:   Object to read from.
   :param Property: Property name to get.
   :returns:        Property value.

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

js.Array
js.ArrayBuffer
js.AsyncFunction
js.Boolean
js.console
js.DataView
js.Date
js.Function
js.GeneratorFunction
js.globalThis - refers to globalThis if defined or (window in web or global on node)
js.Infinity
js.JSON
js.Map
js.Math
js.NaN
js.Number
js.null
js.Object
js.Promise
js.Proxy
js.Reflect
js.RegExp
js.Set
js.String
js.Symbol
js.undefined
js.WeakMap
js.WeakSet
js.WebAssembly

Platform-specific Global Classes
--------------------------------

.. Hint:: You can check if a symbol is defined with :shen:`(bound? Symbol)`.

These are not available in Firefox.

.. function:: js.Atomics

   Calling with no arguments returns the global JavaScript :code:`Atomics` class.

.. function:: js.SharedArrayBuffer

   Calling with no arguments returns the global JavaScript :code:`Atomics` class.

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
