.. include:: directives.rst

Accessing ShenScript Internals from JavaScript
==============================================

.. note:: Some of these functions and classes are exported, but they are primarily referred to internally. They are exported so generated JavaScript code will have access to them. Or, in rare cases, they are exported in case your Shen code needs to work around something.

Data
----

.. warning:: These objects are not meant to be tampered with by user or client code. Tinker with them if you must, but it will void the warranty.

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

Functions in the :shen:`shen-script` namespace are for directly accessing ShenScript internals.

Functions
---------

These functions are callable from Shen to give access to the implementation details of ShenScript.

.. function:: (shen-script.lookup-function Name)

   Allows lookup of global function by name instead of building wrapper lambdas or the like.

   :param symbol Name: Name of function to lookup.
   :returns:           Shen function by that name, or :shen:`[]` when function does not exist.

.. function:: (shen-script.$)

   Provides access to the ShenScript environment object, which when combined with :code:`js` interop functions, allows arbitrary manipulation of the port's implementation details from Shen.

   :returns: ShenScript environment object.

.. function:: (shen-script.boolean.js->shen X)

   Converts a JavaScript boolean to a Shen boolean. Any truthy value counts as JavaScript :js:`true` and any falsy value counts as JavaScript :js:`false`.

   :param any X: Accepts any value as an argument.
   :returns:     A Shen boolean.

.. function:: (shen-script.boolean.shen->js X)

   Converts a Shen boolean to a JavaScript boolean.

   :param boolean X: A Shen boolean.
   :returns:         A JavaScript boolean.
   :throws:          Error if argument is not a Shen boolean.

AST Construction Functions
--------------------------

Functions in the `js.ast` namespace are used to construct, emit and evaluate arbitrary JavaScript code. All of the AST builder functions return JavaScript objects conforming to the informal ESTree standard `ESTree <https://github.com/estree/estree>`_.

.. function:: (js.ast.literal Value)

   Constructs literal value syntax.

   :param Value: JavaScript value that can be a literal (number, string, boolean, null).
   :returns:     A :code:`Literal` AST node.

.. function:: (js.ast.array Values)

   Constructs array literal syntax.

   Example: :js:`[x, y, z]`.

   :param list Values: A Shen list of value AST's to initialise a JavaScript array with.
   :returns:           An :code:`ArrayExpression` AST node.

.. function:: (js.ast.id Name)

   Constructs an identifier - the name of a function or variable. Identifier is named exactly as the given argument.

   Example: :js:`x`

   :param string Name: Name of identifier.
   :returns:           An :code:`Identifier` AST node.

.. function:: (js.ast.safe-id Name)

   Constructs an identifier where the name is escaped to make it valid in JavaScript and to not collide with reserved names in ShenScript.

   :param string Name: Name of identifier.
   :returns:           An :code:`Identifier` AST node.

.. function:: (js.ast.const Id Value)

   Constructs :js:`const` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: (js.ast.let Id Value)

   Constructs :js:`let` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: (js.ast.var Id Value)

   Constructs :js:`var` variable declaration.

   :param ast Id:    Variable name.
   :param ast Value: Value to initialise variable with.
   :returns:         A :code:`VariableDeclaration` AST node.

.. function:: (js.ast.arguments)

   Constructs a reference to the :js:`arguments` object.

   :returns: An :code:`Identifier` AST node.

.. function:: (js.ast.debugger)

   Constructs a :js:`debugger;` statement.

   :returns: A :code:`DebuggerStatement` AST node.

.. function:: (js.ast.new-target)

   Constructs a reference to the :js:`new.target` meta-property.

   :returns: A :code:`MetaProperty` AST node.

.. function:: (js.ast.this)

   Constructs a reference to the :js:`this` keyword.

   :returns: A :code:`ThisExpression` AST node.

.. function:: (js.ast.unary Operator Argument)

   Construts a unary operator application.

   Examples: :js:`!x`, :js:`-x`

   :param string Operator: Name of operator to apply.
   :param ast Argument:    Argument to apply operator to.
   :returns:               A :code:`UnaryExpression` AST Node.

.. function:: (js.ast.binary Operator Left Right)

   Constructs a binary operator application.

   Examples: :js:`x && y`, :js:`x + y`

   :param string Operator: Name of operator to apply.
   :param ast Left:        Expression on the left side.
   :param ast Right:       Expression on the right side.
   :returns:               A :code:`BinaryExpression` AST Node.

.. function:: (js.ast.ternary Condition Consequent Alternate)

   Constructs an application of the ternary operator. 

   Example :js:`x ? y : z`

   :param ast Condition:  True/false expression on the left of the :js:`?`.
   :param ast Consequent: Expression that gets evaluated if the condition is true.
   :param ast Alternate:  Expression that gets evaluated if the condition is false.
   :returns:              A :code:`ConditionalExpression` AST Node.

