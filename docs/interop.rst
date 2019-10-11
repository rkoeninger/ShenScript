.. include:: directives.rst

Interop from JavaScript to Shen
===============================

The environment object, :js:`$`, comes with additional functions to make JavaScript functions callable from Shen, setting global symbols, declaring types and macros, etc.

Exported Functions
------------------

.. Important:: Some of these will return a promise if the environment was built in async mode. Recommended practice would be to await any calls made on the environment object.

.. function:: assign(name, value)

   Assigns a value to a global symbol, creating that global symbol if necessary.

   :param string name:  Global symbol name.
   :param any    value: The value to assign.
   :returns:            The assigned value.

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

.. function:: inline(name, dataType, paramTypes, f)

   Registers a new inline rule for JavaScript code generation. When the KLambda-to-JavaScript transpilier encounters a form starting with a symbol named :js:`name`, it will build child forms and then pass the rendered ASTs into :js:`f`. Whatever :js:`f` returns gets inserted into the greater JavaScript AST at the relative point where the form was encountered.

   Example:

   .. code-block:: js

      // Renders a `(not X)` call with the JavaScript `!` operator
      // and inserts type conversions only as needed
      inline('not', 'JsBool', ['JsBool'], x => Unary('!', x));

   :param string name:       Name of symbol that triggers this rule to be applied.
   :param string dataType:   The type of the whole expression, or :js:`null` if it is unknown.
   :param array  paramTypes: The types of argument expressions, each can be :js:`null` if they are unknown.
   :param function f:        Function that handles the JavaScript AST transformation for this rule.
   :returns:                 :js:`f`.

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

Raw Operators
-------------

Functions starting with :shen:`js.raw` allow access to underlying JavaScript operators without any additional typechecks or conversions. Operations are inlined when fully applied but can still be partially applied or passed as arguments like any other function.

.. function:: (js.raw.== X Y)

   Applies the JavaScript :js:`==` operator to arguments without additional typechecks or conversions.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.raw.=== X Y)

   Applies the JavaScript :js:`===` operator to arguments without additional typechecks or conversions.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.raw.!= X Y)

   Applies the JavaScript :js:`!=` operator to arguments without additional typechecks or conversions.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.raw.!== X Y)

   Applies the JavaScript :js:`!==` operator to arguments without additional typechecks or conversions.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: (js.raw.and X Y)

   Applies the JavaScript :js:`&&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   Operator is inlined when fully applied.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&&` does based on JavaScript-specific behavior.

.. function:: (js.raw.or X Y)

   Applies the JavaScript :js:`||` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   Operator is inlined when fully applied.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`||` does based on JavaScript-specific behavior.

.. function:: (js.raw.not X)

   Performs JavaScript boolean inversion.

   :param any X: Value to invert.
   :returns:     A JavaScript boolean.

.. function:: (js.raw.+ X Y)

   Applies the JavaScript :js:`+` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`+` does based on JavaScript-specific behavior.

.. function:: (js.raw.- X Y)

   Applies the JavaScript :js:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`-` does based on JavaScript-specific behavior.

.. function:: (js.raw.* X Y)

   Applies the JavaScript :js:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`*` does based on JavaScript-specific behavior.

.. function:: (js.raw./ X Y)

   Applies the JavaScript :js:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`/` does based on JavaScript-specific behavior.

.. function:: (js.raw.** X Y)

   Applies the JavaScript :js:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`**` does based on JavaScript-specific behavior.

.. function:: (js.raw.< X Y)

   Applies the JavaScript :js:`<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`<` does based on JavaScript-specific behavior.

.. function:: (js.raw.> X Y)

   Applies the JavaScript :js:`>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`>` does based on JavaScript-specific behavior.

.. function:: (js.raw.<= X Y)

   Applies the JavaScript :js:`<=` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`<=` does based on JavaScript-specific behavior.

.. function:: (js.raw.>= X Y)

   Applies the JavaScript :js:`>=` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`>=` does based on JavaScript-specific behavior.

.. function:: (js.raw.bitwise.not X)

   Applies the JavaScript :js:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :returns:     Whatever :js:`!` does based on JavaScript-specific behavior.

