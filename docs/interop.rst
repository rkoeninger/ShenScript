.. include:: directives.rst

Interop from JavaScript to Shen
===============================

The environment object, :js:`$`, comes with additional functions to make JavaScript functions callable from Shen, setting global symbols, declaring types and macros, etc.

Exported Functions
------------------

.. Important:: Some of these will return a promise if the environment was built in async mode.

.. function:: caller(name)

   Returns a handle to a function in the Shen environment which automatically performs trampoline settling.

   :param string name: Function name.
   :returns:           A function to call Shen function by given name. Returned function will be async if in async mode.

.. function:: cons(x, y)

   Creates a new :js:`Cons` cell with the given :js:`head` and :js:`tail` values.

   :param any x: Any Shen or JavaScript value.
   :param any y: Any Shen or JavaScript value.
   :returns:     A new :js:`Cons`.

.. function:: define(name, f)

   Defines a new global function in the Shen environment by the given name. Function gets wrapped so it automatically handles partial application.

   :param string name: Name which function will be accessible by, including package prefix(es).
   :param function f:  JavaScript function to defer fully-applied invocation to.
   :returns:           Name as a symbol.

.. function:: defineTyped(name, type, f)

   Defines a new global function in the Shen environment by the given name and declared Shen type signature. Function gets wrapped so it automatically handles partial application.

   :param string name: Name which function will be accessible by, including package prefix(es).
   :param any type:    Shen type signature in array tree form, gets recursively converted to Shen lists.
   :param function f:  JavaScript function to defer fully-applied invocation to.
   :returns:           Name as a symbol.

.. function:: defmacro(name, f)

   Defines a macro in the Shen environment by the given name. Syntax gets pre-processed with :js:`toArrayTree` before being passed into wrapped function. Result returned from :js:`f` gets post-processed with :js:`toListTree`. If :js:`f` returns :js:`undefined`, then it causes the macro to have no effect.

   :param string name: Name which macro function will be accessible by, including package prefix(es).
   :param function f:  JavaScript function to defer invocation to.
   :returns:           Name as a symbol.

.. function:: equate(x, y)

   Determines if :js:`x` and :js:`y` are equal using Shen-specific semantics.

   :param any x: Any Shen or JavaScript value.
   :param any y: Any Shen or JavaScript value.
   :returns:     A JavaScript boolean.

.. function:: evalJs(ast)

   Converts JavaScript AST to JavaScript syntax string and evaluates in isolated context.

   :param ast ast: JavaScript AST Node.
   :returns:       Evaluation result.

.. function:: evalKl(expr)

   Invokes the backend :js:`eval-kl` function which will evaluate the expression tree in the Shen environment.

   :param expr expr: Parsed KLambda expression tree.
   :returns:         Evaluation result.

.. function:: evalShen(expr)

   Invokes the Shen :shen:`eval` function which will evaluate the expression tree in the Shen environment.

   :param expr expr: Parsed Shen expression tree.
   :returns:         Evaluation result.

.. function:: exec(syntax)

   Parses and evaluates all Shen syntax forms passed in. Returns final evaluation result.

   :param string syntax: Shen syntax.
   :returns:             Final evaluation result.

.. function:: execEach(syntax)

   Parses and evaluates all Shen syntax forms passed in. Returns array of evaluation results.

   :param string syntax: Shen syntax.
   :returns:             Array of evaluation results.

.. function:: inline(name, f)

   Registers a new inline rule for JavaScript code generation. When the KLambda-to-JavaScript transpilier encounters a form starting with a symbol named :js:`name`, it will build child forms and then pass the rendered ASTs into :js:`f`. Whatever :js:`f` returns gets inserted into the greater JavaScript AST at the relative point where the form was encountered.

   Example:

   .. code-block:: js

      // Renders a `(not X)` call with the JavaScript `!` operator
      // and inserts type conversions only as needed
      inline('not', x => ann('JsBool', Unary('!', cast('JsBool', x))))

   :param string name: Name of symbol that triggers this rule to be applied.
   :param function f:  Function that handles the JavaScript AST transformation for this rule.
   :returns:           :js:`f`.

.. function:: load(path)

   Invokes the Shen :shen:`load` function which will read the file at the given path and evaluates its contents.

   :param string path: Local file system path relative to :shen:`shen.*home-directory*`
   :returns:           The :shen:`loaded` symbol.

