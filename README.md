Parser for Integer BASIC
==========================

This is a comprehensive language description and fast parser for Integer BASIC, the first high level language shipped by Apple Computer.  The parser is built using the [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) system.  The system auto-builds a C-language parser based on a language description contained in the file `grammar.js`.

Status
-----------------

Project is in early stages.  The parser passes all the tests but one, and appears to successfully parse `BREAKOUT`.

References
-----------

1. Apple II Reference Manual, 1978
