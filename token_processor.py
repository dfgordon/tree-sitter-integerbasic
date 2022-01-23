'''This program performs automatic edits to the sources for the parser.
This is automatically invoked by running `build.py`.
Inputs:
`token_list.txt` - file with the A2ROM tokens
`allow_lower_case` - variable defined below
Mappings:
`grammar-src.js` to `grammar.js`
Products:
`integerbasic.tmGrammar.json` (simple TextMate grammar, not the main grammar)'''

import sys
import pathlib
import re
import json

def Usage():
    print('Usage: python token_processor.py --allow-lower-case <bool> [--help]')
    print('<bool> = 0 : build parser to forbid lower case in tokens and variable names')
    print('<bool> = 1 : build parser to allow lower case in tokens and variable names')

flags = ['--allow-lower-case','--help']
allow_lower_case = None
arg_idx = 1
while (arg_idx<len(sys.argv)):
    if sys.argv[arg_idx] not in flags:
        raise ValueError('unrecognized argument '+sys.argv[arg_idx])
    if sys.argv[arg_idx]=='--help':
        Usage()
        exit(0)
    if sys.argv[arg_idx]=='--allow-lower-case':
        arg_idx += 1
        allow_lower_case = bool(int(sys.argv[arg_idx]))
    arg_idx += 1

if allow_lower_case==None:
    raise ValueError('--allow-lower-case flag was not set')

# Mapping of special characters to javascript identifier fragments

sp_map = {  '#' : 'n',
            '$' : 'dollar',
            '"' : 'quote',
            ':' : 'colon',
            ',' : 'comma',
            ';' : 'sem',
            '&' : 'amp',
            '(' : 'p',
            ')' : 'cp',
            '+' : 'plus',
            '-' : 'minus',
            '*' : 'times',
            '/' : 'div',
            '^' : 'pow',
            '>' : 'gtr',
            '=' : 'eq',
            '<' : 'less'
}

# Following are tokenized separators we want to leave anonymous
anon_separators = [',',';',':','"','(',')','$']
# Following are functions - we want to always lex the `(` even if A2 does not tokenize it
function_keywords = ['abs','asc','len','pdl','peek','rnd','scrn','sgn']
# Following cannot appear in a variable name except at the beginning
leading_keywords = ['and','at','mod','or','step','then']
# Following cannot begin a variable name
trailing_keywords = ['end','let','rem']
# Following will be filled with keywords that are legal anywhere in a name
unrestricted_keywords = []

# First step is to gather and check the tokens

tokens = []

with open('token_list.txt','r') as f:
    for line in f:
        dat = line.split()
        tokens += [{}]
        tokens[-1]['code'] = dat[0]
        if len(dat)>1:
            if dat[1] in function_keywords:
                tokens[-1]['lexeme'] = dat[1]+'('
            else:
                tokens[-1]['lexeme'] = dat[1]
        if len(dat)>2:
            tokens[-1]['context'] = dat[2]

expected_num = 0x7f+1
if len(tokens)!=expected_num:
    raise ValueError('Number of tokens is off by '+str(len(tokens)-expected_num))
else:
    print('Found',expected_num,'tokens as expected.')

curr = -1
for d in tokens:
    code = int(d['code'],16)
    curr += 1
    if (code!=curr):
        raise ValueError('There was a code out of order: '+hex(code))

# Trim the list for further processing

backing = tokens.copy()
tokens = []
for t in backing:
    if 'lexeme' in t:
        if '##' not in t['lexeme']:
            tokens += [t]

# Now set up dictionary with { token lexeme : tree-sitter rule id }
# For now we ignore the context modifier so there will be reassignments to the same value

length_histogram = [0]*8
for t in tokens:
    lx = t['lexeme']
    # form a suitable javascript identifier
    id = ''
    for c in lx:
        if c in sp_map.keys():
            id += sp_map[c]
        else:
            id += c
    if not id.isalpha():
        raise ValueError('Token rule id has special character: '+id)
    t['rule id'] = id + "_tok"
    if lx[0] in anon_separators:
        t['rule id'] = None
    print(lx,'->',t['rule id'])
    length_histogram[len(lx)] += 1
    if lx not in leading_keywords and lx not in trailing_keywords and lx.isalpha():
        unrestricted_keywords += [lx]
print()

print('Function keywords: ')
print(function_keywords)
print()