.. function:: parse(syntax)

   Parses Shen syntax using the :shen:`read-from-string` function from the Shen kernel.

   :param string syntax: Shen syntax in string form.
   :returns:             A Shen list of syntax forms. Wrapped in a Promise if in async mode.
 
.. function:: pre(name, f)

   Registers a new pre-processor rule for JavaScript code generation. Similar to :js:`inline`, but child forms are not rendered and are passed into :js:`f` as KLambda expression trees. :js:`f` should then return a JavaScript AST which will get inserted into the greater JavaScript AST at the relative point where the form was encountered.

   Example:

   .. code-block:: js

      // Evaluates math expression at build time and inserts result
      // in place of JavaScript AST that would have been built
      pre('build-time-math', x => evalShen(x));

   :param string name: Name of symbol that triggers this rule to be applied.
   :param function f:  Function that handles the KLambda expression tree to JavaScript AST conversion.
   :returns:           :js:`f`.

.. function:: show(value)

   Builds Shen-specific string representation of :js:`value`.

   :param any value: Value to show.
   :returns:         String representation of :js:`value`.

.. function:: symbol(name, value)

   Declares Shen global symbol by the given name (with added earmuffs per convention), setting it to given initial value and declaring a function by the given name that accesses it.

   Example: :js:`symbol('package.thing', 0)` declares global symbol :shen:`package.*thing*`, sets it to :shen:`0` and declares function :shen:`package.thing` which takes no arguments and returns :shen:`(value package.*thing*)`.

   :param string name: Name of accessor function and basis for name of global symbol.
   :param any value:   Value to initialise global symbol with.
   :returns:           :js:`value`.

.. function:: toArray(x)

   Builds a JavaScript array from a Shen list. Elements are not transformed. :js:`x` is passed through if not a Shen list.

   :param any x: A Shen list or any other value.
   :returns:     A JavaScript array or whatever was passed in.

.. function:: toArrayTree(x)

   Recursively builds a JavaScript array tree from a Shen list tree. Non-list children are not transformed. :js:`x` is passed through if not a Shen list.

   :param any x: A tree of Shen lists or any other value.
   :returns:     A tree of JavaScript arrays or whatever was passed in.

.. function:: toList(x, [tail = null])

   Builds a Shen list from a JavaScript array. Elements are not transformed. :js:`x` is passed through if not a JavaScript array.

   Aliased as :js:`r` for brevity in generated code.

   :param any x:    A JavaScript array or any other value.
   :param any tail: Optional tail value for the final :js:`Cons` cell, instead of :js:`null`. Ignored if :js:`x` is not an array.
   :returns:        A Shen list or whatever was passed in.

.. function:: toListTree(x)

   Recursively builds a Shen list tree from a JavaScript array tree. Non-list children are not transformed. :js:`x` is passed through if not a JavaScript array.

   :param any x: A tree of nested JavaScript arrays or any other value.
   :returns:     A tree of nested Shen lists or whatever was passed in.

.. function:: valueOf(name)

   Returns the value of the global symbol with the given name.

   :param string name: Name of global symbol.
   :returns:           Global symbol's value.
   :throws:            Error if symbol is not bound.

Interop from Shen to JavaScript
===============================

ShenScript provides functions in the :code:`js` namespace to access JavaScript standard classes and functionality.

Unchecked Math Operators
------------------------

.. function:: (js.unchecked.+ X Y)

   Applies the JavaScript :js:`+` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`+` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.- X Y)

   Applies the JavaScript :js:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`-` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.* X Y)

   Applies the JavaScript :js:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`*` does based on JavaScript-specific behavior.

.. function:: (js.unchecked./ X Y)

   Applies the JavaScript :js:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`/` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.** X Y)

   Applies the JavaScript :js:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`**` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.not X)

   Applies the JavaScript :js:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :returns:     Whatever :js:`!` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.and X Y)

   Applies the JavaScript :js:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.or X Y)

   Applies the JavaScript :js:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`|` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.xor X Y)

   Applies the JavaScript :js:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`^` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.left-shift X Y)

   Applies the JavaScript :js:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`<<` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.right-shift X Y)

   Applies the JavaScript :js:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`>>` does based on JavaScript-specific behavior.

