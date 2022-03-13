// References:
// [1] Apple II Reference Manual, Apple Computer Inc., Cupertino, 1978
// [2] Apple Programmer's Handbook, Howard W. Sams & Co., Inc., Indianapolis, 1984

// grammar-src.js is for human editing
// grammar.js is the actual grammar (created by token_processor.py)

// This grammar is designed to make tokenization easy: every token maps to a unique
// named node in the syntax tree.  This is especially useful for Integer BASIC
// where the token encoding is rather elaborate.
// This does result in a verbose syntax tree.

// Grammar elements from Ref. 1 are broken out as follows:
// str$ -> sexpr,string,svar(str_name,str_array),str_slice
// expr -> aexpr
// expression -> expr
// var -> avar(int_name,int_array)

// Limits of a real Apple II that are not imposed here:
// * line numbers must be in range 0 to 32767

// Define constants for use in forming terminal nodes.
// These are named after their equivalents in Ref. 1

function regex_or(lst)
{
	let ans = lst[0];
	lst.slice(1).forEach(r => {
		ans = new RegExp(ans.source + '|' + r.source);
	});
	return ans;
}

// Do not set this flag manually, let `build.py` handle it
const allow_lower_case = true;
const language_name = allow_lower_case ? 'integerbasic' : 'integerbasiccasesens';