.. function:: (js.ast.assign Target Value)

   Constructs an assignment expression.

   Example :js:`x = y`

   :param ast Target: The variable to assign to.
   :param ast Value:  The value to assign.
   :returns:          An :code:`AssignmentExpression` AST Node.

.. function:: (js.ast.update Operator Target Value)

   Constructs an assignment expression with a specific operator.

   Examples :js:`x += y`, :js:`x *= y`

   :param string Operator: The update operator without the :code:`=`, so :code:`+`, :code:`-`, etc.
   :param ast Target:      The variable to assign to.
   :param ast Value:       The value to assign.
   :returns:               An :code:`AssignmentExpression` AST Node.

.. function:: (js.ast.call Function Args)

   Constructs a function call expression.

   Example: :js:`f(x, y)`

   :param ast Function: An expression AST that evaluates to a function.
   :param list Args:    A Shen list of argument AST's.
   :returns:            A :code:`CallExpression` AST Node.

.. function:: (js.ast.spread Argument)

   Constructs spread operator/pattern syntax.

   Example: :js:`...x`

   :param ast Argument: Identifier or pattern that are gathered or spread.
   :returns:            A :code:`SpreadElement` AST Node.

.. function:: (js.ast.super Arguments)

   Constructs a call to the super (prototype) constructor.

   Example: :js:`super(x, y);`

   :param list Arguments: A Shen list of argument AST's.
   :returns:              A :code:`Super` AST Node.

.. function:: (js.ast.block Statements)

   Constructs a block that groups statements into a single statement and provides isolated scope for :js:`const` and :js:`let` bindings.

   Example: :js:`{ x; y; z; }`

   :param list Statements: A Shen list of statement AST's.
   :returns:               A :code:`BlockStatement` AST Node.

.. function:: (js.ast.empty)

   Constructs an empty statement.

   Example: :js:`;`

   :returns: An :code:`EmptyStatement` AST Node.

.. function:: (js.ast.sequence Expressions)

   Constructs a compound expression using the comma operator.

   Example: :js:`(x, y, z)`

   :param list Expressions: A Shen list of expression AST's.
   :returns:                A :code:`SequenceExpresssion` AST Node.

.. function:: (js.ast.member Object Member)

   Constructs a member access expression with the dot operator.

   Examples: :js:`x.y`, :js:`x[y]`

   :param ast Object: Expression AST to access member of.
   :param ast Member: Expression that computes member name to access. If non-string, will automatically be wrapped in square brackets.
   :returns:          A :code:`MemberExpression` AST Node.

.. function:: (js.ast.object Properties)

   Constructs object literal syntax.

   Example: :js:`{ a: b, c: d }`

   :param list Properties: A Shen list of name-value pairs, each of which is a Shen list of length 2.
   :returns:               An :code:`ObjectExpression` AST Node.

.. function:: (js.ast.class Name SuperClass Slots)

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

.. function:: (js.ast.slot Kind Name Body)

   Constructs a class property of the given kind.

   :param string Kind: "constructor", "method", "get" or "set".
   :param ast Name:    Identifier naming the property.
   :param ast Body:    Expression representing the function or value assigned to the property.
   :returns:           A :code:`MethodDefinition` AST Node.

.. function:: (js.ast.constructor Body)

   Specialisation of :shen:`js.ast.slot` for class constructors.

   Example: :js:`constructor(...) { ... }`

.. function:: (js.ast.method Name Body)

   Specialisation of :shen:`js.ast.slot` for class methods.

   Example: :js:`method(...) { ... }`

.. function:: (js.ast.getter Name Body)

   Specialisation of :shen:`js.ast.slot` for class getters.

   Example: :js:`get thing(...) { ... }`

.. function:: (js.ast.setter Name Body)

   Specialisation of :shen:`js.ast.slot` for class setters.

   Example: :js:`set thing(...) { ... }`

.. function:: (js.ast.arrow Parameters Body)

   Constructs a lambda expression.

   Example: :js:`x => ...`

   :param list Parameters: A Shen list of parameter identifiers.
   :param ast Body:        A body expression.
   :returns:               A :code:`ArrowFunctionExpression` AST Node.

.. function:: (js.ast.function Name Parameters Body)

   Constructs a function expression.

   Example: :js:`function name(x, y) { ... }`

   :param ast Name:        Optional identifier naming the function.
   :param list Parameters: A Shen list of parameter expression.
   :param ast Body:        A block of statements that make of the body of the function.
   :returns:               A :code:`FunctionExpression` AST Node.

.. function:: (js.ast.function* Name Parameters Body)

   Constructs a generator function expression.

   Example: :js:`function* name(x, y) { ... }`

   :param ast Name:        Optional identifier naming the function.
   :param list Parameters: A Shen list of parameter expression.
   :param ast Body:        A block of statements that make of the body of the function.
   :returns:               A :code:`FunctionExpression` AST Node.