.. function:: (js.unchecked.bitwise.right-shift-unsigned X Y)

   Applies the JavaScript :js:`>>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`>>>` does based on JavaScript-specific behavior.

Typed Operators
---------------

.. function:: js.% : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`%` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.** : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`**` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.not : number --> number

   Checks argument is a number and then applies the JavaScript :js:`~` operator.

   :param number X: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.and : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`&` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.or : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`|` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.xor : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`^` operator.

   :param number X: A Shen number.
   :param number Y: A Shen number.
   :returns:        A Shen number.

.. function:: js.bitwise.left-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`<<` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.bitwise.right-shift : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.bitwise.right-shift-unsigned : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`>>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

Object Construction, Member Access
----------------------------------

Remember that properties on JavaScript object are named with strings, so using Shen strings for property names is recommended for the function below. For example, the JavaScript code :code:`x.y` would get written like :code:`(js.get X "y")`.

Idle symbols can be used for property names, but they will represented with interned JavaScript symbols.

.. function:: (js.get Object Property)

   Retrieves a property's value from a JavaScript object.

   :param object Object: Object to read from.
   :param any Property:  Property name to get.
   :returns:             Property value.

.. function:: js.get-macro

   Macro that converts variable-depth accessor syntax like :code:`(. X Y Z)` to :code:`(js.get (js.get X Y) Z)`.

.. function:: (js.new Class Args)

   Creates new instance of class by calling given constructor on argument list.

   :param constructor Class: Constructor to call.
   :param list Args:         Constructor arguments in a Shen list.
   :returns:                 New instance of :code:`Class`.

.. function:: (js.obj Values)

   Creates new :code:`Object` with properties of given names and values.

   :param list Values: A flat Shen list of property names and values, like :code:`["name1" Val1 "name2" Val2]`.
   :returns:           New :code:`Object`.

.. function:: js.obj-macro

   Macro that converts syntax like :code:`({ A B C D })` to :code:`(js.obj [A B C D])`.

.. function:: (js.set Object Property Value)

   Assigns property on a JavaScript object.

   :param object Object: Object to write to.
   :param any Property:  Property name to set.
   :param any Value:     Value to assign.
   :returns:             :code:`Value`, just like the JavaScript assignment operator.

Global Functions
----------------

.. function:: (js.== X Y)

   Applies the JavaScript :js:`==` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.=== X Y)

   Applies the JavaScript :js:`===` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.!= X Y)

   Applies the JavaScript :js:`!=` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.!== X Y)

   Applies the JavaScript :js:`!==` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.and X Y)

   Applies the JavaScript :js:`&&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&&` does based on JavaScript-specific behavior.

.. function:: (js.array? X)

   Determines if value is a JavaScript array.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.async? X)

   Determines if value is an asynchronous function.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.boolean? X)

   Determines if value is a JavaScript boolean.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.decodeURI Uri)

   Decodes a URI by un-escaping special characters.

   :param string Uri: URI to decode.
   :returns:          Decoded URI.

.. function:: (js.decodeURIComponent Uri)

   Decodes a URI component by un-escaping special characters.

   :param string Uri: URI component to decode.
   :returns:          Decoded URI.

.. function:: (js.defined? X)

   Determines if value is *not* :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.delete Object Key)

   Removes a key from an object.

   :param object Object: Object to remove key from.
   :param any Key:       String or symbol name of key to remove.
   :returns:             JavaScript :js:`true` if the delete was successful.

.. function:: (js.encodeURI Uri)

   Encodes a URI by escaping special characters.

   :param string Uri: URI to encode.
   :returns:          Encoded URI.

.. function:: (js.encodeURIComponent Uri)

   Encodes a URI component by escaping special characters.

   :param string Uri: URI component to encode.
   :returns:          Encoded URI.

.. function:: (js.eval Code)

   .. warning:: Using :js:`eval` is even more dangerous than usual in ShenScript because it will be difficult to know what indentifiers will be in scope and how their names might have been aliased when code is evaluated.

   Calls the built-in JavaScript :js:`eval` function.

   :param string Code: JavaScript code in string form.
   :returns:           The result of evaluating the code.