const
	DIGIT = /[0-9]/,
	LETTER = /[A-Za-z]/,
	NUMBER_SEQ = [...'0123456789'],
	POS_INTEGER = /[0-9]([0-9 ]*[0-9])?/,
	QUOTE = /"/,
	SPACE = / /,
	SPCHAR = /[+\-*\/^=<>(),.:;%$#?&'@!\[\]{}\\|_`~\x01-\x09\x0b\x0c\x0e-\x1f]/,
	SCHAR = regex_or([LETTER,DIGIT,SPCHAR,SPACE]);

const LETTER_SEQ = allow_lower_case ? [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'] : [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

// Tree-sitter grammar definition

module.exports = grammar({
	name: language_name,
	extras: $ => [' '],
	conflicts: $ => [
	],

	rules: {
		source_file: $ => repeat(choice($.line,$._newline)),

		// Program lines

		line: $ => seq($.linenum,repeat(seq($.statement,':')),$.statement,$._newline),
		linenum: $ => / *[0-9][0-9 ]*/,
		_newline: $ => /\r?\n/,

		// Assign a rule to all tokenized statements and functions

		// token rules go here DO NOT EDIT this line

		// Statements

		statement: $ => choice(
			seq('CALL',$._aexpr),
			seq('COLOR=',$._aexpr),
			seq('DIM',$._dim_str,repeat(choice($._dim_next_str,$._dim_next_int))),
			seq('DIM',$._dim_int,repeat(choice($._dim_next_str,$._dim_next_int))),
			seq('DSP',$.str_name),
			seq('DSP',$.int_name),
			'END',
			seq('FOR',$.int_name,'=',$._aexpr,'TO',$._aexpr,optional(seq('STEP',$._aexpr))),
			seq('GOSUB',$._aexpr),
			seq('GOTO',$._aexpr),
			'GR',
			seq('HLIN',$._aexpr,',',$._aexpr,'AT',$._aexpr),
			seq('IF',$._aexpr,'THEN',$.statement),
			seq('IF',$._aexpr,'THEN',$._aexpr),
			seq('IN#',$._aexpr),
			seq('INPUT',choice($.string,$.str_slice),repeat(choice($._input_next_str,$._input_next_int))),
			seq('INPUT',$._svar,repeat(choice($._input_next_str,$._input_next_int))),
			seq('INPUT',$._avar,repeat(choice($._input_next_str,$._input_next_int))),
			'LIST',
			seq('LIST',seq($.linenum,optional(seq(',',$.linenum)))),
			seq('NEXT',seq($.int_name,repeat(seq(',',$.int_name)))),
			seq('NODSP',$.str_name),
			seq('NODSP',$.int_name),
			'NOTRACE',
			seq('PLOT',$._aexpr,',',$._aexpr),
			seq('POKE',$._aexpr,',',$._aexpr),
			'POP',
			seq('PR#',$._aexpr),
			'PRINT',
			seq('PRINT',$._sexpr,repeat(choice(',',';',$._print_next_str,$._print_next_int,$._tab_next_str,$._tab_next_int))),
			seq('PRINT',$._aexpr,repeat(choice(',',';',$._print_next_str,$._print_next_int,$._tab_next_str,$._tab_next_int))),
			seq('REM',optional($.comment_text)),
			'RETURN',
			seq('TAB',$._aexpr),
			'TEXT',
			'TRACE',
			seq('VLIN',$._aexpr,',',$._aexpr,'AT',$._aexpr),
			seq('VTAB',$._aexpr),
			$.assignment_str,
			$.assignment_int
		),

		comment_text: $ => /.+/,

		assignment_str: $ => seq(optional('LET'),$._svar,'=',$._sexpr),
		assignment_int: $ => seq(optional('LET'),$._avar,'=',$._aexpr),

		// Numerical functions (integer BASIC has no string functions)

		fcall: $ => choice(
			seq('ABS','(',$._aexpr,')'),
			seq('ASC(',$._sexpr,')'),
			seq('LEN(',$._sexpr,')'),
			seq('PDL','(',$._aexpr,')'),
			seq('PEEK','(',$._aexpr,')'),
			seq('RND','(',$._aexpr,')'),
			seq('SCRN(',$._aexpr,',',$._aexpr,')'),
			seq('SGN','(',$._aexpr,')')
		),

		// Expressions

		_expr: $ => choice($._aexpr,$._sexpr),

		_aexpr: $ => choice(
			$.integer,
			$._avar,
			$.fcall,
			$.unary_aexpr,
			$.binary_aexpr,
			$._parenthesized_aexpr
		),
		_parenthesized_aexpr: $ => prec(8,seq('(',$._aexpr,')')),
		unary_aexpr: $ => prec(7,choice(seq('+',$._aexpr),seq('-',$._aexpr),seq('NOT',$._aexpr))), // must be 1 line
		binary_aexpr: $ => choice(prec.left(4,seq($._aexpr,choice('+','-'),$._aexpr)), // +,- must be on this line
			prec.left(6,seq($._aexpr,'^',$._aexpr)),
			prec.left(5,seq($._aexpr,choice('*','/','MOD'),$._aexpr)),
			prec.left(3,seq($._aexpr,$._alop,$._aexpr)),
			prec.left(3,seq($._sexpr,$._slop,$._sexpr))
		),
		_alop: $ => choice('=','#','<>','>','<','>=','<=','AND','OR'),
		_slop: $ => choice('=','#'),

		_sexpr: $ => choice(
			$.string,
			$._svar,
			$.str_slice
		),

		// Variables

		_var: $ => choice($._avar,$._svar),
		_avar: $ => choice($.int_name,$.int_array),
		_svar: $ => choice($.str_name,$.str_array),

		str_array: $ => seq($.str_name,'(',$._aexpr,')'),
		int_array: $ => seq($.int_name,'(',$._aexpr,')'),
		str_slice: $ => seq($.str_name,'(',$._aexpr,',',$._aexpr,')'),

		_dim_str: $ => seq($.str_name,'(',$._aexpr,')'),
		_dim_int: $ => seq($.int_name,'(',$._aexpr,')'),
		_dim_next_str: $ => seq(',',$._dim_str),
		_dim_next_int: $ => seq(',',$._dim_int),

		_input_next_str: $ => seq(',',$._svar),
		_input_next_int: $ => seq(',',$._avar),

		_print_next_str: $ => seq(';',$._sexpr),
		_print_next_int: $ => seq(';',$._aexpr),
		_tab_next_str: $ => seq(',',$._sexpr),
		_tab_next_int: $ => seq(',',$._aexpr),

		// Identifier rules

		str_name: $ => prec.left(seq(
			choice(...LETTER_SEQ),
			repeat(choice(
				seq($.op_error,'\u00ff'),
				...LETTER_SEQ,
				...NUMBER_SEQ)),
			'$')),
		int_name: $ => prec.left(seq(
			choice(...LETTER_SEQ),
			repeat(choice(
				seq($.op_error,'\u00ff'),
				...LETTER_SEQ,
				...NUMBER_SEQ)))),

		// Literals

		integer: $ => POS_INTEGER,
		string: $ => seq($.quote,repeat(SCHAR),$.unquote)
	}
});
