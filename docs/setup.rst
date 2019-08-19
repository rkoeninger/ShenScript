Building an Environment
=======================

The top-level module, :js:`shen`, exports a single function. That function takes an optional :js:`options` object and returns a ShenScript environment.

   .. code-block:: json

      {
        "async": boolean // Required.
        "clock":
      }

The Kernel Sandwich
===================

.. danger:: need to document backend

..

  /**
   * Shen environment creation function.
   * @param {Object}    [options = {}] - Environment config and overrides.
   * @param {boolean}   [options.async = false] - Enable generation of async/promise-chaining code.
   * @param {function}  [options.clock = Date.now] - Provides current time in fractional seconds from the Unix epoch.
   * @param {string}    [options.homeDirectory = '/'] - Working directory in file system.
   * @param {string}    [options.implementation = 'Unknown'] - JavaScript platform in use.
   * @param {class}     options.InStream - Class used for input streams.
   * @param {class}     options.OutStream - Class used for output streams.
   * @param {function}  [options.isInStream = false] - Returns true if argument is an InStream.
   * @param {function}  [options.isOutStream = false] - Returns true if argument is an OutStream.
   * @param {function}  [options.openRead = raise] - Opens an InStream for the given file path.
   * @param {function}  [options.openWrite = raise] - Opens an OutStream for the given file path.
   * @param {string}    [options.os = 'Unknown'] - Name of current operating system.
   * @param {string}    [options.port = 'Unknown'] - The version of ShenScript.
   * @param {string}    [options.porters = 'Unknown'] - The author of ShenScript.
   * @param {string}    [options.release = 'Unknown'] - Version of JavaScript implementation.
   * @param {OutStream} [options.sterror = stoutput] - OutStream for error messages.
   * @param {InStream}  [options.stinput = raise] - InStream for standard input.
   * @param {OutStream} [options.stoutput = raise] - OutStream for standard output.
   * @return {Backend} Shen environment object, typically called $.
   */

  /**
   * @typedef {Object} Backend
   * @prop {boolean}  async - Environment will generate async functions.
   * @prop {function} bounce - Creates a trampoline from function and arguments.
   * @prop {function} compile - Turns KLambda expression array tree into JavaScript AST.
   * @prop {function} cons - Creates a Cons from a head and tail.
   * @prop {function} defun - Adds function to the global function registry.
   * @prop {function} equate - Determines if two values are equal according to the semantics of Shen.
   * @prop {function} evalJs - Evalutes a JavaScript AST in isolated scope with access to $.
   * @prop {function} evalKl - Builds and evaluates a KLambda expression tree in isolated scope with access to $.
   * @prop {Object}   functions - Global index of functions by name. Contained functions are
   *                            passed through fun to handle partial and curried application.
   * @prop {function} future - Awaits argument, if value is a Trampoline, runs Trampoline and repeats. future(...) calls
   *                           are generated around function applications in head position while in async mode.
   * @prop {Object}   inlines - Post-processing inlines. Each accepts constructed JavaScript ASTs
   *                            and returns another AST.
   * @prop {function} settle - If value is a Trampoline, runs Trampoline and repeats. settle(...) calls are
   *                           generated around function applications in head position while in sync mode.
   * @prop {function} show - toString() function. Returns string representation of any value.
   * @prop {Object}   symbols - Global symbol index. Keys are strings.
   * @prop {function} trapAsync - Invoke first function, settle result and return it. If an error
   *                              is raised, apply second function to error and return.
   * @prop {function} trapSync - Invoke first function, settle result, await and return it. If an error
   *                             is raised, apply second function to error and return.
   * @prop {function} valueOf - Returns the value of the given global symbol. Raises an error if it is not defined.
   */

.. danger:: need to document kernel

.. danger:: need to document frontend

..

  /**
   * Amends Shen environment with JavaScript- and ShenScript-specific functionality.
   * @param {Object} $ - Shen environment object to amend.
   * @returns {Frontend} Same object, mutated.
   */

  /**
   * @typedef {Object} Frontend
   * @prop {function} caller - Returns a function that invokes the function by the given name,
   *                           settling returned Trampolines.
   * @prop {function} define - Defines Shen function that defers to given JavaScript function.
   * @prop {function} defineTyped - Defines Shen function that defers to given JavaScript function and declares
   *                                with the specified Shen type signature. Type signature has the same structure
   *                                as in Shen source code, but in array tree form.
   * @prop {function} defmacro - Defines a Shen macro in terms of the given JavaScript function.
   * @prop {function} evalShen - Evaluates Shen expression tree in isolated environment.
   * @prop {function} exec - Parses string as Shen source, evaluates each expression and returns last result.
   * @prop {function} execEach - Parses string as Shen source, evaluates each expression and returns an array
   *                             of the results.
   * @prop {function} inline - Registers an inlining rule.
   * @prop {function} load - Loads Shen code from the given file path.
   * @prop {function} parse - Returns parsed Shen source code as a cons tree.
   * @prop {function} pre - Registers a preprocessor function.
   * @prop {function} symbol - Declares a global symbol with the given value and a function by the same name
   *                           that retrieves the value.
   */
