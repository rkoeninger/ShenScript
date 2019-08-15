.. include:: directives.rst

Shen Interop
============

The environment object, $, comes with additional functions to make JS functions callable from Shen, setting global symbols, declaring types and macros, etc.

.. Important:: Some of these will return a promise if the environment was built in async mode.

.. function:: parse(syntax)

   Parses Shen syntax using the :shen:`read-from-string` function from the Shen kernel.

   :param string syntax: Shen syntax in string form.
   :returns:             A Shen list of syntax forms. Wrapped in a Promise if in async mode.

.. function:: caller(name)

   Returns a handle to a function in the Shen environment which automatically performs trampoline settling.

   :param string name: Function name.
   :returns:           A function to call Shen function by given name. Returned function will be async if in async mode.

.. function:: valueOf(name)

   Returns the value of the global symbol with the given name.

   :param string name: Name of global symbol.
   :returns:           Global symbol's value.
   :throws:            Error if symbol is not bound.

.. function:: show(value)

   Builds Shen-specific string representation of :js:`value`.

   :param any value: Value to show.
   :returns:         String representation of :js:`value`.

.. function:: equate(x, y)

   Determines if :js:`x` and :js:`y` are equal using Shen-specific semantics.

   :param any x: Any Shen or JavaScript value.
   :param any y: Any Shen or JavaScript value.
   :returns      A JavaScript boolean.

define
defineTyped
defmacro
symbol
inline
pre

.. function:: load(path)

   Invokes the Shen :shen:`load` function which will read the file at the given path and evaluates its contents.

   :param string path: Local file system path relative to :shen:`shen.*home-directory*`
   :returns:           The :shen:`loaded` symbol.

evalShen
evalJs
evalKl
exec
execShen

.. function:: cons(x, y)

   Creates a new :js:`Cons` cell with the given :js:`head` and :js:`tail` values.

   :param any x: Any Shen or JavaScript value.
   :param any y: Any Shen or JavaScript value.
   :returns      A new :js:`Cons`.

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

Functions in the `js.ast` namespace are used to construct, emit and evaluate arbitrary JavaScript code. All of the AST builder functions return JavaScript objects conforming to the informal ESTree standard `ESTree <https://github.com/estree/estree>`_.

.. function:: js.ast.literal

   Constructs literal value syntax.

   :param Value: JavaScript value that can be a literal (number, string, boolean, null).
   :returns:     A :code:`Literal` AST node.

.. function:: js.ast.array

   Constructs array literal syntax.

   :param list Values: A Shen list of values to initialise a JavaScript array with.
   :returns:           An :code:`ArrayExpression` AST node.

.. function:: js.ast.id

   Constructs an identifier - the name of a function or variable. Identifier is named exactly as the given argument.

   :param string Name: Name of identifier.
   :returns:           An :code:`Identifier` AST node.

.. function:: js.ast.safe-id

   Constructs an identifier where the name is escaped to make it valid in JavaScript and to not collide with reserved names in ShenScript.

   :param string Name: Name of identifier.
   :returns:           An :code:`Identifier` AST node.

.. function:: js.ast.const

   Constructs :js:`const` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: js.ast.let

   Constructs :js:`let` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: js.ast.var

   Constructs :js:`var` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: js.ast.arguments

   Constructs a reference to the :js:`arguments` object.

   :returns: An :code:`Identifier` AST node.

.. function:: js.ast.debugger

   Constructs a :js:`debugger;` statement.

   :returns: A :code:`DebuggerStatement` AST node.

.. function:: js.ast.new-target

   Constructs a reference to the :js:`new.target` meta-property.

   :returns: A :code:`MetaProperty` AST node.

.. function:: js.ast.this

   Constructs a reference to the :js:`this` keyword.

   :returns: A :code:`ThisExpression` AST node.

.. function:: js.ast.unary

   Construts a unary operator application like :js:`!x` or :js:`-x`.

   :param string Operator: Name of operator to apply.
   :param ast Argument:    Argument to apply operator to.
   :returns:               A :code:`UnaryExpression` AST Node.

.. function:: js.ast.binary

   Constructs a binary operator application like :js:`x && y` or :js:`x + y`.

   :param string Operator: Name of operator to apply.
   :param ast Left:        Expression on the left side.
   :param ast Right:       Expression on the right side.
   :returns:               A :code:`BinaryExpression` AST Node.

