Parser for Integer BASIC
==========================

![unit tests](https://github.com/dfgordon/tree-sitter-integerbasic/actions/workflows/node.js.yml/badge.svg)

This is a comprehensive language description and fast parser for Integer BASIC built using the [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) system.  Bindings are available for several languages.  The following pre-built packages are available:

* [Parsing Integer with JavaScript](https://www.npmjs.com/package/tree-sitter-integerbasic)
* [Parsing Integer with Rust](https://crates.io/crates/tree-sitter-integerbasic)

Language Extensions
-------------------

This parser is the basis of language extensions for:

* [Code](https://code.visualstudio.com/), see [vscode-language-integerbasic](https://github.com/dfgordon/vscode-language-integerbasic)
    - highlights, hovers, completions, diagnostics
* [Neovim](https://neovim.io), see [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
    - highlights only
    - language must be [manually installed](https://github.com/nvim-treesitter/nvim-treesitter#advanced-setup)

The Tree-sitter command line interface can highlight a file, see [Tree-sitter highlighting](https://tree-sitter.github.io/tree-sitter/syntax-highlighting).

Tokenization
-----------------

The parser is designed to make tokenization easy by assigning to each integer BASIC token a distinct, named node in the syntax tree.  For example,
```bas
10 PRINT A$;A;
```
will produce the S expression
```s
(source_file [0, 0] - [1, 0]
  (line [0, 0] - [1, 0]
    (linenum [0, 0] - [0, 3])
    (statement [0, 3] - [0, 14]
      (statement_print_str [0, 3] - [0, 8])
      (str_name [0, 9] - [0, 11]
        (dollar [0, 10] - [0, 11]))
      (sep_print_int [0, 11] - [0, 12])
      (int_name [0, 12] - [0, 13])
      (sep_print_null [0, 13] - [0, 14]))))
```
Then, one can apply a simple one-one mapping to produce the tokens.  Notice the lookahead dependence of the `PRINT` and `;` tokens is already resolved.

This is the basis of the tokenization command in the [Code extension](https://github.com/dfgordon/vscode-language-integerbasic)

Emulation
---------------

The parser is intended to emulate the behavior of the Apple ][ ROM (A2ROM).  A large number of tests have been constructed to verify this.  The known exception is that the A2ROM forbids assignment (without `LET`) to variables that begin with `DSP`, `NODSP`, `NEXT`, and `INPUT`, while this parser allows such assignments.  Downstream tools can easily check `int_name` and `str_name` nodes to correct for this.

References
-----------

1. Apple II Reference Manual, 1978
2. [Integer BASIC disassembly](https://www.callapple.org/docs/ap2/special/integerbasic.pdf)