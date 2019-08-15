.. include:: directives.rst

Shen Interop
============

The environment object, :js:`$`, comes with additional functions to make JavaScript functions callable from Shen, setting global symbols, declaring types and macros, etc.

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
   :returns:     A JavaScript boolean.

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

   Defines a macro in the Shen environment by the given name. Syntax gets pre-processed with :js:`valueToArrayTree` before being passed into wrapped function. Result returned from :js:`f` gets post-processed with :js:`valueFromArrayTree`. If :js:`f` returns :js:`undefined`, then it causes the macro to have no effect.

   :param string name: Name which macro function will be accessible by, including package prefix(es).
   :param function f:  JavaScript function to defer invocation to.
   :returns:           Name as a symbol.

.. function:: symbol(name, value)

   Declares Shen global symbol by the given name (with added earmuffs per convention), setting it to given initial value and declaring a function by the given name that accesses it.

   Example: :js:`symbol('package.thing', 0)` declares global symbol :shen:`package.*thing*`, sets it to :shen:`0` and declares function :shen:`package.thing` which takes no arguments and returns :shen:`(value package.*thing*)`.

   :param string name: Name of accessor function and basis for name of global symbol.
   :param any value:   Value to initialise global symbol with.
   :returns:           :js:`value`.

.. function:: inline(name, f)

   Registers a new inline rule for JavaScript code generation. When the KLambda-to-JavaScript transpilier encounters a form starting with a symbol named :js:`name`, it will build child forms and then pass the rendered ASTs into :js:`f`. Whatever :js:`f` returns gets inserted into the greater JavaScript AST at the relative point where the form was encountered.

   Example:

   .. code-block:: js

      // Renders a `(not X)` call with the JavaScript `!` operator and inserts type conversions only as needed
      inline('not', x => ann('JsBool', Unary('!', cast('JsBool', x))))

   :param string name: Name of symbol that triggers this rule to be applied.
   :param function f:  Function that handles the JavaScript AST transformation for this rule.
   :returns:           :js:`f`.
 
.. function:: pre(name, f)

   Registers a new pre-processor rule for JavaScript code generation. Similar to :js:`inline`, but child forms are not rendered and are passed into :js:`f` as KLambda expression trees. :js:`f` should then return a JavaScript AST which will get inserted into the greater JavaScript AST at the relative point where the form was encountered.

   Example:

   .. code-block:: js

      // Evaluates math expression at build time and inserts result in place of JavaScript AST that would have been built.
      pre('build-time-math', x => evalShen(x));

   :param string name: Name of symbol that triggers this rule to be applied.
   :param function f:  Function that handles the KLambda expression tree to JavaScript AST conversion.
   :returns:           :js:`f`.

.. function:: load(path)

   Invokes the Shen :shen:`load` function which will read the file at the given path and evaluates its contents.

   :param string path: Local file system path relative to :shen:`shen.*home-directory*`
   :returns:           The :shen:`loaded` symbol.

.. function:: evalShen(expr)

   Invokes the Shen :shen:`eval` function which will evaluate the expression tree in the Shen environment.

   :param expr expr: Parsed Shen expression tree.
   :returns:         Evaluation result.

.. function:: evalJs(ast)

   Converts JavaScript AST to JavaScript syntax string and evaluates in isolated context.

   :param ast ast: JavaScript AST Node.
   :returns:       Evaluation result.

.. function:: evalKl(expr)

   Invokes the backend :js:`eval-kl` function which will evaluate the expression tree in the Shen environment.

   :param expr expr: Parsed KLambda expression tree.
   :returns:         Evaluation result.

.. function:: exec(syntax)

   Parses and evaluates all Shen syntax forms passed in. Returns final evaluation result.

   :param string syntax: Shen syntax.
   :returns:             Final evaluation result.

.. function:: execEach(syntax)

   Parses and evaluates all Shen syntax forms passed in. Returns array of evaluation results.

   :param string syntax: Shen syntax.
   :returns:             Array of evaluation results.

.. function:: cons(x, y)

   Creates a new :js:`Cons` cell with the given :js:`head` and :js:`tail` values.

   :param any x: Any Shen or JavaScript value.
   :param any y: Any Shen or JavaScript value.
   :returns      A new :js:`Cons`.

.. function:: consFromArray(x)

   Builds a Shen list from a JavaScript array. Nested elements are not converted, just copied as they are.

   Aliased as :js:`r` for brevity in generated code.

   :param array x: A JavaScript array.
   :returns:       A Shen list.

