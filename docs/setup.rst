.. include:: directives.rst

Building an Environment
=======================

The top-level module, :js:`shen`, exports a single function. That function takes an optional :js:`options` object and returns a ShenScript environment.

.. danger:: finish documenting this

   .. code-block::

      {
        "async": boolean // Required.
        "clock":
      }

The Kernel Sandwich
===================

A full ShenScript environment is created by initialising a new backend with the options passed into the top-level, running that through the appropriate async or sync pre-rendered kernel and then applying the frontend decorator for whichever node or web environment is specified in the options. The composition looks like :js:`frontend(kernel(backend(options)))`. I call this "The Kernel Sandwich".

The Backend
-----------

**module** ``backend``

The backend module contains the KLambda-to-JavaScript transpiler, global function and symbol indexes and proto-primitives for conses, trampolines, equality and partial application.

The :js:`exports` of this module is just a function that constructs a new ShenScript environment object, which is conventionally named :js:`$`.

.. function:: (options = {}) => $

   :param Object   options:                Environment config and overrides.
   :param boolean  options.async:          Enable generation of async/promise-chaining code. Defaults to :js:`false`.
   :param function options.clock:          Provides current time in fractional seconds from the Unix epoch. Defaults to :js:`() => Date.now`.
   :param string   options.homeDirectory:  Initial working directory in file system. Defaults to :js:`"/"`.
   :param string   options.implementation: Name of JavaScript platform in use. Defaults to :js:`"Unknown"`.
   :param class    options.InStream:       Class used for input streams. Not required if :js:`isInStream` and :js:`openRead` are specified.
   :param class    options.OutStream:      Class used for output streams. Not required if :js:`isInStream` and :js:`openRead` are specified.
   :param function options.isInStream:     Returns true if argument is an :js:`InStream`. Defaults to a function that returns false.
   :param function options.isOutStream:    Returns true if argument is an :js:`OutStream`. Defaults to a function that returns false.
   :param function options.openRead:       Opens an :js:`InStream` for the given file path. Defaults to a function that raises an error.
   :param function options.openWrite:      Opens an :js:`OutStream` for the given file path. Defaults to a function that raises an error.
   :param string   options.os:             Name of operating system in use. Defaults to :js:`"Unknown"`.
   :param string   options.port:           Current version of ShenScript. Defaults to :js:`"Unknown"`.
   :param string   options.porters:        Author(s) of ShenScript. Defaults to :js:`"Unknown"`.
   :param string   options.release:        Current version of JavaScript platform in use. Defaults to :js:`"Unknown"`.
   :param string   options.sterror:        :js:`OutStream` for error messages. Defaults to :js:`stdoutput`.
   :param string   options.stinput:        :js:`InStream` for standard input. Defaults to an object that raises an error.
   :param string   options.stoutput:       :js:`OutStream` for standard output. Defaults to an object that raises an error.
   :returns:                               An object conforming to the :js:`Backend` class description.

.. class:: Backend

   This class is a description of object returned by the :js:`backend` function and does not actually exist. It contains an initial ShenScript environment, without the Shen kernel loaded.

   :param boolean  async:     Environment will generate async functions.
   :param function bounce:    Creates a trampoline from function and rest arguments.
   :param function compile:   Turns KLambda expression array tree into JavaScript AST.
   :param function cons:      Creates a Cons from a head and tail.
   :param function defun:     Adds function to the global function registry.
   :param function equate:    Determines if two values are equal according to the semantics of Shen.
   :param function evalJs:    Evalutes a JavaScript AST in isolated scope with access to :js:`$`.
   :param function evalKl:    Builds and evaluates a KLambda expression tree in isolated scope with access to $.
   :param object   functions: Global function index by string name. Functions handle partial application but do not settle trampolines.
   :param function future:    The async version of :js:`settle`.
   :param object   inlines:   Post-processing inlines. Each accepts constructed JavaScript ASTs and returns another AST.
   :param function settle:    If value is a Trampoline, runs Trampoline and repeats.
   :param function show:      :js:`toString` function. Returns string representation of any value.
   :param object   symbols:   Global symbol index by string name.
   :param function trapAsync: The async version of :js:`trapSync`.
   :param function trapSync:  Invoke first function, settle result and return it. If error raised, apply second function to error and return.
   :param function valueOf:   Returns the value of the given global symbol. Raises an error if it is not defined.

The Kernel
----------

**module** ``kernel.async``, **module** ``kernel.sync``

The :js:`kernel.*` modules contain a JavaScript rendering of the Shen kernel that can be loaded into a ShenScript environment.

:js:`kernel.sync` contains the purely synchronous version of the kernel and :js:`kernel.async` contains the asynchronous version.

The :js:`exports` of this module is just a function that augments an environment and returns it.

.. function:: ($) => $

   :param object $: A ShenScript environment to add functions to.
   :returns:        Same :js:`$` that was passed in, conforming to the :js:`Kernel` class.

.. class:: Kernel extends Backend

   This class is a description of object returned by the :js:`kernel.*` modules and does not actually exist. It contains a primitive ShenScript environment along with the Shen kernel and it adequate to run standard Shen programs.

   The :js:`Kernel` virtual class adds no members, but does imply additional entries in the :js:`functions` and :js:`symbols` indexes.

The Frontend
------------

**module** ``frontend``

The frontend module augments a ShenScript environment with JavaScript- and ShenScript-specific functionality.

Functionality provided includes:

  * :shen:`js` package functions that allow access to common JavaScript types, objects and functions.
  * :shen:`js.ast` package functions that allow generation, rendering and evaluation of JavaScript code.
  * :shen:`shen-script` package functions that allow access to ShenScript environment internals.

The :js:`exports` of this module is just a function that augments an environment and returns it.

.. function:: ($) => $

   :param object $: A ShenScript environment to add functions to.
   :returns:        Same :js:`$` that was passed in, conforming to the :js:`Frontend` class.

.. class:: Frontend extends Kernel

   This class is a description of object returned by the :js:`frontend` function and does not actually exist. It contains a complete ShenScript environment.

   :param function caller:      Returns a function that invokes the function by the given name, settling returned Trampolines.
   :param function define:      Defines Shen function that defers to given JavaScript function.
   :param function defineTyped: Defines Shen function that defers to given JavaScript function and declares with the specified Shen type signature.
   :param function defmacro:    Defines a Shen macro in terms of the given JavaScript function.
   :param function evalShen:    Evaluates Shen expression tree in isolated environment.
   :param function exec:        Parses string as Shen source, evaluates each expression and returns last result.
   :param function execEach:    Parses string as Shen source, evaluates each expression and returns an array of the results.
   :param function inline:      Registers an inlining rule.
   :param function load:        Loads Shen code from the given file path.
   :param function parse:       Returns parsed Shen source code as a cons tree.
   :param function pre:         Registers a preprocessor function.
   :param function symbol:      Declares a global symbol with the given value and a function by the same name that retrieves the value.
   :returns:                    Same :js:`$` that was passed in.

The Node Frontend
~~~~~~~~~~~~~~~~~

**module** ``frontend.node``

Further adds :shen:`node` package helpers for interacting with the capabilites of the Node.js runtime.

The Web Frontend
~~~~~~~~~~~~~~~~

**module** ``frontend.web``

Further adds :shen:`web` package helpers for interacting with the capabilites of a web browser or electron instance.
