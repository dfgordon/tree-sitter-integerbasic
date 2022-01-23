// References:
// [1] Apple II Reference Manual, Apple Computer Inc., Cupertino, 1978
// [2] Apple Programmer's Handbook, Howard W. Sams & Co., Inc., Indianapolis, 1984

// grammar-src.js is for human editing
// grammar.js is the actual grammar (created by token_processor.py)

// The term TOKEN may be used in two senses herein: Tokens recognized by the Apple II ROM,
// vs. tokens defined by Tree-sitter.  The token_processor.py program is
// concerned with the former.

// This grammar follows Ref. 1 closely, but with a mapping.
// Mapping (this grammar -> Ref. 1)
// * sexpr,string,svar -> str$
// * aexpr -> expr
// * expr -> expression
// * avar -> var
// To handle string syntax it is found helpful to add these:
// * str_scalar, str_array, str_slice -> str$
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

const
	DIGIT = /[0-9]/,
	LETTER = /[A-Za-z]/,
	INTEGER = /[+-]?[0-9]([0-9 ]*[0-9])?/,
	QUOTE = /"/,
	SPACE = / /,
	SPCHAR = /[+\-*\/^=<>(),.:;%$#?&'@!\[\]{}\\|_`~\x01-\x09\x0b\x0c\x0e-\x1f]/,
	SCHAR = regex_or([LETTER,DIGIT,SPCHAR,SPACE])

// Tree-sitter grammar definition

module.exports = grammar({
	name: 'integerbasic',
	extras: $ => [' '],
	//externals: $ => [ $._ext_name ],
	// conflicts: $ => [
	// 	[$.not_tok,$.notrace_tok],
	// 	[$._avar,$.fcall]
	// ],

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
			seq('DIM',$._dim_item,repeat(seq(',',$._dim_item))),
			seq('DSP',$.int_scalar),
			'END',
			seq('FOR',$._avar,'=',$._aexpr,'TO',$._aexpr,optional(seq('STEP',$._aexpr))),
			seq('GOSUB',$._aexpr),
			seq('GOTO',$._aexpr),
			'GR',
			seq('HLIN',$._aexpr,',',$._aexpr,'AT',$._aexpr),
			seq('IF',$._expr,'THEN',$.statement),
			seq('IF',$._expr,'THEN',$._aexpr),
			seq('IN#',$._aexpr),
			seq('INPUT',optional(seq($.string,',')),$._var,repeat(seq(',',$._var))),
			seq('LIST',optional(seq($.linenum,optional(seq(',',$.linenum))))),
			seq('NEXT',seq($._avar,repeat(seq(',',$._avar)))),
			seq('NODSP',$.int_scalar),
			'NOTRACE',
			seq('PLOT',$._aexpr,',',$._aexpr),
			seq('POKE',$._aexpr,',',$._aexpr),
			'POP',
			seq('PR#',$._aexpr),
			seq('PRINT',repeat(seq($._expr,choice(',',';'))),optional($._expr)),
			seq('REM',optional($.comment_text)),
			'RETURN',
			seq('TAB',$._aexpr),
			'TEXT',
			'TRACE',
			seq('VLIN',$._aexpr,',',$._aexpr,'AT',$._aexpr),
			seq('VTAB',$._aexpr),
			$.assignment
		),

		comment_text: $ => /.+/,

		assignment: $ => prec(1,choice(
			seq(optional('LET'),$._avar,'=',$._aexpr),
			seq(optional('LET'),$._svar,'=',$._sexpr)
		)),

		// Numerical functions (integer BASIC has no string functions)
		// We have put left parenthesis in all, even though the A2ROM does this only
		// for ASC, LEN, and SCRN.

		fcall: $ => choice(
			seq('ABS(',$._aexpr,')'),
			seq('ASC(',$._sexpr,')'),
			seq('LEN(',$._sexpr,')'),
			seq('PDL(',$._aexpr,')'),
			seq('PEEK(',$._aexpr,')'),
			seq('RND(',$._aexpr,')'),
			seq('SCRN(',$._aexpr,',',$._aexpr,')'),
			seq('SGN(',$._aexpr,')')
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
		unary_aexpr: $ => prec(7,choice(
			seq('+',$._aexpr),
			seq('-',$._aexpr),
			seq('NOT',$._aexpr)
		)),
		binary_aexpr: $ => choice(
			prec.left(6,seq($._aexpr,'^',$._aexpr)),
			prec.left(5,seq($._aexpr,choice('*','/','MOD'),$._aexpr)),
			prec.left(4,seq($._aexpr,choice('+','-'),$._aexpr)),
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
		_avar: $ => choice($.int_scalar,$.int_array),
		_svar: $ => choice($.str_scalar,$.str_array),

		int_scalar: $ => $._name,
		int_array: $ => seq($._name,$.subscript),
		str_scalar: $ => seq($._name,'$'),
		str_array: $ => seq($._name,'$',$.subscript),
		str_slice: $ => seq($._name,'$',$.slice),

		subscript: $ => seq('(',$._aexpr,')'),
		slice: $ => seq('(',$._aexpr,',',$._aexpr,')'),
		_dim_item: $ => choice($.int_array,$.str_array),

		// Identifier rules

		_name: $ => seq(/[A-Z]/,repeat(/[A-Z0-9]/)),

		// Literals

		integer: $ => token(prec(1,INTEGER)),
		string: $ => token(prec(1,seq(QUOTE,repeat(SCHAR),QUOTE)))
	}
});
