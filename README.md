Parser for Integer BASIC
==========================

This is the node binding for `tree-sitter-integerbasic`.  See the main README [here](https://github.com/dfgordon/tree-sitter-integerbasic).

Here is a sample `package.json`:

```json
{
  "name": "parsing-example",
  "version": "1.0.0",
  "description": "integer basic parsing example",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "node-gyp": "^10.1.0",
    "tree-sitter": "^0.21.1",
    "tree-sitter-integerbasic": "^2.0.0"
  }
}
```

With an example `index.js` as follows:

```js
const Parser = require('tree-sitter');
const Integer = require('tree-sitter-integerbasic');

const code = '10 print "HELLO WORLD!"\n';
const parser = new Parser();
parser.setLanguage(Integer);
tree = parser.parse(code);
console.log(tree.rootNode.toString());
```

This should print the syntax tree

```
(source_file (line (linenum) (statement (statement_print_str) (string (quote) (unquote)))))
```

For more on parsing with node, see the general guidance [here](https://github.com/tree-sitter/node-tree-sitter).