.. function:: (js.raw.bitwise.and X Y)

   Applies the JavaScript :js:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&` does based on JavaScript-specific behavior.

.. function:: (js.raw.bitwise.or X Y)

   Applies the JavaScript :js:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`|` does based on JavaScript-specific behavior.

.. function:: (js.raw.bitwise.xor X Y)

   Applies the JavaScript :js:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`^` does based on JavaScript-specific behavior.

.. function:: (js.raw.<< X Y)

   Applies the JavaScript :js:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`<<` does based on JavaScript-specific behavior.

.. function:: (js.raw.>> X Y)

   Applies the JavaScript :js:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`>>` does based on JavaScript-specific behavior.

.. function:: (js.raw.>>> X Y)

   Applies the JavaScript :js:`>>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`>>>` does based on JavaScript-specific behavior.

.. function:: (js.raw.delete Object Key)

   Removes a key from an object.

   :param object Object: Object to remove key from.
   :param any Key:       String or symbol name of key to remove.
   :returns:             JavaScript :js:`true` if the delete was successful.

.. function:: (js.raw.eval Code)

   .. warning::

      Using :js:`eval` is even more dangerous than usual in ShenScript because it will be difficult to know what indentifiers will be in scope and how their names might have been aliased when code is evaluated.

   .. note::

      With :shen:`js.raw.eval`, the call does get inlined when fully applied, which might help a bit with the scoping issues.

      So, for instance, :shen:`(let X 2 (js.raw.eval "1 + X"))` would successfully evaluate to :shen:`3` with :shen:`js.raw.eval` where it would fail with :shen:`js.eval`.

   Calls the built-in JavaScript :js:`eval` function.

   :param string Code: JavaScript code in string form.
   :returns:           The result of evaluating the code.

.. function:: (js.raw.in Key Object)

   Determines if value is a key in an object.

   :param any Key:       String or symbol name of a property.
   :param object Object: Object that might contain a property by that key.
   :returns:             A JavaScript boolean.

.. function:: (js.raw.instanceof X Class)

   Determines if value is the product of a constructor, class or anything higher up its prototype chain.

   :param any X:       The value to inspect.
   :param class Class: A class or constructor function.
   :returns:           A JavaScript boolean.

.. function:: (js.raw.typeof X)

   Applies the JavaScript :js:`typeof` operator to a value.

   :param any X: Anything.
   :returns:     A string identifying the basic type of the value: object, number, string, symbol, undefined, boolean.

.. function:: (js.raw.void X)

   Applies the JavaScript :js:`void` operator to argument, which will always return :js:`undefined`.

   :param any X: Anything.
   :returns:     :js:`undefined`.

Typed Operators
---------------

.. function:: js.== : A --> B --> boolean

   Applies the JavaScript :js:`==` operator to arguments without additional typechecks, and converts result to a Shen boolean.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A Shen boolean.

.. function:: js.=== : A --> B --> boolean

   Applies the JavaScript :js:`===` operator to arguments without additional typechecks, and converts result to a Shen boolean.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A Shen boolean.

.. function:: js.!= : A --> B --> boolean

   Applies the JavaScript :js:`!=` operator to arguments without additional typechecks, and converts result to a Shen boolean.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A Shen boolean.

.. function:: js.!== : A --> B --> boolean

   Applies the JavaScript :js:`!==` operator to arguments without additional typechecks, and converts result to a Shen boolean.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A Shen boolean.

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

.. function:: js.<< : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`<<` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.>> : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

.. function:: js.>>> : number --> number --> number

   Checks arguments are numbers and then applies the JavaScript :js:`>>>` operator.

   :param number X: Value to shift.
   :param number Y: Amount to shift by.
   :returns:        A Shen number.

Typed Standard Functions
------------------------

.. function:: js.clear : js.timeout --> unit

   Cancels or discontinues a task scheduled by :shen:`js.delay` or :shen:`js.repeat`.

   :param js.timeout Timeout: A timeout handle returned by :shen:`js.delay` or :shen:`js.repeat`.

.. function:: js.decode-uri : string --> string

   Decodes a URI by un-escaping special characters.

   :param string Uri: URI to decode.
   :returns:          Decoded URI.

.. function:: js.decode-uri-component : string --> string

   Decodes a URI component by un-escaping special characters.

   :param string Uri: URI component to decode.
   :returns:          Decoded URI.

.. function:: js.delay : number --> (lazy A) --> js.timeout

   Calls standard JavaScript :js:`setTimeout` function, but with arguments reversed.

   :param number Duration:       Time in milliseconds to delay running continuation.
   :param function Continuation: Function to run. Expected to take 0 arguments.
   :returns:                     A timeout handle.

.. function:: js.encode-uri : string --> string

   Encodes a URI by escaping special characters.

   :param string Uri: URI to encode.
   :returns:          Encoded URI.

