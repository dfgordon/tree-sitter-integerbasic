'''This program performs automatic edits to the sources for the parser.
This is automatically invoked by running `build.py`.
Inputs:
`token_list.txt` - file with the A2ROM tokens
`allow_lower_case` - variable defined below
Mappings:
`grammar-src.js` to `grammar.js`
`scanner-src.cc` to `../src/scanner.cc ` (not used at present)
Products:
`../queries/highlights.scm` (Tree-sitter highlighting, also for neovim)
`../test/corpus/vars-illegal.txt` (tests of variable names)
`../test/corpus/vars-legal.txt` (tests of variable names)
`token_list.json` (token data in JSON format)'''

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

# Regarding the forbidden variables, FOR, COLOR, AUTO, and GOTO need not be listed
# because of embedded TO and OR

# Assigning the following is a syntax error according to Virtual II
illegal_var = ['end','gr','list','notrace','pop','print','return','text','trace']
# Assigning the following with leading Z is a syntaz error according to Virtual II
illegal_var_end = ['and','at','mod','or','step','then','to']
# Assigning the following with trailing alpha is a syntax error according to Virtual II
illegal_var_postalpha = ['dsp','end','gr','input','list','next','nodsp','notrace','pop','return','text','trace']
# Assigning the following with trailing number is a syntax error according to Virtual II
illegal_var_postnum = ['end','gr','list','notrace','pop','return','text','trace']

all_restrictions = set()
for r in illegal_var + illegal_var_end + illegal_var_postalpha + illegal_var_postnum:
    all_restrictions.add(r)

# Following are lexical tokens (rule will be regex)
lexical_tokens = [] # rule will be regex
lexical_precedence = [] # rule will have precedence 1
for r in illegal_var_end:
    lexical_tokens += [r]
for r in all_restrictions:
    if r in illegal_var and r in illegal_var_postalpha and r in illegal_var_postnum:
        lexical_tokens += [r]
# for r in all_restrictions:
#     if r in illegal_var or r in illegal_var_postalpha or r in illegal_var_postnum:
#         lexical_precedence += [r]
lexical_precedence += ['rem','color=','for','if','print']

# First step is to gather and check the tokens
# Each row becomes a single dictionary describing the token

tokens = []

with open('token_list.txt','r') as f:
    for line in f:
        dat = line.split()
        tokens += [{}]
        tokens[-1]['code'] = dat[0]
        if len(dat)>1:
            tokens[-1]['lexeme'] = dat[1]
        if len(dat)>2:
            tokens[-1]['rule id'] = dat[2]
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
    if len(tok)>1:
        for c in tok[:-1]:
            ans += "'" + allow(c) + "',"
        ans += "'" + allow(tok[-1]) + "'"
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

# Build some C++-code for the external scanner

scanner_code = ''
for t in lexical_tokens:
    scanner_code += '    exclusions.push_back(exclusion("'+t.upper()+'",'+str(len(t))+',1,0));\n'

# Modify the scanner

with open('scanner-src.cc','r') as f:
    scanner = f.read()
    scanner = scanner.replace('// Build exclusions - DO NOT EDIT line',scanner_code)
    if allow_lower_case:
        scanner = re.sub('allow_lower_case\s*=\s*(true|false)','allow_lower_case = true',scanner)
    else:
        scanner = re.sub('allow_lower_case\s*=\s*(true|false)','allow_lower_case = false',scanner)
        scanner = re.sub('integerbasic_external','integerbasiccasesens_external',scanner)
with open(pathlib.Path('..')/pathlib.Path('src')/pathlib.Path('scanner.cc'),'w') as f:
    f.write(scanner)

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

# Form string of conflicts for the JavaScript grammar

conflict_string = 'conflicts: $ => [\n'
statement_groups = {}
sep_groups = {}

for t in tokens:
    if t['rule id']!=None:
        rule_parts = t['rule id'].split('_')
        if rule_parts[0]=='statement' or rule_parts[0]=='fcall':
            grp = rule_parts[0] + '_' + rule_parts[1]
            if grp in statement_groups:
                statement_groups[grp] += [t['rule id']]
            else:
                statement_groups[grp] = [t['rule id']]
        if rule_parts[0]=='sep':
            grp = rule_parts[0] + '_' + rule_parts[1]
            if grp in sep_groups:
                sep_groups[grp] += [t['rule id']]
            else:
                sep_groups[grp] = [t['rule id']]