.. function:: consToArray(x)

   Builds a JavaScript array from a Shen list. Nested elements are not converted, just copied as they are.

   :param array x: A Shen list.
   :returns:       A JavaScript array.

.. function:: consFromArrayTree(x)

   Works like :js:`consFromArray` but recursively transforms child arrays to lists.

.. function:: consToArrayTree(x)

   Works like :js:`consToArray` but recursively transforms child lists to arrays.

.. function:: valueFromArray(x)

   .. note:: This function might not be needed if :js:`consFromArray` already covers what it does.

.. function:: valueFromArrayTree(x)

   .. note:: This function might not be needed if :js:`consFromArrayTree` already covers what it does.

.. function:: valueToArray(x)

   .. note:: This function might not be needed if :js:`consToArray` already covers what it does.

.. function:: valueToArrayTree(x)

   .. note:: This function might not be needed if :js:`consToArrayTree` already covers what it does.

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

   Example: :js:`[x, y, z]`.

   :param list Values: A Shen list of value AST's to initialise a JavaScript array with.
   :returns:           An :code:`ArrayExpression` AST node.

.. function:: js.ast.id

   Constructs an identifier - the name of a function or variable. Identifier is named exactly as the given argument.

   Example: :js:`x`

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

   Construts a unary operator application.

   Examples: :js:`!x`, :js:`-x`

   :param string Operator: Name of operator to apply.
   :param ast Argument:    Argument to apply operator to.
   :returns:               A :code:`UnaryExpression` AST Node.

.. function:: js.ast.binary

   Constructs a binary operator application.

   Examples: :js:`x && y`, :js:`x + y`

   :param string Operator: Name of operator to apply.
   :param ast Left:        Expression on the left side.
   :param ast Right:       Expression on the right side.
   :returns:               A :code:`BinaryExpression` AST Node.

.. function:: js.ast.ternary

   Constructs an application of the ternary operator. 

   Example :js:`x ? y : z`

   :param ast Condition:  True/false expression on the left of the :js:`?`.
   :param ast Consequent: Expression that gets evaluated if the condition is true.
   :param ast Alternate:  Expression that gets evaluated if the condition is false.
   :returns:              A :code:`ConditionalExpression` AST Node.

.. function:: js.ast.assign

   Constructs an assignment expression.

   Example :js:`x = y`

   :param ast Target: The variable to assign to.
   :param ast Value:  The value to assign.
   :returns:          An :code:`AssignmentExpression` AST Node.

.. function:: js.ast.update

   Constructs an assignment expression with a specific operator.

   Examples :js:`x += y`, :js:`x *= y`

   :param string Operator: The update operator without the :code:`=`, so :code:`+`, :code:`-`, etc.
   :param ast Target:      The variable to assign to.
   :param ast Value:       The value to assign.
   :returns:               An :code:`AssignmentExpression` AST Node.

.. function:: js.ast.call

   Constructs a function call expression.

   Example: :js:`f(x, y)`

   :param ast Function: An expression AST that evaluates to a function.
   :param list Args:    A Shen list of argument AST's.
   :returns:            A :code:`CallExpression` AST Node.

.. function:: js.ast.spread

   Constructs spread operator/pattern syntax.

   Example: :js:`...x`

   :param ast Argument: 
   :returns:            A :code:`SpreadElement` AST Node.

.. function:: js.ast.super

   Constructs a call to the super (prototype) constructor.

   Example: :js:`super(x, y);`

   :param list Arguments: A Shen list of argument AST's.
   :returns:              A :code:`Super` AST Node.

.. function:: js.ast.block

   Constructs a block that groups statements into a single statement and provides isolated scope for :js:`const` and :js:`let` bindings.

   Example: :js:`{ x; y; z; }`

   :param list Statements: A Shen list of statement AST's.
   :returns:               A :code:`BlockStatement` AST Node.

.. function:: js.ast.empty

   Constructs an empty statement.

   Example: :js:`;`

   :returns: An :code:`EmptyStatement` AST Node.

.. function:: js.ast.sequence

   Constructs a compound expression using the comma operator.

   Example: :js:`(x, y, z)`

   :param list Expressions: A Shen list of expression AST's.
   :returns:                A :code:`SequenceExpresssion` AST Node.

.. function:: js.ast.member

   Constructs a member access expression with the dot operator.

   Examples: :js:`x.y`, :js:`x[y]`

   :param ast Object: Expression AST to access member of.
   :param ast Member: Expression that computes member name to access. If non-string, will automatically be wrapped in square brackets.
   :returns:          A :code:`MemberExpression` AST Node.