.. function:: js.encode-uri-component : string --> string

   Encodes a URI component by escaping special characters.

   :param string Uri: URI component to encode.
   :returns:          Encoded URI.

.. function:: js.eval : string --> A

   .. warning::

      Using :js:`eval` is even more dangerous than usual in ShenScript because it will be difficult to know what indentifiers will be in scope and how their names might have been aliased when code is evaluated.

   .. note::

      Unlike :shen:`js.raw.eval`, the never gets inlined, so the code gets evaluated in another scope.

      So, for instance, :shen:`(let X 2 (js.eval "1 + X"))` would fail with :code:`X is not defined` where with :shen:`js.raw.eval`, it would work.

   Calls the built-in JavaScript :js:`eval` function, asserting argument is a string.

   :param string Code: JavaScript code in string form.
   :returns:           The result of evaluating the code.

.. function:: js.log : A --> unit

   Logs given value using :js:`console.log`.

   :param any X: Value to log
   :returns:     Empty list.

.. function:: js.parse-float : string --> number

   Parses a floating-point number.

   :param string String: Numeric string to parse.
   :returns:             Parsed number.
   :throws:              If string does not represent a valid number.

.. function:: js.parse-int : string --> number

   Parses an integral number with radix specified to be 10 to avoid unusual parsing behavior.

   :param string String: Numeric string to parse.
   :returns:             Parsed number.
   :throws:              If string does not represent a valid number.

.. function:: js.parse-int-with-radix : string --> number --> number

   Parses an integral number with the given radix.

   :param string String: Numeric string to parse.
   :param number Radix:  Radix to parse the number with, an integer 2 or greater.
   :returns:             Parsed number.
   :throws:              If string does not represent a valid number or invalid radix is passed.

.. function:: js.repeat : number --> (lazy A) --> js.timeout

   Calls standard JavaScript :js:`setInterval` function, but with arguments reversed.

   :param number Duration:       Time in milliseconds to between calls of continuation.
   :param function Continuation: Function to run. Expected to take 0 arguments.
   :returns:                     A timeout handle.

.. function:: js.sleep : number --> unit

   Simulates a blocking :code:`Thread.sleep` by awaiting a promise resolved with :js:`setTimeout`.

   Returns a promise so only works neatly in async mode.

   :param number Duration: Time in milliseconds to sleep.

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

Recognisor Functions
--------------------

.. function:: js.array? : A --> boolean

   Determines if value is a JavaScript array.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.async? : A --> boolean

   Determines if value is an asynchronous function.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.boolean? : A --> boolean

   Determines if value is a JavaScript boolean.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.defined? : A --> boolean

   Determines if value is *not* :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.false? : A --> boolean

   Determines if value is the JavaScript :js:`false` value.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.falsy? : A --> boolean

   Determines if value is coercible to :js:`false` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.finite? : A --> boolean

   Determines if value is a finite number.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.function? : A --> boolean

   Determines if value is a function. This test will also work for Shen functions.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.generator? : A --> boolean

   Determines if value is a generator function.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.infinite? : A --> boolean

   Determines if value is positive or negative infinity.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.+infinity? : A --> boolean

   Determines if value is positive infinity.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.-infinity? : A --> boolean

   Determines if value is negative infinity.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.integer? : A --> boolean

   Determines if value is an integer.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.+integer? : A --> boolean

   Determines if value is a positive integer.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.-integer? : A --> boolean

   Determines if value is a negative integer.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.nan? : A --> boolean

   Determines if value is :js:`NaN` (not-a-number) which will normally not be equal to itself according to the :js:`===` operator.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.null? : A --> boolean

   Determines if value is :js:`null`.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.object? : A --> boolean

   Determines if value is an object with the direct protoype :js:`Object` which means it is probably the product of object literal syntax.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.symbol? : A --> boolean

   Determines if a value is a JavaScript symbol. Shen symbols are represented with JS symbols, so this test will pass for idle symbols as well.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.true? : A --> boolean

   Determines if value is the JavaScript :js:`true` value.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.truthy? : A --> boolean

   Determines if value is coercible to :js:`true` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

.. function:: js.undefined? : A --> boolean

   Determines if value is :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A Shen boolean.

Global Classes, Objects and Values
----------------------------------

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

.. function:: (web.atob String)

   Converts a string to a base64-encoded string.

   :param string String: Any string.

.. function:: (web.btoa Base64)

   Converts a base64-encoded string to a string.

   :param string String: Any base64 string.

