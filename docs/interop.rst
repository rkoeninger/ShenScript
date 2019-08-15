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

.. function:: js.unchecked.+(x, y)

   Applies the JavaScript :code:`+` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.-(x, y)

   Applies the JavaScript :code:`-` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.*(x, y)

   Applies the JavaScript :code:`*` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked./(x, y)

   Applies the JavaScript :code:`/` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.**(x, y)

   Applies the JavaScript :code:`**` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.not(x)

   Applies the JavaScript :code:`!` operator to :code:`x` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.and(x, y)

   Applies the JavaScript :code:`&` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.or(x, y)

   Applies the JavaScript :code:`|` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.xor(x, y)

   Applies the JavaScript :code:`^` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.left-shift(x, y)

   Applies the JavaScript :code:`<<` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.right-shift(x, y)

   Applies the JavaScript :code:`>>` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

.. function:: js.unchecked.bitwise.right-shift-unsigned(x, y)

   Applies the JavaScript :code:`>>>` operator to :code:`x` and :code:`y` without additional typechecks, perserving JavaScript coercion behavior.

Typed Operators
---------------

.. function:: js.%(x, y) : number --> number --> number

   Checks :code:`x` and :code:`y` are numbers and then applies the JavaScript :code:`%` operator. Always returns a number.

.. function:: js.**(x, y) : number --> number --> number

   Checks :code:`x` and :code:`y` are numbers and then applies the JavaScript :code:`**` operator. Always returns a number.

js.bitwise.not                  : number --> number
js.bitwise.and                  : number --> number --> number
js.bitwise.or                   : number --> number --> number
js.bitwise.xor                  : number --> number --> number
js.bitwise.left-shift           : number --> number --> number
js.bitwise.right-shift          : number --> number --> number
js.bitwise.right-shift-unsigned : number --> number --> number

Object Construction, Member Access
----------------------------------

js.new
js.new-obj
js.new-obj-macro
js.set
js.get
js.get-macro

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

js.Atomics - not available in Firefox
js.SharedArrayBuffer - not available in Firefox

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