.. function:: js.ast.object

   Constructs object literal syntax.

   Example: :js:`{ a: b, c: d }`

   :param list Properties: A Shen list of name-value pairs, each of which is a Shen list of length 2.
   :returns:               An :code:`ObjectExpression` AST Node.

.. function:: js.ast.class

   Constructs ES6 class syntax. Members are constructed using :shen:`js.ast.constructor`, :shen:`js.ast.method`, :shen:`js.ast.getter`, :shen:`js.ast.setter` or the more general function :shen:`js.ast.slot`.

   Example:

   .. code-block:: js

      class Class extends SuperClass {
        constructor(...) {
          ...
        }
        method(...) {
          ...
        }
      }

   :param ast Name:       Identifier naming the class.
   :param ast SuperClass: Identifier node of super class, can be undefined or null.
   :param list Slots:     A Shen list of slot AST's.
   :returns:              A :code:`ClassExpression` AST Node.

.. function:: js.ast.slot

   Constructs a class property of the given kind.

   :param string Kind: "constructor", "method", "get" or "set".
   :param ast Name:    Identifier naming the property.
   :param ast Value:   Expression representing the function or value assigned to the property.
   :returns:           A :code:`MethodDefinition` AST Node.

.. function:: js.ast.constructor

   Specialisation of :shen:`js.ast.slot` for class constructors.

   Example: :js:`constructor(...) { ... }`

.. function:: js.ast.method

   Specialisation of :shen:`js.ast.slot` for class methods.

   Example: :js:`method(...) { ... }`

.. function:: js.ast.getter

   Specialisation of :shen:`js.ast.slot` for class getters.

   Example: :js:`get thing(...) { ... }`

.. function:: js.ast.setter

   Specialisation of :shen:`js.ast.slot` for class setters.

   Example: :js:`set thing(...) { ... }`

.. function:: js.ast.arrow

   Constructs a lambda expression.

   Example: :js:`x => ...`

   :param list Parameters: A Shen list of parameter identifiers.
   :param ast Body:        A body expression.
   :returns:               A :code:`ArrowFunctionExpression` AST Node.

.. function:: js.ast.function

   Constructs a function expression.

   Example: :js:`function name(x, y) { ... }`

   :param ast Name:        Optional identifier naming the function.
   :param list Parameters: A Shen list of parameter expression.
   :param ast Body:        A block of statements that make of the body of the function.
   :returns:               A :code:`FunctionExpression` AST Node.

.. function:: js.ast.function*

   Constructs a generator function expression.

   Example: :js:`function* name(x, y) { ... }`

   :param ast Name:        Optional identifier naming the function.
   :param list Parameters: A Shen list of parameter expression.
   :param ast Body:        A block of statements that make of the body of the function.
   :returns:               A :code:`FunctionExpression` AST Node.

.. function:: js.ast.return

   Constructs a return statement.

   Example: :js:`return x;`

   :param ast Argument: Expression to return.
   :returns:            A :code:`ReturnStatement` AST Node.

.. function:: js.ast.yield

   Constructs a yield expression for use in a generator function.

   Example: :js:`yield x`

   :param ast Argument: Expression to yield.
   :returns:            A :code:`YieldExpression` AST Node.

.. function:: js.ast.yield*

   Constructs a yield delegate expression for use in a generator function.

   Example: :js:`yield* x`

   :param ast Argument: Iterable or generator expression to yield.
   :returns:            A :code:`YieldExpression` AST Node.

.. function:: js.ast.await

   Constructs an await expression for use in an async function.

   Example: :js:`await x`

   :param ast Argument: Expression to await.
   :returns:            An :code:`AwaitExpression` AST Node.

.. function:: js.ast.async

   Makes function or class member async.

   Examples: :js:`async () => ...`, :js:`async function(...) { ... }`, :js:`async method(...) { ... }`

   :param ast Ast: Ast to make async.
   :returns:       The same AST after setting the :js:`async` property to :js:`true`.

.. function:: js.ast.static

   Makes class member static.

   Example: :js:`static method(...) { ... }`

   :param ast Ast: Ast to make static.
   :returns:       The same AST after setting the :js:`static` property to :js:`true`.