.. function:: (web.confirm? Message)

   Shows a synchronous web confirm pop-up with the given message. Returns Shen :shen:`true` or :shen:`false` depending on whether the user hit "OK" or "Cancel".

   :param string Message: Message to show on the pop-up.

.. function:: (web.document)

   Returns the global :js:`document`.

.. function:: (web.fetch-json Url)

   Same as :shen:`web.fetch-text`, but parses received value as JSON.

   :param string Url: URL to GET from.
   :returns:          A JSON object wrapped in a :js:`Promise`.

.. function:: (web.fetch-json* Url)

   Same as :shen:`web.fetch-text*`, but parses received values as JSON.

   :param list Urls: A Shen list of URLs to GET from.
   :returns:         A Shen list of JSON objects wrapped in :js:`Promise`s.

.. function:: (web.fetch-text Url)

   Does an HTTP GET on the given url and returns the result as a string. Only available when ShenScript is in async mode.

   :param string Url: URL to GET from.
   :returns:          A string wrapped in a :js:`Promise`.

.. function:: (web.fetch-text* Urls)

   Does concurrent HTTP GETs on the given URLs and returns the results as a list of strings. Only available when ShenScript is in async mode.

   :param list Urls: A Shen list of URLs to GET from.
   :returns:         A Shen list of strings wrapped in :js:`Promise`s.

.. function:: (web.navigator)

   Returns the global :js:`navigator`.

.. function:: (web.self)

   Returns the value of the :js:`self` keyword.

.. function:: (web.window)

   Returns the global :js:`window`.

DOM-specific Interop
~~~~~~~~~~~~~~~~~~~~

Functions for building elements and interacting with the DOM.

.. function:: (dom.append Parent Child)

   Adds :shen:`Child` as the last child node of :shen:`Parent`.

   :param node Parent: DOM Node to append :shen:`Child` to.
   :param node Child:  DOM Node to append to :shen:`Parent`.
   :returns:           Empty list.

.. function:: (dom.build Tree)

   Builds a DOM Node out of a Shen list tree. Each node in the tree is represented by a list starting with a key symbol. That symbol is the name of the HTML element to be built (e.g. :shen:`div`, :shen:`span`), with a couple of exceptions:

   If the key symbol starts with a :shen:`@` or :shen:`!`, it is interpreted as an attribute (e.g. :shen:`@id`, :shen:`@class`) or an event listener (e.g. :shen:`!click`, :shen:`!mouseover`), respectively. The 2nd element in that list should be the attribute value or the event handler function. An event handler function should take a single argument, the event object.

   String children get built into text nodes.

   Child elements, text nodes, attributes and event handlers are all appended or set on enclosing parents in respective order.

   .. code:: shen

      [div [@id "example"]
           [p "Click Me!"
              [!click (/. _ (js.log "hi!"))]]]

   gets built to:

   .. code:: html

      <div id="example">
        <p onclick="console.log('hi!')">Click Me!</p>
      </div>

   :param any Tree: Tree of Shen lists.
   :returns:        DOM Node built from :shen:`Tree`.

.. function:: (dom.onready F)

   Calls the function :shen:`F` when the DOM is loaded and ready. Callback takes zero arguments (is a :shen:`freeze`). Value returned by callback is ignored.

   :param function F: Function that performs operations requiring the DOM.
   :returns:          Empty list.

.. function:: (dom.prepend Parent Child)

   Adds :shen:`Child` as the first child node of :shen:`Parent`.

   :param node Parent: DOM Node to prepend :shen:`Child` to.
   :param node Child:  DOM Node to prepend to :shen:`Parent`.
   :returns:           Empty list.

.. function:: (dom.query Selector)

   Finds an element matching the given CSS selector in the :js:`document`.

   :param string Selector: CSS selector to match with.
   :returns:               Returns matching node or empty list if not found.

.. function:: (dom.query* Selector)

   Finds all elements matching the given CSS selector in the :js:`document`.

   :param string Selector: CSS selector to match with.
   :returns:               A Shen list of matching elements.

.. function:: (dom.remove Node)

   Removes :shen:`Node` from its parent. Does nothing if :shen:`Node` has no parent.

   :param node Node: DOM Node to remove.
   :returns:         Empty list.

.. function:: (dom.replace Target Child)

   Removes :shen:`Target` from its parent and appends :shen:`Child` in its place. Does nothing if :shen:`Target` has no parent.

   :param node Target: DOM Node to replace with :shen:`Child`.
   :param node Child:  DOM Node to replace :shen:`Target` with.
   :returns:           Empty list.

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
