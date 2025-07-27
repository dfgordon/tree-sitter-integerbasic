'''The workflow is to edit `grammar-src.js` and then run this.
Run from project directory: `python script/build.py`.
We are typically installing `tree-sitter` with cargo.'''

import subprocess
import pathlib
import os

root_dir = pathlib.Path.cwd()
script_dir =  root_dir / 'script'

os.chdir(script_dir)
subprocess.run(['python','token_processor.py','--allow-lower-case','1']).check_returncode()
os.chdir(root_dir)
subprocess.run('tree-sitter generate', shell=True).check_returncode()
subprocess.run('tree-sitter test', shell=True).check_returncode()