.. function:: (js.falsy? X)

   Determines if value is coercible to :js:`false` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.finite? X)

   Determines if value is a finite number.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.function? X)

   Determines if value is a function. This test will also work for Shen functions.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.generator? X)

   Determines if value is a generator function.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.in Key Object)

   Determines if value is a key in an object.

   :param any Key:       String or symbol name of a property.
   :param object Object: Object that might contain a property by that key.
   :returns:             A JavaScript boolean.

.. function:: (js.infinite? X)

   Determines if value is positive or negative infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.+infinity? X)

   Determines if value is positive infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.-infinity? X)

   Determines if value is negative infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.integer? X)

   Determines if value is an integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.+integer? X)

   Determines if value is a positive integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.-integer? X)

   Determines if value is a negative integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.instanceof X Class)

   Determines if value is the product of a constructor, class or anything higher up its prototype chain.

   :param any X:       The value to inspect.
   :param class Class: A class or constructor function.
   :returns:           A JavaScript boolean.

.. function:: (js.log X)

   Logs given value using :js:`console.log`.

   :param any X: Value to log
   :returns:     :js:`undefined`.

.. function:: (js.nan? X)

   Determines if value is :js:`NaN` (not-a-number) which will normally not be equal to itself according to the :js:`===` operator.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.not X)

   Performs JavaScript boolean inversion.

   :param any X: Value to invert.
   :returns:     A JavaScript boolean.

.. function:: (js.null? X)

   Determines if value is :js:`null`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.object? X)

   Determines if value is an object with the direct protoype :js:`Object` which means it is probably the product of object literal syntax.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.or X Y)

   Applies the JavaScript :js:`||` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`||` does based on JavaScript-specific behavior.

.. function:: (js.parseFloat String)

   Parses a floating-point number.

   :param string String: Numeric string to parse.
   :returns:             Parsed number.

.. function:: (js.parseInt String)

   Parses an integral number with radix specified to be 10 to avoid unusual parsing behavior.

   :param string String: Numeric string to parse.
   :returns:             Parsed number.

.. function:: (js.parseIntRadix String Radix)

   Parses an integral number with the given.

   :param string String: Numeric string to parse.
   :param number Radix:  Radix to parse the number with.
   :returns:             Parsed number.

.. function:: (js.symbol? X)

   Determines if a value is a JavaScript symbol. Shen symbols are represented with JS symbols, so this test will pass for idle symbols as well.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.truthy? X)

   Determines if value is coercible to :js:`true` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.typeof X)

   Applies the JavaScript :js:`typeof` operator to a value.

   :param any X: Anything.
   :returns: A string identifying the basic type of the value: object, number, string, symbol, undefined, boolean.

.. function:: (js.undefined? X)

   Determines if value is :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: (js.void X)

   Applies the JavaScript :js:`void` operator to argument, which will always return :js:`undefined`.

   :param any X: Anything.
   :returns: :js:`undefined`.

Parallel Functions
------------------

.. note:: These return JavaScript promises.

.. function:: parallel.filter : (A --> boolean) --> (list A) --> (list A)

   Tests each element in a list and gathers elements that pass the test in resulting list.

   :param function F: Function to test each element in the list for inclusion in the result.
   :param list Xs:    A Shen list of whatever values.
   :returns:          A list of filtered results.

.. function:: parallel.map : (A --> B) --> (list A) --> (list B)

   Maps function to elements of list in parallel and gathers results as they complete in resulting list.

   :param function F: Function to transform each element in the list.
   :param list Xs:    A Shen list of whatever values.
   :returns:          A list of transformed results.

Global Classes, Values and Functions
------------------------------------

Functions to retrieve common JavaScript globals. All take zero arguments and return what they're called. They Shen global symbols name with additional earmuffs (e.g. :shen:`js.*Array*`) where the value is actually held.

.. hint:: Some of these are not available in all JavaScript environments. You can check if a symbol is defined with :shen:`(bound? js.*Array*)`.

.. function:: (js.Array)

   Returns the global JavaScript :code:`Array` class.

.. function:: (js.ArrayBuffer)

   Returns the global JavaScript :code:`ArrayBuffer` class.

.. function:: (js.AsyncFunction)

   Returns the global JavaScript :code:`AsyncFunction` class.

.. function:: (js.Atomics)

   Returns the global JavaScript :code:`Atomics` class. This is not available in Firefox.

