Parser for Integer BASIC
==========================

![unit tests](https://github.com/dfgordon/tree-sitter-integerbasic/actions/workflows/node.js.yml/badge.svg)

This is a comprehensive language description and fast parser for Integer BASIC, the first high level language shipped by Apple Computer.  The parser is built using the [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) system.  The system auto-builds a C-language parser based on a language description contained in the file `grammar.js`.

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

Emulation
---------------

Issues related to emulation are still being worked out.  Ideally the parser should produce a syntax error if the Apple ][ ROM would.  The tricky part concerns what is legal in variable names.  The modern parser tends to be more permissive.  For example, at present the parser will accept
```bas
10 MYTO = 1
```
The ROM would reject this because `TO` is embedded in the variable name.

References
-----------

1. Apple II Reference Manual, 1978
2. [Disassembly](https://www.callapple.org/docs/ap2/special/integerbasic.pdf) (on Call-A.P.P.L.E.)