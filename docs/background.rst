.. include:: directives.rst

Motivation
==========

JavaScript is one of the most commonly used languages in the world, running in every browser and on almost every platform, as well as being the basis for the prolific Node.js platform. It has some built-in capabilities like dynamic expression evaluation, async/await syntax and highly optimised runtimes that make it a preferred target. It's not a perfect match, however and the details of how the gaps between JavaScript and Shen are bridged is detailed in this documentation.

The purpose of building ShenScript is to bring the powerful functionality inherent in the Shen language to web development. And with the way ShenScript is implemented, asynchronous code is handled transparently so the Shen developer doesn't have to think about the distinction between a synchronous call and an async one.

Prior Art
=========

Before going into detail on ShenScript, I wanted to highlight and say thank you for pre-existing work on Shen and on the porting of Shen to JavaScript that both this port and I personally have benefitted from studying.

shen-js
-------

This library is attempt to improve on the existing `shen-js <https://github.com/gravicappa/shen-js>`_ project by `Ramil Farkhshatov <https://github.com/gravicappa>`_. shen-js implements its own KLVM on top of JS, allowing it to handle deep recursion without stack overflow and make asynchronous I/O transparent to Shen code. However, it outputs a large deployable (\~12MB uncompressed) and it's generated code is inscrutible (but generating idiomatic JS is no longer a primary goal of this project, either). ShenScript is intended to improve on shen-js by using more recent JS features, building a smaller deployable and providing more facilities for web development.

shen-cl
-------

ShenScript also takes inspiration from the original Shen port, `shen-cl <https://github.com/Shen-Language/shen-cl>`_. Shen for Common Lisp offers a good demonstration of how to embed Shen's semantics in another dynamic language. This port also learns some negative lessons from shen-cl like the need to properly segregate reference scope between Shen code and the host language and still allow for easy, effective interop between the two.
