'''This program performs automatic edits to the sources for the parser,
and creates many of the unit tests.
This is automatically invoked by running `script/build.py`.
Inputs:
`token_list.txt` - file with the A2ROM tokens
`allow_lower_case` - command line argument defined below
Mappings:
`script/grammar-src.js` to `grammar.js`
Products:
`queries/highlights.scm` (Tree-sitter highlighting, also for neovim)
`test/corpus/vars-illegal.txt` (tests of variable names)
`test/corpus/vars-legal.txt` (tests of variable names)
`script/token_list.json` (token data in JSON format)'''

import sys
import re
import pathlib
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

proj_path = pathlib.Path.cwd().parent
query_path = proj_path / 'queries'
test_path = proj_path / 'test' / 'corpus'

# Assigning the following is a syntax error according to Virtual II
illegal_var = set(['auto','end','for','goto','gr','list','notrace','pop','print','return','text','trace'])
# Assigning the following with leading Z is a syntax error according to Virtual II
illegal_var_end = set(['auto','and','at','for','goto','mod','or','step','then','to'])
# Assigning the following with trailing alpha is a syntax error according to Virtual II
illegal_var_postalpha = set(['auto','dsp','end','for','gr','input','list','next','nodsp','notrace','pop','return','text','trace'])
# Assigning the following with trailing number is a syntax error according to Virtual II
illegal_var_postnum = set(['auto','end','for','gr','list','notrace','pop','return','text','trace'])
# Assigning the following as string with trailing number is a syntax error
illegal_str_postnum = illegal_var_postnum | set(['auto','goto','print'])

# Following are lexical tokens (rule will be regex)
lexical_tokens = illegal_var_end | (illegal_var & illegal_var_postalpha & illegal_var_postnum)

# Rule will have lexical precedence 1
lexical_precedence = ['rem','color=','print']

# These cannot start a variable name *unless* followed immediately by a number.
# E.g., DSP=1 and DSP1=1 are valid, DSPA=1 is invalid (because DSP A is a statement, presumably).
# Tree-sitter is "too smart" and will figure out DSPA=1 is an assignment, so downstream tools must
# check assignments for this particular error.
# N.b. using LET avoids the issue, i.e., LET DSPA = 1 is valid.
illegal_var_postalpha_only = illegal_var_postalpha - illegal_var_postnum


# First step is to gather and check the tokens
# Each row becomes a single dictionary describing the token

tokens = [] # list of dictionaries for all tokens
commands = set() # all lexemes restricted to immediate mode

with open('token_list.txt','r') as f:
    for line in f:
        dat = line.split()
        tokens += [{}]
        tokens[-1]['code'] = dat[0]
        if len(dat)>1:
            tokens[-1]['lexeme'] = dat[1]
        if len(dat)>2:
            tokens[-1]['rule id'] = dat[2]
            if dat[2][:3]=='com':
                commands.add(dat[1])
        if len(dat)>3:
            tokens[-1]['enclosing rule'] = dat[3]
        if len(dat)>4:
            tokens[-1]['pattern'] = dat[4]

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
    if 'rule id' in t:
        tokens += [t]

# Check the rule id's

length_histogram = [0]*8
for t in tokens:
    lx = t['lexeme']
    id = t['rule id']
    if not id.isidentifier():
        raise ValueError('Token rule id not valid identifier: '+id)
    print(lx,'->',t['rule id'])
    length_histogram[len(lx)] += 1

print()
print('Token Histogram:')
print('length count')
for l,n in enumerate(length_histogram):
    print('{:6} {:5}'.format(l,n))
print()

def allow(c):
    if allow_lower_case:
        return '[' + c.upper() + c.lower() + ']'
    else:
        return c.upper()

def allow_ts(c):
    if allow_lower_case and c.isalpha():
        return "choice('"+c.upper()+"','"+c.lower()+"')"
    else:
        return "'"+c.upper()+"'"

# Form a token rule as regex for Tree-sitter (JavaScript)

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
    for c in tok[:-1]:
        ans += allow_ts(c) + ","
    ans += allow_ts(tok[-1])
    ans = 'seq(' + ans + ')'
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

# Form string of token rules for the JavaScript grammar

token_rule_string = ''
for t in tokens:
    if t['rule id']!=None:
        if t['lexeme'] in lexical_tokens:
            rule_value = tok_regex_js(t['lexeme'])
        elif t['lexeme'] in lexical_precedence:
            rule_value = 'prec(1,'+tok_ts_js(t['lexeme'])+')'
        else:
            rule_value = tok_ts_js(t['lexeme'])
        token_rule_string += '\t\t' + t['rule id'] + ': $ => '+rule_value+',\n'

# Form the error rules

token_rule_string += '\n\t\top_error: $ => prec(1,choice(\n'
for lx in illegal_var_end:
    if lx=='at':
        token_rule_string += '\t\t\t' + tok_ts_js(lx) + ',\n'
    else:
        token_rule_string += '\t\t\t' + tok_regex_js(lx) + ',\n'
token_rule_string += '\t\t)),'

# Create the grammar from the working file