.. function:: js.ast.if

   Constructs an if statement with optional else clause.

   Examples:

   .. code-block:: js

      if (...) {
        ...
      } else {
        ...
      }

   .. code-block:: js

     if (...) {
       ...
     }

   :param ast Condition:  Conditional expression that determines which clause to step into.
   :param ast Consequent: The then clause.
   :param ast Alternate:  Optional else clause.
   :returns:              An :code:`IfStatement` AST Node.

.. function:: js.ast.try

   Constructs a try statement.

   Example:

   .. code-block:: js

      try {
        ...
      } catch (e) {
        ...
      }

   :param ast Body:    A block of statements that get tried.
   :param ast Handler: A catch clause as constructed by :js:`js.ast.catch`.
   :returns:           A :code:`TryStatement` AST Node.

.. function:: js.ast.catch

   Constructs a catch clause.

   Example: :js:`catch (e) { ... }`

   :param ast Parameter: An identifer for the error that was caught.
   :param ast Body:      A block of statements that get run when the preceeding try has failed.
   :returns:             A :code:`CatchClause` AST Node.

.. function:: js.ast.while

   Constructs a while loop.

   Example: :js:`while (...) { ... }`

   :param ast Condition: Conditional expression that determines if the loop will run again or for the first time.
   :param ast Body:      Block of statements to run each time the loop repeats.
   :returns:             A :code:`WhileStatement` AST Node.

.. function:: js.ast.for

   Constructs a for loop.

   Example: :js:`for (let x = 0; x < i; ++x) { ... }`

   :param ast Init:   Declarations and initial statements. This can be a sequence expression.
   :param ast Test:   Conditional expression that determines if the loop will run again or for the first time.
   :param ast Update: Update expressions to evaluate at the end of each iteration. This can be a sequence expression.
   :param ast Body:   Block of statements to run each time the loop repeats.
   :returns:          A :code:`ForStatement` AST Node.

.. function:: js.ast.for-in

   Constructs a for-in loop.

   Example: :js:`for (let x in xs) { ... }`

   :param ast Left:  Declaration of local variable that each key from the object on the right side gets assigned to.
   :param ast Right: Expression that evaluates to some object.
   :param ast Body:  Block of statements to run each time the loop repeats.
   :returns:         A :code:`ForInStatement` AST Node.

.. function:: js.ast.for-of

   Constructs a for-of loop.

   Example: :js:`for (let x of xs) { ... }`

   :param ast Left:  Declaration of local variable that each value from the iterable on the right side gets assigned to.
   :param ast Right: Expression that evaluates to an iterable value.
   :param ast Body:  Block of statements to run each time the loop repeats.
   :returns:         A :code:`ForOfStatement` AST Node.

.. function:: js.ast.statement

   Constructs a wrapper that allows an expression to be a statement.

   :param ast Expression: The expression in question.
   :returns:              An :code:`ExpressionStatement` AST Node.

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

   Applies the JavaScript :js:`+` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`+` does based on JavaScript-specific behavior.

.. function:: js.unchecked.-

   Applies the JavaScript :js:`-` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`-` does based on JavaScript-specific behavior.

.. function:: js.unchecked.*

   Applies the JavaScript :js:`*` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`*` does based on JavaScript-specific behavior.

.. function:: js.unchecked./

   Applies the JavaScript :js:`/` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`/` does based on JavaScript-specific behavior.

