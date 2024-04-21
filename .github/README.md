Parser for Integer BASIC
==========================

![unit tests](https://github.com/dfgordon/tree-sitter-integerbasic/actions/workflows/node.js.yml/badge.svg)

This is a parser for Integer BASIC intended for use with language servers.  It is built using the [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) system.  Bindings are available for several languages.  The following pre-built packages are available:

* [Parsing Integer with C++](https://github.com/dfgordon/tree-sitter-integerbasic/releases)
* [Parsing Integer with Rust](https://crates.io/crates/tree-sitter-integerbasic)
* [Parsing Integer with WASM](https://github.com/dfgordon/tree-sitter-integerbasic/releases)
* [Parsing Integer with Node](https://www.npmjs.com/package/tree-sitter-integerbasic)

For details on parser usage and design see the [wiki](https://github.com/dfgordon/tree-sitter-integerbasic/wiki).

Build Process
-------------

The build products are generated using `script/build.py, see docstring within for dependencies.

This is a cascaded build.  The starting files are `token_list.txt` and `grammar-src.js`.  These are used by `token_processor.py` to produce `grammar.js`.  These are used by `tree-sitter generate` to produce `src/parser.c` and, in turn, the bindings for various languages.  These are used by `tree-sitter build` to produce the WASM parser.

The `build.py` script produces a case insensitive parser, but can be easily modified to produce a case sensitive one.

References
-----------

1. Apple II Reference Manual, 1978
2. [Integer BASIC disassembly](https://www.callapple.org/docs/ap2/special/integerbasic.pdf)