Testing
-------

Tests are divided into three types.

1. Integer BASIC is complex in terms of what will work as a variable name, so the metaprogram `token_processor.py` generates a large number of tests in `vars-illegal.txt` and `vars-legal.txt` to verify that various combinations of tokens either do or do not produce a syntax error.  The judge of what is and is not an error is the Virtual ][ emulator.

2. The `emulation.txt` set of tests verifies that the response to various tricky syntaxes is faithfully reproduced.

3. The remainder of the tests are straightforward verifications of parsing of all statements that are described in the references.

As of this writing, the parser leaves certain errors to the downstream tools.  In particular, the following syntax errors are parsed as valid assignments:

* `DSPA = 1`
* `NODSPA = 1`
* `NEXTA = 1`
* `INPUTA = 1`

N.b. the use of `LET` changes the behavior, e.g., `LET DSPA = 1` is a valid Integer BASIC assignment.