.. function:: js.ast.ternary

   Constructs an application of the ternary operator - :js:`x ? y : z`.

   :param ast Condition:  True/false expression on the left of the :js:`?`.
   :param ast Consequent: Expression that gets evaluated if the condition is true.
   :param ast Alternate:  Expression that gets evaluated if the condition is false.
   :returns:              A :code:`ConditionalExpression` AST Node.

.. function:: js.ast.assign

   Constructs an assignment expression like :js:`x = y`.

   :param ast Target: The variable to assign to.
   :param ast Value:  The value to assign.
   :returns:          An :code:`AssignmentExpression` AST Node.

.. function:: js.ast.update

   Constructs an assignment expression with a specific operator like :js:`x += y`.

   :param string Operator: The update operator without the :code:`=`, so :code:`+`, :code:`-`, etc.
   :param ast Target:      The variable to assign to.
   :param ast Value:       The value to assign.
   :returns:               An :code:`AssignmentExpression` AST Node.

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

AST Evaluation Functions
------------------------

.. function:: js.ast.eval

   Takes a JavaScript AST as built by the :code:`js.ast` functions, renders it to JavaScript and evaluates it in the current environment.

   :param Code: JavaScript AST.
   :returns:    Whatever the code the AST represents evaluates to.

.. function:: js.ast.inline

   Syntax pre-processor that evaluates Shen code provided as an argument and then inlines the resuling JavaScript AST in the surround rendered JavaScript at that location.

   :param Code: Code that will build a JavaScript AST.

Unchecked Math Operators
------------------------

.. function:: js.unchecked.+

   Applies the JavaScript :code:`+` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`+` does based on JavaScript-specific behavior.

.. function:: js.unchecked.-

   Applies the JavaScript :code:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`-` does based on JavaScript-specific behavior.

.. function:: js.unchecked.*

   Applies the JavaScript :code:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`*` does based on JavaScript-specific behavior.

.. function:: js.unchecked./

   Applies the JavaScript :code:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`/` does based on JavaScript-specific behavior.

.. function:: js.unchecked.**

   Applies the JavaScript :code:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`**` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.not

   Applies the JavaScript :code:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :returns: Whatever :code:`!` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.and

   Applies the JavaScript :code:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`&` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.or

   Applies the JavaScript :code:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`|` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.xor

   Applies the JavaScript :code:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Whatever.
   :param Y: Whatever.
   :returns: Whatever :code:`^` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.left-shift

   Applies the JavaScript :code:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Value to shift.
   :param Y: Amount to shift by.
   :returns: Whatever :code:`<<` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift

   Applies the JavaScript :code:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Value to shift.
   :param Y: Amount to shift by.
   :returns: Whatever :code:`>>` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift-unsigned

   Applies the JavaScript :code:`>>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param X: Value to shift.
   :param Y: Amount to shift by.
   :returns: Whatever :code:`>>>` does based on JavaScript-specific behavior.

Typed Operators
---------------

.. function:: js.% : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`%` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.** : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`**` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.not : number --> number

   Checks argument is a number and then applies the JavaScript :code:`~` operator.

   :param number X: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.and : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`&` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.or : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`|` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.xor : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`^` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.left-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`<<` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.bitwise.right-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.bitwise.right-shift-unsigned : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :code:`>>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

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

.. function:: js.typeof

   Applies the JavaScript :js:`typeof` operator to a value.

   :param X: Anything.
   :returns: A string identifying the basic type of the value: object, number, string, symbol, undefined.

.. function:: js.void

   Applies the JavaScript :js:`void` operator to argument, which will always return :js:`undefined`.

   :param X: Anything.
   :returns: :js:`undefined`.

Global Classes, Values and Functions
------------------------------------

Functions to retrieve common JavaScript globals. All take zero arguments and return what they're called. They Shen global symbols name with additional earmuffs (:shen:`js.*Array*`) where the value is actually held.

.. Hint:: Some of these are not available in all JavaScript environments. You can check if a symbol is defined with :shen:`(bound? js.*Array*)`.

.. function:: js.Array

   Returns the global JavaScript :code:`Array` class.