.. function:: (js.ast.return Argument)

   Constructs a return statement.

   Example: :js:`return x;`

   :param ast Argument: Expression to return.
   :returns:            A :code:`ReturnStatement` AST Node.

.. function:: (js.ast.yield Argument)

   Constructs a yield expression for use in a generator function.

   Example: :js:`yield x`

   :param ast Argument: Expression to yield.
   :returns:            A :code:`YieldExpression` AST Node.

.. function:: (js.ast.yield* Argument)

   Constructs a yield delegate expression for use in a generator function.

   Example: :js:`yield* x`

   :param ast Argument: Iterable or generator expression to yield.
   :returns:            A :code:`YieldExpression` AST Node.

.. function:: (js.ast.await Argument)

   Constructs an await expression for use in an async function.

   Example: :js:`await x`

   :param ast Argument: Expression to await.
   :returns:            An :code:`AwaitExpression` AST Node.

.. function:: (js.ast.async Ast)

   Makes function or class member async.

   Examples: :js:`async (x, y) => ...`, :js:`async function(x, y) { ... }`, :js:`async method(x, y) { ... }`

   :param ast Ast: Ast to make async.
   :returns:       The same AST after setting the :js:`async` property to :js:`true`.

.. function:: (js.ast.static Ast)

   Makes class member static.

   Example: :js:`static method(x, y) { ... }`

   :param ast Ast: Ast to make static.
   :returns:       The same AST after setting the :js:`static` property to :js:`true`.

.. function:: (js.ast.if Condition Consequent Alternate)

   Constructs an if statement with optional else clause.

   Examples:

   .. code-block:: js

      if (condition) {
        ...
      } else {
        ...
      }

   .. code-block:: js

     if (condition) {
       ...
     }

   :param ast Condition:  Conditional expression that determines which clause to step into.
   :param ast Consequent: The then clause.
   :param ast Alternate:  Optional else clause.
   :returns:              An :code:`IfStatement` AST Node.

.. function:: (js.ast.try Body Handler)

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

.. function:: (js.ast.catch Parameter Body)

   Constructs a catch clause.

   Example: :js:`catch (e) { ... }`

   :param ast Parameter: An identifer for the error that was caught.
   :param ast Body:      A block of statements that get run when the preceeding try has failed.
   :returns:             A :code:`CatchClause` AST Node.

.. function:: (js.ast.while Test Body)

   Constructs a while loop.

   Example: :js:`while (condition) { ... }`

   :param ast Test: Conditional expression that determines if the loop will run again or for the first time.
   :param ast Body: Block of statements to run each time the loop repeats.
   :returns:        A :code:`WhileStatement` AST Node.

.. function:: (js.ast.for Init Test Update Body)

   Constructs a for loop.

   Example: :js:`for (let x = 0; x < i; ++x) { ... }`

   :param ast Init:   Declarations and initial statements. This can be a sequence expression.
   :param ast Test:   Conditional expression that determines if the loop will run again or for the first time.
   :param ast Update: Update expressions to evaluate at the end of each iteration. This can be a sequence expression.
   :param ast Body:   Block of statements to run each time the loop repeats.
   :returns:          A :code:`ForStatement` AST Node.

.. function:: (js.ast.for-in Left Right Body)

   Constructs a for-in loop.

   Example: :js:`for (let x in xs) { ... }`

   :param ast Left:  Declaration of local variable that each key from the object on the right side gets assigned to.
   :param ast Right: Expression that evaluates to some object.
   :param ast Body:  Block of statements to run each time the loop repeats.
   :returns:         A :code:`ForInStatement` AST Node.

.. function:: (js.ast.for-of Left Right Body)

   Constructs a for-of loop.

   Example: :js:`for (let x of xs) { ... }`

   :param ast Left:  Declaration of local variable that each value from the iterable on the right side gets assigned to.
   :param ast Right: Expression that evaluates to an iterable value.
   :param ast Body:  Block of statements to run each time the loop repeats.
   :returns:         A :code:`ForOfStatement` AST Node.

.. function:: (js.ast.statement Expression)

   Constructs a wrapper that allows an expression to be a statement.

   :param ast Expression: The expression in question.
   :returns:              An :code:`ExpressionStatement` AST Node.

AST Evaluation Functions
------------------------

.. function:: (js.ast.compile Expr)

   Builds a JavaScript AST from given KLambda expression.

   :param expr Ast: KLambda expression.
   :returns:        JavaScript AST.

.. function:: (js.ast.eval Ast)

   Takes a JavaScript AST as built by the :code:`js.ast` functions, renders it to JavaScript and evaluates it in the current environment.

   :param ast Ast: JavaScript AST.
   :returns:       Whatever the code the AST represents evaluates to.

.. function:: (js.ast.inline Ast)

   Syntax pre-processor that evaluates Shen code provided as an argument and then inlines the resuling JavaScript AST in the surround rendered JavaScript at that location.

   :param Ast: Code that will build a JavaScript AST.
