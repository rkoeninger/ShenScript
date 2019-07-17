ShenScript Implementation Internals
===================================

symbolOf, s
nameOf
raise
trapSync
trapAsync
bounce, b
settle, t
future, u
fun, l
functions, f
symbols
compile
inlines
preprocessors
awaitedInlines
as*
is*

Classes
-------

None of these classes are exported and are only referred to internally.

.. class:: Cons(head, tail)

   The classic Lisp cons cell. :code:`head` and :code:`tail` are akin to :code:`car` and :code:`cdr`.

   When a chain of :code:`Cons` is used to build a list, the last :code:`Cons` in the chain has a :code:`tail` of :code:`null`.

   :param head: Could be any value. Named :code:`head` because it's typically the head of a list.
   :param tail: Could be any value. Named :code:`tail` because it's typically the tail of a list.

.. method:: cons(head, tail)

   Creates a :code:`Cons` with the given :code:`head` and :code:`tail`.

.. class:: Trampoline(f, args)

   :param f:    A JavaScript function.
   :param args: A JavaScript array of arguments that :code:`f` will get applied to.

.. method:: bounce(f, args)

   Creates a :code:`Trampoline`. The :code:`args` parameter is variadic.

ShenScript Interals Access Functions
------------------------------------

shen-script.lookup-function
shen-script.$
shen-script.boolean.js->shen
shen-script.boolean.shen->js