.. function:: js.ArrayBuffer

   Returns the global JavaScript :code:`ArrayBuffer` class.

.. function:: js.AsyncFunction

   Returns the global JavaScript :code:`AsyncFunction` class.

.. function:: js.Atomics

   Returns the global JavaScript :code:`Atomics` class. This is not available in Firefox.

.. function:: js.Boolean

   Returns the global JavaScript :code:`Boolean` class.

.. function:: js.console

   Returns the global JavaScript :code:`console` object.

.. function:: js.DataView

   Returns the global JavaScript :code:`DataView` class.

.. function:: js.Date

   Returns the global JavaScript :code:`Date` class.

.. function:: js.Function

   Returns the global JavaScript :code:`Function` class.

.. function:: js.GeneratorFunction

   Returns the global JavaScript :code:`GeneratorFunction` class.

.. function:: js.globalThis

   Returns the global JavaScript :code:`globalThis` object. If :code:`globalThis` is not defined in this JavaScript environment, then :code:`window`, :code:`global`, etc is used as appropriate.

.. function:: js.Infinity

   Returns the JavaScript :code:`Infinity` value.

.. function:: js.JSON

   Returns the global JavaScript :code:`JSON` object.

.. function:: js.Map

   Returns the global JavaScript :code:`Map` class.

.. function:: js.NaN

   Returns the JavaScript :code:`NaN` value.

.. function:: js.Number

   Returns the global JavaScript :code:`Number` class.

.. function:: js.null

   Returns the JavaScript :code:`null` value.

.. function:: js.Object

   Returns the global JavaScript :code:`Object` class.

.. function:: js.Promise

   Returns the global JavaScript :code:`Promise` class.

.. function:: js.Proxy

   Returns the global JavaScript :code:`Proxy` class.

.. function:: js.Reflect

   Returns the global JavaScript :code:`Reflect` class.

.. function:: js.RegExp

   Returns the global JavaScript :code:`RegExp` class.

.. function:: js.Set

   Returns the global JavaScript :code:`Set` class.

.. function:: js.SharedArrayBuffer

   Returns the global JavaScript :code:`SharedArrayBuffer` class. This is not available in Firefox.

.. function:: js.String

   Returns the global JavaScript :code:`String` class.

.. function:: js.Symbol

   Returns the global JavaScript :code:`Symbol` class.

.. function:: js.undefined

   Returns the JavaScript :code:`undefined` value.

.. function:: js.WeakMap

   Returns the global JavaScript :code:`WeakMap` class.

.. function:: js.WeakSet

   Returns the global JavaScript :code:`WeakSet` class.

.. function:: js.WebAssembly

   Returns the global JavaScript :code:`WebAssembly` class.

Web-specific Interop
--------------------

Only available when running in a browser or browser-based environment like Electron.

.. function:: web.confirm?

   Shows a synchronous web confirm pop-up with the given message. Returns Shen :shen:`true` or :shen:`false` depending on whether the user hit "OK" or "Cancel".

   :param string message: Message to show on the pop-up.

.. function:: web.document

   Returns the global :js:`document`.

.. function:: web.fetch

   Does an HTTP GET on the given url and returns the result as a string. Only available when ShenScript is in async mode.

   :param string url: URL to GET from.

.. function:: web.fetch-json

   Same as web.fetch, but parses received value as JSON.

   :param string url: URL to GET from.
   :returns:          A JSON object.

.. function:: web.navigator

   Returns the global :js:`navigator`.

.. function:: web.self

   Returns the value of the :js:`self` keyword.

.. function:: web.window

   Returns the global :js:`window`.

Node-specific Interop
---------------------

Only available when running in a Node environment.

.. function:: node.exit

   Takes an exit code and terminates the runtime with the process returning that exit code.

   :param number Code: Exit code for the process to return.
   :returns:           Doesn't.

.. function:: node.exit-macro

   Macro to convert :shen:`node.exit` called with no arguments by inserting :shen:`0` as the default exit code.

.. function:: node.global

   Called with no arguments, returns the value of the Node :js:`global` object.

.. function:: node.require

   Calls Node's :js:`require` function with the given module identifier.

   :param string Module: Name or path to a Node module.
   :returns:             :js:`exports` object returned by the module.