with open('grammar-src.js','r') as f:
    grammar = f.read()
    # Multiple sweeps, order matters
    # First sweep substitutes rules that are specific to a statement or fcall
    for t in tokens:
        if t['rule id']!=None:
            lx = t['lexeme']
            id = t['rule id']
            if 'enclosing rule' in t:
                encl = t['enclosing rule'].split('.')
                if (encl[0]=='statement' or encl[0]=='fcall') and len(encl)>1:
                    for leading in encl[1].split('|'):
                        if leading[0]=="'" and leading[-1]=="'":
                            trig = leading
                        else:
                            trig = "'" + leading.upper() + "'"
                        patt = '('+re.escape("seq("+trig)+".*)'"+re.escape(lx.upper())+"'"
                        grammar = re.sub(patt,'\\1$.'+id,grammar)
    # Second sweep substitutes rules at root or first level
    for t in tokens:
        if t['rule id']!=None:
            lx = t['lexeme']
            id = t['rule id']
            if 'enclosing rule' not in t:
                grammar = re.sub("'"+re.escape(lx.upper())+"'",'$.'+id,grammar)
            else:
                encl = t['enclosing rule'].split('.')
                if len(encl)==1:
                    patt = '('+re.escape(encl[0]+':')+'.*)'+"'"+re.escape(lx.upper())+"'"
                    grammar = re.sub(patt,'\\1$.'+id,grammar)
    # Third sweep substitutes rules for statements that must match a pattern
    for t in tokens:
        if t['rule id']!=None:
            lx = t['lexeme']
            id = t['rule id']
            if 'enclosing rule' in t and 'pattern' in t:
                encl = t['enclosing rule'].split('.')
                if len(encl)>1:
                    if encl[0]=='statement' and encl[1]==lx:
                        patt = ''
                        repl = ''
                        for el in t['pattern'].split('.'):
                            if el=='this':
                                patt += re.escape("'"+lx.upper()+"'")
                                repl += '$.'+id
                            elif el[0]=="'" and el[-1]=="'":
                                patt += el[1:-1]
                                repl += el[1:-1]
                            else:
                                patt += re.escape('$.'+el)
                                repl += '$.'+el
                            if el!=t['pattern'].split('.')[-1]:
                                patt += '[ \t]*,[ \t]*'
                                repl += ','
                        #print(patt,repl)
                        grammar = re.sub(patt,repl,grammar)
    grammar = grammar.replace('\t\t// token rules go here DO NOT EDIT this line',token_rule_string)
    grammar = re.sub('allow_lower_case\s*=\s*\w+','allow_lower_case = '+str(allow_lower_case).lower(),grammar)
with open(proj_path / 'grammar.js','w') as f:
    f.write(grammar)

# Create the highlighting queries

highlights = ''
highlights += '(linenum) @tag\n'
highlights += '(op_error) @operator\n'
highlights += '(statement (statement_gosub) (integer) @tag)\n'
highlights += '(statement (statement_goto) (integer) @tag)\n'
highlights += '(comment_text) @comment\n'
highlights += '(string) @string\n'
highlights += '(integer) @number\n'
highlights += '(str_name) @variable\n'
highlights += '(int_name) @variable\n'
for t in tokens:
    if 'rule id' in t:
        if 'op_' in t['rule id']:
            highlights += '('+t['rule id']+') @operator\n'
        if 'sep_' in t['rule id']:
            if 'enclosing rule' not in t or 'command' not in t['enclosing rule']:
                highlights += '('+t['rule id']+') @punctuation.delimiter\n'
        if 'statement_' in t['rule id']:
            highlights += '('+t['rule id']+') @keyword.builtin\n'
        if 'com_' in t['rule id']:
            highlights += '('+t['rule id']+') @keyword.builtin\n'
        if 'fcall_' in t['rule id']:
            highlights += '('+t['rule id']+') @function.builtin\n'
with open(query_path / 'highlights.scm','w') as f:
    f.write(highlights)

# Write out the token data for use elsewhere

with open('token_list.json','w') as f:
    f.write(json.dumps(tokens,sort_keys=True,indent=4))

# Write out the illegal variable tests

def lx2rule(s):
    return 'com_' + s if s in commands else 'statement_' + s
def test_heading(s,expect_err=False):
    if expect_err:
        return '==========\n' + s + '\n:error\n==========\n\n'
    else:
        return '==========\n' + s + '\n==========\n\n'
test_code = ''

for i,l in enumerate(illegal_var):
    test_code += test_heading('Standalone int '+l,True)
    test_code += '10 ' + l.upper() + ' = 1\n'
    test_code += '\n---\n\n'

    test_code += test_heading('Standalone str '+l,True)
    test_code += '10 ' + l.upper() + '$ = "1"\n'
    test_code += '\n---\n\n'

for i,l in enumerate(illegal_var_postnum):
    test_code += test_heading('Postnumber int '+l,True)
    test_code += '10 ' + l.upper() + '1 = 1\n'
    test_code += '\n---\n\n'