.. function:: js.unchecked.**

   Applies the JavaScript :js:`**` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`**` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.not

   Applies the JavaScript :js:`!` operator to argument without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :returns:     Whatever :js:`!` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.and

   Applies the JavaScript :js:`&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.or

   Applies the JavaScript :js:`|` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`|` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.xor

   Applies the JavaScript :js:`^` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`^` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.left-shift

   Applies the JavaScript :js:`<<` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`<<` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift

   Applies the JavaScript :js:`>>` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Value to shift.
   :param any Y: Amount to shift by.
   :returns:     Whatever :js:`>>` does based on JavaScript-specific behavior.

.. function:: js.unchecked.bitwise.right-shift-unsigned

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

.. function:: js.log

   Logs given value using :js:`console.log`.

   :param any X: Value to log
   :returns:     :js:`undefined`.

.. function:: js.decodeURI

   Decodes a URI by un-escaping special characters.

   :param string Uri: URI to decode.
   :returns:          Decoded URI.

.. function:: js.decodeURIComponent

   Decodes a URI component by un-escaping special characters.

   :param string Uri: URI component to decode.
   :returns:          Decoded URI.

.. function:: js.encodeURI

   Encodes a URI by escaping special characters.

   :param string Uri: URI to encode.
   :returns:          Encoded URI.

.. function:: js.encodeURIComponent

   Encodes a URI component by escaping special characters.

   :param string Uri: URI component to encode.
   :returns:          Encoded URI.

.. function:: js.parseFloat

   Parses a floating-point number.

   :param string X: Numeric string to parse.
   :returns:        Parsed number.

.. function:: js.parseInt

   Parses an integral number with radix specified to be 10 to avoid unusual parsing behavior.

   :param string X: Numeric string to parse.
   :returns:        Parsed number.

.. function:: js.parseIntRadix

   Parses an integral number with the given.

   :param string X:     Numeric string to parse.
   :param number Radix: Radix to parse the number with.
   :returns:            Parsed number.

.. function:: js.==

   Applies the JavaScript :js:`==` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: js.===

   Applies the JavaScript :js:`===` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: js.!=

   Applies the JavaScript :js:`!=` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: js.!==

   Applies the JavaScript :js:`!==` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     A JavaScript boolean.

.. function:: js.not

   Performs JavaScript boolean inversion.

   :param any X: Value to invert.
   :returns:     A JavaScript boolean.

.. function:: js.and

   Applies the JavaScript :js:`&&` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`&&` does based on JavaScript-specific behavior.

.. function:: js.or

   Applies the JavaScript :js:`||` operator to arguments without additional typechecks, perserving JavaScript coercion behavior.

   :param any X: Whatever.
   :param any Y: Whatever.
   :returns:     Whatever :js:`||` does based on JavaScript-specific behavior.

.. function:: js.defined?

   Determines if value is *not* :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.undefined?

   Determines if value is :js:`undefined`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.truthy?

   Determines if value is coercible to :js:`true` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.falsy?

   Determines if value is coercible to :js:`false` by JavaScript standards.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.array?

   Determines if value is a JavaScript array.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.async?

   Determines if value is an asynchronous function.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.boolean?

   Determines if value is a JavaScript boolean.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.finite?

   Determines if value is a finite number.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.generator?

   Determines if value is a generator function.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.infinite?

   Determines if value is positive or negative infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.+infinity?

   Determines if value is positive infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.-infinity?

   Determines if value is negative infinity.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.integer?

   Determines if value is an integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.+integer?

   Determines if value is a positive integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.-integer?

   Determines if value is a negative integer.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.function?

   Determines if value is a function. This test will also work for Shen functions.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.null?

   Determines if value is :js:`null`.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.nan?

   Determines if value is :js:`NaN` (not-a-number) which will normally not be equal to itself according to the :js:`===` operator.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.object?

   Determines if value is an object with the direct protoype :js:`Object` which means it is probably the product of object literal syntax.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.symbol?

   Determines if a value is a JavaScript symbol. Shen symbols are represented with JS symbols, so this test will pass for idle symbols as well.

   :param any X: Value to inspect.
   :returns:     A JavaScript boolean.

.. function:: js.delete

   Removes a key from an object.

   :param object Object: Object to remove key from.
   :param any Key:       String or symbol name of key to remove.
   :returns:             JavaScript :js:`true` if the delete was successful.

.. function:: js.eval

   .. Warning:: Using :js:`eval` is even more dangerous than usual in ShenScript because it will be difficult to know what indentifiers will be in scope and how their names might have been aliased when code is evaluated.

   Calls the built-in JavaScript :js:`eval` function.

   :param string Code: JavaScript code in string form.
   :returns:           The result of evaluating the code.

.. function:: js.in

   Determines if value is a key in an object.

   :param any Key:       String or symbol name of a property.
   :param object Object: Object that might contain a property by that key.
   :returns:             A JavaScript boolean.

.. function:: js.instanceof

   Determines if value is the product of a constructor, class or anything higher up its prototype chain.

   :param any X:       The value to inspect.
   :param class Class: A class or constructor function.
   :returns:           A JavaScript boolean.

.. function:: js.typeof

   Applies the JavaScript :js:`typeof` operator to a value.

   :param any X: Anything.
   :returns: A string identifying the basic type of the value: object, number, string, symbol, undefined.

.. function:: js.void

   Applies the JavaScript :js:`void` operator to argument, which will always return :js:`undefined`.

   :param any X: Anything.
   :returns: :js:`undefined`.

Global Classes, Values and Functions
------------------------------------

Functions to retrieve common JavaScript globals. All take zero arguments and return what they're called. They Shen global symbols name with additional earmuffs (e.g. :shen:`js.*Array*`) where the value is actually held.

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
