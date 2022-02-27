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
const allow_lower_case = false;
const language_name = allow_lower_case ? 'integerbasic' : 'integerbasiccasesens'

const
	DIGIT = /[0-9]/,
	LETTER = /[A-Za-z]/,
	LETTER_SEQ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
	NUMBER_SEQ = [...'0123456789'],
	INTEGER = /[+-]?[0-9]([0-9 ]*[0-9])?/,
	QUOTE = /"/,
	SPACE = / /,
	SPCHAR = /[+\-*\/^=<>(),.:;%$#?&'@!\[\]{}\\|_`~\x01-\x09\x0b\x0c\x0e-\x1f]/,
	SCHAR = regex_or([LETTER,DIGIT,SPCHAR,SPACE])

// Tree-sitter grammar definition

module.exports = grammar({
	name: language_name,
	extras: $ => [' '],
	// externals: $ => [ $._ext_name ],
	conflicts: $ => [
		[$.statement_then_line,$.statement_then],
		[$.statement_then_line,$.statement_then,$.str_name,$.int_name],
		[$.fcall_peek,$.str_name,$.int_name],
		[$.fcall_rnd,$.str_name,$.int_name],
		[$.fcall_sgn,$.str_name,$.int_name],
		[$.fcall_abs,$.str_name,$.int_name],
		[$.fcall_pdl,$.str_name,$.int_name],
		[$.fcall_lenp,$.str_name,$.int_name],
		[$.fcall_ascp,$.str_name,$.int_name],
		[$.fcall_scrnp,$.str_name,$.int_name],
		[$.statement_text,$.str_name,$.int_name],
		[$.statement_gr,$.str_name,$.int_name],
		[$.statement_call,$.str_name,$.int_name],
		[$.statement_dim_str,$.statement_dim_int],
		[$.statement_dim_str,$.statement_dim_int,$.str_name,$.int_name],
		[$.statement_tab,$.str_name,$.int_name],
		[$.statement_end,$.str_name,$.int_name],
		[$.statement_input_str,$.statement_input_prompt,$.statement_input_int],
		[$.statement_input_str,$.statement_input_prompt,$.statement_input_int,$.str_name,$.int_name],
		[$.statement_for,$.str_name,$.int_name],
		[$.statement_next,$.str_name,$.int_name],
		[$.statement_return,$.str_name,$.int_name],
		[$.statement_gosub,$.str_name,$.int_name],
		[$.statement_rem,$.str_name,$.int_name],
		[$.statement_let,$.str_name,$.int_name],
		[$.statement_goto,$.str_name,$.int_name],
		[$.statement_if,$.str_name,$.int_name],
		[$.statement_print_str,$.statement_print_int],
		[$.statement_print_str,$.statement_print_int,$.str_name,$.int_name],
		[$.statement_poke,$.str_name,$.int_name],
		[$.statement_coloreq,$.str_name,$.int_name],
		[$.statement_plot,$.str_name,$.int_name],
		[$.statement_hlin,$.str_name,$.int_name],
		[$.statement_vlin,$.str_name,$.int_name],
		[$.statement_vtab,$.str_name,$.int_name],
		[$.statement_list_line,$.statement_list],
		[$.statement_list_line,$.statement_list,$.str_name,$.int_name],
		[$.statement_pop,$.str_name,$.int_name],
		[$.statement_nodsp_str,$.statement_nodsp_int],
		[$.statement_nodsp_str,$.statement_nodsp_int,$.str_name,$.int_name],
		[$.statement_notrace,$.str_name,$.int_name],
		[$.statement_dsp_str,$.statement_dsp_int],
		[$.statement_dsp_str,$.statement_dsp_int,$.str_name,$.int_name],
		[$.statement_trace,$.str_name,$.int_name],
		[$.statement_prn,$.str_name,$.int_name],
		[$.statement_inn,$.str_name,$.int_name],
		[$.sep_input_str,$.sep_input_int],
		[$.sep_dim_str,$.sep_dim_int],
		[$.sep_print_str,$.sep_print_int],
		[$.sep_tab_str,$.sep_tab_int],
		[$.str_name,$.int_name],
		[$.statement_print_str,$.statement_print_int,$.statement_print_null,$.str_name,$.int_name],
		[$.open_slice,$.open_str],
		[$.op_not,$.str_name,$.int_name]

	],

	rules: {
		source_file: $ => repeat(choice($.line,$._newline)),

		// Program lines

		line: $ => seq($.linenum,repeat(seq($.statement,$.sep_statement)),$.statement,$._newline),
		linenum: $ => / *[0-9][0-9 ]*/,
		_newline: $ => /\r?\n/,

		// Assign a rule to all tokenized statements and functions

		sep_statement: $ => ':',
		run_line: $ => seq('R','U','N'),
		run: $ => seq('R','U','N'),
		sep_del: $ => ',',
		sep_auto: $ => ',',
		op_plus: $ => '+',
		op_minus: $ => '-',
		op_times: $ => '*',
		op_div: $ => '/',
		op_aeq: $ => '=',
		op_aneq: $ => '#',
		op_gtreq: $ => seq('>','='),
		op_gtr: $ => '>',
		op_lesseq: $ => seq('<','='),
		op_neq: $ => seq('<','>'),
		op_less: $ => '<',
		op_and: $ => /A *N *D/,
		op_or: $ => /O *R/,
		op_mod: $ => /M *O *D/,
		op_pow: $ => '^',
		open_dim_str: $ => '(',
		sep_slice: $ => ',',
		statement_then_line: $ => /T *H *E *N/,
		statement_then: $ => /T *H *E *N/,
		sep_input_str: $ => ',',
		sep_input_int: $ => ',',
		quote: $ => '"',
		unquote: $ => '"',
		open_slice: $ => '(',
		open_int: $ => '(',
		fcall_peek: $ => seq('P','E','E','K'),
		fcall_rnd: $ => seq('R','N','D'),
		fcall_sgn: $ => seq('S','G','N'),
		fcall_abs: $ => seq('A','B','S'),
		fcall_pdl: $ => seq('P','D','L'),
		open_dim_int: $ => '(',
		op_unary_plus: $ => '+',
		op_unary_minus: $ => '-',
		op_not: $ => seq('N','O','T'),
		open_aexpr: $ => '(',
		op_seq: $ => '=',
		op_sneq: $ => '#',
		fcall_lenp: $ => seq('L','E','N','('),
		fcall_ascp: $ => seq('A','S','C','('),
		fcall_scrnp: $ => seq('S','C','R','N','('),
		sep_scrn: $ => ',',
		open_fcall: $ => '(',
		dollar: $ => '$',
		open_str: $ => '(',
		sep_dim_str: $ => ',',
		sep_dim_int: $ => ',',
		sep_print_str: $ => ';',
		sep_print_int: $ => ';',
		sep_print_null: $ => ';',
		sep_tab_str: $ => ',',
		sep_tab_int: $ => ',',
		sep_tab_null: $ => ',',
		statement_text: $ => /T *E *X *T/,
		statement_gr: $ => /G *R/,
		statement_call: $ => seq('C','A','L','L'),
		statement_dim_str: $ => seq('D','I','M'),
		statement_dim_int: $ => seq('D','I','M'),
		statement_tab: $ => seq('T','A','B'),
		statement_end: $ => /E *N *D/,
		statement_input_str: $ => seq('I','N','P','U','T'),
		statement_input_prompt: $ => seq('I','N','P','U','T'),
		statement_input_int: $ => seq('I','N','P','U','T'),
		statement_for: $ => prec(1,seq('F','O','R')),
		op_eq_for: $ => '=',
		op_to: $ => /T *O/,
		op_step: $ => /S *T *E *P/,
		statement_next: $ => seq('N','E','X','T'),
		sep_next: $ => ',',
		statement_return: $ => /R *E *T *U *R *N/,
		statement_gosub: $ => seq('G','O','S','U','B'),
		statement_rem: $ => prec(1,seq('R','E','M')),
		statement_let: $ => seq('L','E','T'),
		statement_goto: $ => seq('G','O','T','O'),
		statement_if: $ => prec(1,seq('I','F')),
		statement_print_str: $ => prec(1,seq('P','R','I','N','T')),
		statement_print_int: $ => prec(1,seq('P','R','I','N','T')),
		statement_print_null: $ => prec(1,seq('P','R','I','N','T')),
		statement_poke: $ => seq('P','O','K','E'),
		sep_poke: $ => ',',
		statement_coloreq: $ => prec(1,seq('C','O','L','O','R','=')),
		statement_plot: $ => seq('P','L','O','T'),
		sep_plot: $ => ',',
		statement_hlin: $ => seq('H','L','I','N'),
		sep_hlin: $ => ',',
		op_hlin_at: $ => /A *T/,
		statement_vlin: $ => seq('V','L','I','N'),
		sep_vlin: $ => ',',
		op_vlin_at: $ => /A *T/,
		statement_vtab: $ => seq('V','T','A','B'),
		op_eq_assign_str: $ => '=',
		op_eq_assign_int: $ => '=',
		close: $ => ')',
		statement_list_line: $ => /L *I *S *T/,
		sep_list: $ => ',',
		statement_list: $ => /L *I *S *T/,
		statement_pop: $ => /P *O *P/,
		statement_nodsp_str: $ => seq('N','O','D','S','P'),
		statement_nodsp_int: $ => seq('N','O','D','S','P'),
		statement_notrace: $ => /N *O *T *R *A *C *E/,
		statement_dsp_str: $ => seq('D','S','P'),
		statement_dsp_int: $ => seq('D','S','P'),
		statement_trace: $ => /T *R *A *C *E/,
		statement_prn: $ => seq('P','R','#'),
		statement_inn: $ => seq('I','N','#'),


		// Statements

		statement: $ => choice(
			seq($.statement_call,$._aexpr),
			seq($.statement_coloreq,$._aexpr),
			seq($.statement_dim_str,$._dim_str,repeat(choice($._dim_next_str,$._dim_next_int))),
			seq($.statement_dim_int,$._dim_int,repeat(choice($._dim_next_str,$._dim_next_int))),
			seq($.statement_dsp_str,$.str_name),
			seq($.statement_dsp_int,$.int_name),
			$.statement_end,
			seq($.statement_for,$.int_name,$.op_eq_for,$._aexpr,$.op_to,$._aexpr,optional(seq($.op_step,$._aexpr))),
			seq($.statement_gosub,$._aexpr),
			seq($.statement_goto,$._aexpr),
			$.statement_gr,
			seq($.statement_hlin,$._aexpr,$.sep_hlin,$._aexpr,$.op_hlin_at,$._aexpr),
			seq($.statement_if,$._aexpr,$.statement_then,$.statement),
			seq($.statement_if,$._aexpr,$.statement_then_line,$._aexpr),
			seq($.statement_inn,$._aexpr),
			seq($.statement_input_prompt,choice($.string,$.str_slice),repeat(choice($._input_next_str,$._input_next_int))),
			seq($.statement_input_str,$._svar,repeat(choice($._input_next_str,$._input_next_int))),
			seq($.statement_input_int,$._avar,repeat(choice($._input_next_str,$._input_next_int))),
			$.statement_list,
			seq($.statement_list_line,seq($.linenum,optional(seq($.sep_list,$.linenum)))),
			seq($.statement_next,seq($.int_name,repeat(seq($.sep_next,$.int_name)))),
			seq($.statement_nodsp_str,$.str_name),
			seq($.statement_nodsp_int,$.int_name),
			$.statement_notrace,
			seq($.statement_plot,$._aexpr,$.sep_plot,$._aexpr),
			seq($.statement_poke,$._aexpr,$.sep_poke,$._aexpr),
			$.statement_pop,
			seq($.statement_prn,$._aexpr),
			$.statement_print_null,
			seq($.statement_print_str,$._sexpr,repeat(choice($.sep_tab_null,$.sep_print_null,$._print_next_str,$._print_next_int,$._tab_next_str,$._tab_next_int))),
			seq($.statement_print_int,$._aexpr,repeat(choice($.sep_tab_null,$.sep_print_null,$._print_next_str,$._print_next_int,$._tab_next_str,$._tab_next_int))),
			seq($.statement_rem,optional($.comment_text)),
			$.statement_return,
			seq($.statement_tab,$._aexpr),
			$.statement_text,
			$.statement_trace,
			seq($.statement_vlin,$._aexpr,$.sep_vlin,$._aexpr,$.op_vlin_at,$._aexpr),
			seq($.statement_vtab,$._aexpr),
			$.assignment_str,
			$.assignment_int
		),

		comment_text: $ => /.+/,

		assignment_str: $ => choice(seq(optional($.statement_let),$._svar,$.op_eq_assign_str,$._sexpr)),
		assignment_int: $ => choice(seq(optional($.statement_let),$._avar,$.op_eq_assign_int,$._aexpr)),

		// Numerical functions (integer BASIC has no string functions)

		fcall: $ => choice(
			seq($.fcall_abs,$.open_fcall,$._aexpr,$.close),
			seq($.fcall_ascp,$._sexpr,$.close),
			seq($.fcall_lenp,$._sexpr,$.close),
			seq($.fcall_pdl,$.open_fcall,$._aexpr,$.close),
			seq($.fcall_peek,$.open_fcall,$._aexpr,$.close),
			seq($.fcall_rnd,$.open_fcall,$._aexpr,$.close),
			seq($.fcall_scrnp,$._aexpr,$.sep_scrn,$._aexpr,$.close),
			seq($.fcall_sgn,$.open_fcall,$._aexpr,$.close)
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
		_parenthesized_aexpr: $ => prec(8,seq($.open_aexpr,$._aexpr,$.close)),
		unary_aexpr: $ => prec(7,choice(seq($.op_unary_plus,$._aexpr),seq($.op_unary_minus,$._aexpr),seq($.op_not,$._aexpr))), // must be 1 line
		binary_aexpr: $ => choice(prec.left(4,seq($._aexpr,choice($.op_plus,$.op_minus),$._aexpr)), // +,- must be on this line
			prec.left(6,seq($._aexpr,$.op_pow,$._aexpr)),
			prec.left(5,seq($._aexpr,choice($.op_times,$.op_div,$.op_mod),$._aexpr)),
			prec.left(3,seq($._aexpr,$._alop,$._aexpr)),
			prec.left(3,seq($._sexpr,$._slop,$._sexpr))
		),
		_alop: $ => choice($.op_aeq,$.op_aneq,$.op_neq,$.op_gtr,$.op_less,$.op_gtreq,$.op_lesseq,$.op_and,$.op_or),
		_slop: $ => choice($.op_seq,$.op_sneq),

		_sexpr: $ => choice(
			$.string,
			$._svar,
			$.str_slice
		),

		// Variables

		_var: $ => choice($._avar,$._svar),
		_avar: $ => choice($.int_name,$.int_array),
		_svar: $ => choice($.str_name,$.str_array),

		str_array: $ => seq($.str_name,$.open_str,$._aexpr,$.close),
		int_array: $ => seq($.int_name,$.open_int,$._aexpr,$.close),
		str_slice: $ => seq($.str_name,$.open_slice,$._aexpr,$.sep_slice,$._aexpr,$.close),

		_dim_str: $ => seq($.str_name,$.open_dim_str,$._aexpr,$.close),
		_dim_int: $ => seq($.int_name,$.open_dim_int,$._aexpr,$.close),
		_dim_next_str: $ => seq($.sep_dim_str,$._dim_str),
		_dim_next_int: $ => seq($.sep_dim_int,$._dim_int),

		_input_next_str: $ => seq($.sep_input_str,$._svar),
		_input_next_int: $ => seq($.sep_input_int,$._avar),

		_print_next_str: $ => seq($.sep_print_str,$._sexpr),
		_print_next_int: $ => seq($.sep_print_int,$._aexpr),
		_tab_next_str: $ => seq($.sep_tab_str,$._sexpr),
		_tab_next_int: $ => seq($.sep_tab_int,$._aexpr),

		// Identifier rules

		str_name: $ => seq(choice(...LETTER_SEQ),prec.right(repeat(choice(...LETTER_SEQ,...NUMBER_SEQ))),$.dollar),
		int_name: $ => seq(choice(...LETTER_SEQ),prec.right(repeat(choice(...LETTER_SEQ,...NUMBER_SEQ)))),
		//str_name: $ => seq(/[A-Z]/,repeat(/[A-Z0-9]/),$.dollar),
		//int_name: $ => seq(/[A-Z]/,repeat(/[A-Z0-9]/)),
		// str_name: $ => seq($._name,$.dollar),
		// int_name: $ => seq($._name),
		// _name: $ => seq($._ext_name,$._ext_name),

		// Literals

		integer: $ => token(prec(1,INTEGER)),
		string: $ => seq($.quote,repeat(SCHAR),$.unquote)
	}
});