for i,l in enumerate(illegal_str_postnum):
    test_code += test_heading('Postnumber str '+l,True)
    test_code += '10 ' + l.upper() + '1$ = "1"\n'
    test_code += '\n---\n\n'

for i,l in enumerate(illegal_var_postalpha - illegal_var_postalpha_only):
    test_code += test_heading('Postalpha int '+l,True)
    test_code += '10 ' + l.upper() + 'A = 1\n'
    test_code += '\n---\n\n'

    test_code += test_heading('Postalpha str '+l,True)
    test_code += '10 ' + l.upper() + 'A$ = "1"\n'
    test_code += '\n---\n\n'

for i,l in enumerate(illegal_var_end):
    test_code += test_heading('Within int '+l,True)
    test_code += '10 Z' + l.upper() + 'Z = 1: Z' + l.upper() + ' = 1\n'
    test_code += '\n---\n\n'

    test_code += test_heading('Within str '+l,True)
    test_code += '10 Z' + l.upper() + 'Z$ = "1": Z' + l.upper() + '$ = "1"\n'
    test_code += '\n---\n\n'

with open(test_path / 'vars-illegal.txt', 'w', newline="\n") as f:
    f.write(test_code)

# Write out the legal variable tests

alphatokens = set([t['lexeme'] for t in tokens if t['lexeme'].isalpha()])
test_code = ''

for i,l in enumerate(alphatokens - illegal_var):
    test_code += test_heading('Standlone int '+l)
    test_code += '10 ' + l.upper() + ' = 1\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_int (int_name) (op_eq_assign_int) (integer)))))\n\n'

    test_code += test_heading('Standlone str '+l)
    test_code += '10 ' + l.upper() + '$ = "1"\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_str (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))))\n\n'

for i,l in enumerate(alphatokens - illegal_var_postnum):
    test_code += test_heading('Postnumber int '+l)
    test_code += '10 ' + l.upper() + '1 = 1\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='print':
        test_code += '(line (linenum) (statement (statement_print_int) (binary_aexpr (integer) (op_aeq) (integer)) )))\n\n'
    elif l=='goto':
        test_code += '(line (linenum) (statement (statement_goto) (binary_aexpr (integer) (op_aeq) (integer)) )))\n\n'
    elif l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_int (int_name) (op_eq_assign_int) (integer)))))\n\n'

for i,l in enumerate(alphatokens - illegal_str_postnum):
    test_code += test_heading('Postnumber str '+l)
    test_code += '10 ' + l.upper() + '1$ = "1"\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_str (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))))\n\n'

for i,l in enumerate(alphatokens - illegal_var_postalpha):
    test_code += test_heading('Postalpha int '+l)
    test_code += '10 ' + l.upper() + 'A = 1\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='let':
        test_code += '(line (linenum) (statement (assignment_int (statement_let) (int_name) (op_eq_assign_int) (integer)))))\n\n'
    elif l=='print':
        test_code += '(line (linenum) (statement (statement_print_int) (binary_aexpr (int_name) (op_aeq) (integer)) )))\n\n'
    elif l=='goto':
        test_code += '(line (linenum) (statement (statement_goto) (binary_aexpr (int_name) (op_aeq) (integer)) )))\n\n'
    elif l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_int (int_name) (op_eq_assign_int) (integer)))))\n\n'

    test_code += test_heading('Postalpha str '+l)
    test_code += '10 ' + l.upper() + 'A$ = "1"\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    if l=='let':
        test_code += '(line (linenum) (statement (assignment_str (statement_let) (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))))\n\n'
    elif l=='print':
        test_code += '(line (linenum) (statement (statement_print_int) (binary_aexpr (str_name (dollar)) (op_seq) (string (quote) (unquote))) )))\n\n'
    elif l=='goto':
        test_code += '(line (linenum) (statement (statement_goto) (binary_aexpr (str_name (dollar)) (op_seq) (string (quote) (unquote))) )))\n\n'
    elif l=='rem':
        test_code += '(line (linenum) (statement (statement_rem) (comment_text) )))\n\n'
    else:
        test_code += '(line (linenum) (statement (assignment_str (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))))\n\n'

for i,l in enumerate(alphatokens - illegal_var_end):
    test_code += test_heading('Within int '+l)
    test_code += '10 Z' + l.upper() + 'Z = 1: Z' + l.upper() + ' = 1\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    test_code += '''(line (linenum)
    (statement (assignment_int (int_name) (op_eq_assign_int) (integer)))
    (sep_statement)
    (statement (assignment_int (int_name) (op_eq_assign_int) (integer)))))\n\n'''

    test_code += test_heading('Within str '+l)
    test_code += '10 Z' + l.upper() + 'Z$ = "1": Z' + l.upper() + '$ = "1"\n'
    test_code += '\n---\n\n'
    test_code += '(source_file\n'
    test_code += '''(line (linenum)
    (statement (assignment_str (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))
    (sep_statement)
    (statement (assignment_str (str_name (dollar)) (op_eq_assign_str) (string (quote) (unquote))))))\n\n'''

with open(test_path / 'vars-legal.txt', 'w', newline="\n") as f:
    f.write(test_code)