print('Leading keywords: ')
print(leading_keywords)
print()

print('Trailing keywords: ')
print(trailing_keywords)
print()

print('Unrestricted keywords: ')
print(unrestricted_keywords)
print()

print('Token Histogram:')
print('length count')
for l,n in enumerate(length_histogram):
    print('{:6} {:5}'.format(l,n))
print()

# Form a token rule as regex for Tree-sitter (JavaScript)

def allow(c):
    if allow_lower_case:
        return '[' + c.upper() + c.lower() + ']'
    else:
        return c.upper()

def tok_regex_js(tok):
    ans = ''
    if len(tok)>1:
        for c in tok[:-1]:
            ans += allow(c) + ' *'
        ans += allow(tok[-1])
        ans = '/' + ans + '/'
        ans = ans.replace('$','\$')
        ans = ans.replace('(','\(')
    else:
        ans = "'" + tok + "'"
    return ans

# Form a token rule as `seq` for Tree-Sitter (JavaScript)

def tok_ts_js(tok):
    ans = ''
    if len(tok)>1:
        for c in tok[:-1]:
            ans += "/" + allow(c) + "/,"
        ans += "/" + allow(tok[-1]) + "/"
        ans = ans.replace('$','\$')
        ans = ans.replace('(','\(')
        ans = 'seq(' + ans + ')'
    else:
        ans = "'" + tok + "'"
    return ans

# Form a token rule as regex for TextMate (JSON)

def tok_regex_json(tok):
    ans = ''
    if len(tok)>1:
        for c in tok[:-1]:
            ans += allow(c) + ' *'
        ans += allow(tok[-1])
        ans = ans.replace('$','\$')
        ans = ans.replace('(','\(')
    else:
        ans = tok
    return ans

# Define all the token rules for the JavaScript grammar

token_rule_string = ''

for t in tokens:
    if t['rule id']!=None:
        rule_value = tok_regex_js(t['lexeme'])
        token_rule_string += '\t\t' + t['rule id'] + ': $ => '+rule_value+',\n'

# Create the grammar from the working file

with open('grammar-src.js','r') as f:
    grammar = f.read()
    for t in tokens:
        if t['rule id']!=None:
            lx = t['lexeme']
            id = t['rule id']
            patt = "([(,\t])'" + re.escape(lx.upper()) + "'([),])"
            grammar = re.sub(patt,'\\1$.' + id + '\\2',grammar)
    grammar = grammar.replace('\t\t// token rules go here DO NOT EDIT this line',token_rule_string)
    #grammar = re.sub('allow_lower_case\s*=\s*\w+','allow_lower_case = '+str(allow_lower_case).lower(),grammar)
with open('grammar.js','w') as f:
    f.write(grammar)

# Create a simple TextMate grammar for use where needed (e.g. vscode hover highlights).
# This grammar is very light, Tree-sitter grammar should always be preferred.

tmGrammar = {}
tmGrammar['scopeName'] = 'source.bas'
tmGrammar['patterns'] = []

# Use tree-sitter highlight query to help assign highlight names
with open(pathlib.Path('queries')/pathlib.Path('highlights.scm'),'r') as f:
    highlights = f.read()

if allow_lower_case:
    var_match_rule = '[A-Za-z][A-Za-z0-9]*[$]?'
    comment_match_rule = '[Rr] *[Ee] *[Mm].*$'
else:
    var_match_rule = '[A-Z][A-Z0-9]*[$]?'
    comment_match_rule = 'R *E *M.*$'

# Ordering of list is significant

tmGrammar['patterns'] += [{'name': 'comment',
    'match': comment_match_rule}]

for t in tokens:
    if len(t['lexeme'])>1:
        highlight_name = 'keyword.control'
        match = re.search(t['rule id']+'[) @]*(\w+)',highlights)
        if (match):
            if ('function' in match[1]):
                highlight_name = 'support.function'
        tmGrammar['patterns'] += [{'name': highlight_name,
            'match': tok_regex_json(t['lexeme'])}]

tmGrammar['patterns'] += [{'name': 'string',
    'begin': '"',
    'end': '"'}]

tmGrammar['patterns'] += [{'name': 'variable',
    'match': var_match_rule}]

with open('integerbasic.tmGrammar.json','w') as f:
    f.write(json.dumps(tmGrammar,sort_keys=False,indent=4))
