# Update the parser and build the WASM files.
# The emscripten SDK must be activated: `emsdk activate latest`
# Run from project directory: `./script/build.ps1`

Set-Location script
python token_processor.py --allow-lower-case 1
Set-Location ..
npx tree-sitter generate
npx tree-sitter test
npx tree-sitter build --wasm .