for c in statement_groups:
    ln = '\t\t['
    for r in statement_groups[c]:
        if '_null' not in r:
            ln += '$.'+r+','
    if len(statement_groups[c])>1:
        conflict_string += ln[:-1] + '],\n'
    conflict_string += ln + '$.str_name,$.int_name],\n'
for c in sep_groups:
    ln = '\t\t['
    for r in sep_groups[c]:
        if '_null' not in r:
            ln += '$.'+r+','
    if len(sep_groups[c])>1:
        conflict_string += ln[:-1] + '],\n'
conflict_string += '\t\t[$.str_name,$.int_name],\n'
conflict_string += '\t\t[$.statement_print_str,$.statement_print_int,$.statement_print_null,$.str_name,$.int_name],\n'
conflict_string += '\t\t[$.open_slice,$.open_str],\n'
conflict_string += '\t\t[$.op_not,$.str_name,$.int_name]\n'

# Create the grammar from the working file

with open('grammar-src.js','r') as f:
    grammar = f.read()
    # Multiple sweeps, order matters
    # First sweep substitutes rules inside a particular statement or fcall
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
    grammar = re.sub('conflicts:\s*\$\s*=>\s*\[',conflict_string,grammar)
with open(pathlib.Path('..') / pathlib.Path('grammar.js'),'w') as f:
    f.write(grammar)

# Create the highlighting queries

highlights = ''
highlights += '(linenum) @tag\n'
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
        if 'fcall_' in t['rule id']:
            highlights += '('+t['rule id']+') @function.builtin\n'
with open(pathlib.Path('..')/pathlib.Path('queries')/pathlib.Path('highlights.scm'),'w') as f:
    f.write(highlights)

# Write out the token data for use elsewhere

with open('token_list.json','w') as f:
    f.write(json.dumps(tokens,sort_keys=True,indent=4))

# Write out the illegal variable tests

test_code =  '==========\n'
test_code += 'Standalone\n'
test_code += '==========\n\n'
for i,l in enumerate(illegal_var):
    test_code += str(i) + ' ' + l.upper() + ' = 1\n'
test_code += '\n---\n\n'
test_code += '(source_file\n'
for l in illegal_var:
    if l=='print':
        test_code += '(line (linenum) (statement (statement_print_int) (ERROR) (integer)))\n'
    else:
        test_code += '(line (linenum) (statement (statement_' + l + ')) (ERROR (integer)))\n'
test_code += ')\n\n'

test_code +=  '==========\n'
test_code += 'Postnumber\n'
test_code += '==========\n\n'
for i,l in enumerate(illegal_var_postnum):
    test_code += str(i) + ' ' + l.upper() + '1 = 1\n'
test_code += '\n---\n\n'
test_code += '(source_file\n'
for l in illegal_var_postnum:
    if l=='list':
        test_code += '(line (linenum) (statement (statement_list_line) (linenum)) (ERROR (integer)))\n'
    else:
        test_code += '(line (linenum) (statement (statement_' + l + ')) (ERROR (integer) (integer)))\n'
test_code += ')'

with open(pathlib.Path('..') / pathlib.Path('test') / pathlib.Path('corpus') / 'vars-illegal.txt', 'w') as f:
    f.write(test_code)

# Write out the legal variable tests

test_code =  '==========\n'
test_code += 'Standalone\n'
test_code += '==========\n\n'
legal_var = set()
for t in tokens:
    lx = t['lexeme']
    if lx.isalpha() and lx not in illegal_var and lx not in ['rem','for','goto']:
        legal_var.add(lx)
legal_var = sorted(legal_var)
for i,l in enumerate(legal_var):
    test_code += str(i) + ' ' + l.upper() + ' = 1\n'
test_code += '\n---\n\n'
test_code += '(source_file\n'
for l in legal_var:
    test_code += '(line (linenum) (statement (assignment_int (int_name) (op_eq_assign_int) (integer))))\n'
test_code += ')\n\n'

with open(pathlib.Path('..') / pathlib.Path('test') / pathlib.Path('corpus') / 'vars-legal.txt', 'w') as f:
    f.write(test_code)