.. function:: (js.Boolean)

   Returns the global JavaScript :code:`Boolean` class.

.. function:: (js.console)

   Returns the global JavaScript :code:`console` object.

.. function:: (js.DataView)

   Returns the global JavaScript :code:`DataView` class.

.. function:: (js.Date)

   Returns the global JavaScript :code:`Date` class.

.. function:: (js.Function)

   Returns the global JavaScript :code:`Function` class.

.. function:: (js.GeneratorFunction)

   Returns the global JavaScript :code:`GeneratorFunction` class.

.. function:: (js.globalThis)

   Returns the global JavaScript :js:`globalThis` object. If :js:`globalThis` is not defined in this JavaScript environment, then :js:`window`, :js:`global`, etc is used as appropriate.

.. function:: (js.Infinity)

   Returns the JavaScript :code:`Infinity` value.

.. function:: (js.JSON)

   Returns the global JavaScript :code:`JSON` object.

.. function:: (js.Map)

   Returns the global JavaScript :code:`Map` class.

.. function:: (js.NaN)

   Returns the JavaScript :code:`NaN` value.

.. function:: (js.Number)

   Returns the global JavaScript :code:`Number` class.

.. function:: (js.null)

   Returns the JavaScript :code:`null` value.

.. function:: (js.Object)

   Returns the global JavaScript :code:`Object` class.

.. function:: (js.Promise)

   Returns the global JavaScript :code:`Promise` class.

.. function:: (js.Proxy)

   Returns the global JavaScript :code:`Proxy` class.

.. function:: (js.Reflect)

   Returns the global JavaScript :code:`Reflect` class.

.. function:: (js.RegExp)

   Returns the global JavaScript :code:`RegExp` class.

.. function:: (js.Set)

   Returns the global JavaScript :code:`Set` class.

.. function:: (js.SharedArrayBuffer)

   Returns the global JavaScript :code:`SharedArrayBuffer` class. This is not available in Firefox.

.. function:: (js.String)

   Returns the global JavaScript :code:`String` class.

.. function:: (js.Symbol)

   Returns the global JavaScript :code:`Symbol` class.

.. function:: (js.undefined)

   Returns the JavaScript :code:`undefined` value.

.. function:: (js.WeakMap)

   Returns the global JavaScript :code:`WeakMap` class.

.. function:: (js.WeakSet)

   Returns the global JavaScript :code:`WeakSet` class.

.. function:: (js.WebAssembly)

   Returns the global JavaScript :code:`WebAssembly` class.

Web-specific Interop
--------------------

Only available when running in a browser or browser-based environment like Electron.

.. function:: (web.confirm? Message)

   Shows a synchronous web confirm pop-up with the given message. Returns Shen :shen:`true` or :shen:`false` depending on whether the user hit "OK" or "Cancel".

   :param string Message: Message to show on the pop-up.

.. function:: (web.document)

   Returns the global :js:`document`.

.. function:: (web.fetch Url)

   Does an HTTP GET on the given url and returns the result as a string. Only available when ShenScript is in async mode.

   :param string Url: URL to GET from.
   :returns:          A string wrapped in a :js:`Promise`.

.. function:: (web.fetch-json Url)

   Same as web.fetch, but parses received value as JSON.

   :param string Url: URL to GET from.
   :returns:          A JSON object wrapped in a :js:`Promise`.

.. function:: (web.navigator)

   Returns the global :js:`navigator`.

.. function:: (web.self)

   Returns the value of the :js:`self` keyword.

.. function:: (web.window)

   Returns the global :js:`window`.

Node-specific Interop
---------------------

Only available when running in a Node environment.

.. function:: (node.exit Code)

   Takes an exit code and terminates the runtime with the process returning that exit code.

   :param number Code: Exit code for the process to return.
   :returns:           Doesn't.

.. function:: node.exit-macro

   Macro to convert :shen:`node.exit` called with no arguments by inserting :shen:`0` as the default exit code.

.. function:: (node.global)

   Called with no arguments, returns the value of the Node :js:`global` object.

.. function:: (node.require Id)

   Calls Node's :js:`require` function with the given module identifier.

   :param string Id: Name or path to a Node module.
   :returns:         :js:`exports` object returned by the module.
