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
		[$.com_load,$.str_name,$.int_name],
		[$.com_save,$.str_name,$.int_name],
		[$.com_con,$.str_name,$.int_name],
		[$.com_run_line,$.com_run,$.str_name,$.int_name],
		[$.com_del,$.str_name,$.int_name],
		[$.com_new,$.str_name,$.int_name],
		[$.com_clr,$.str_name,$.int_name],
		[$.com_man,$.str_name,$.int_name],
		[$.com_himem,$.str_name,$.int_name],
		[$.com_lomem,$.str_name,$.int_name],
		[$.statement_then_line,$.statement_then],
		[$.fcall_peek,$.str_name,$.int_name],
		[$.fcall_rnd,$.str_name,$.int_name],
		[$.fcall_sgn,$.str_name,$.int_name],
		[$.fcall_abs,$.str_name,$.int_name],
		[$.fcall_pdl,$.str_name,$.int_name],
		[$.fcall_lenp,$.str_name,$.int_name],
		[$.fcall_ascp,$.str_name,$.int_name],
		[$.fcall_scrnp,$.str_name,$.int_name],
		[$.statement_call,$.str_name,$.int_name],
		[$.statement_dim_str,$.statement_dim_int],
		[$.statement_dim_str,$.statement_dim_int,$.str_name,$.int_name],
		[$.statement_tab,$.str_name,$.int_name],
		[$.statement_input_str,$.statement_input_prompt,$.statement_input_int],
		[$.statement_input_str,$.statement_input_prompt,$.statement_input_int,$.str_name,$.int_name],
		[$.statement_next,$.str_name,$.int_name],
		[$.statement_gosub,$.str_name,$.int_name],
		[$.statement_let,$.str_name,$.int_name],
		[$.statement_if,$.str_name,$.int_name],
		[$.statement_print_str,$.statement_print_int],
		[$.statement_poke,$.str_name,$.int_name],
		[$.statement_plot,$.str_name,$.int_name],
		[$.statement_hlin,$.str_name,$.int_name],
		[$.statement_vlin,$.str_name,$.int_name],
		[$.statement_vtab,$.str_name,$.int_name],
		[$.statement_nodsp_str,$.statement_nodsp_int],
		[$.statement_nodsp_str,$.statement_nodsp_int,$.str_name,$.int_name],
		[$.statement_dsp_str,$.statement_dsp_int],
		[$.statement_dsp_str,$.statement_dsp_int,$.str_name,$.int_name],
		[$.sep_input_str,$.sep_input_int],
		[$.sep_dim_str,$.sep_dim_int],
		[$.sep_print_str,$.sep_print_int],
		[$.sep_tab_str,$.sep_tab_int],
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

		sep_statement: $ => seq(':'),
		com_load: $ => seq(choice('L','l'),choice('O','o'),choice('A','a'),choice('D','d')),
		com_save: $ => seq(choice('S','s'),choice('A','a'),choice('V','v'),choice('E','e')),
		com_con: $ => seq(choice('C','c'),choice('O','o'),choice('N','n')),
		com_run_line: $ => seq(choice('R','r'),choice('U','u'),choice('N','n')),
		com_run: $ => seq(choice('R','r'),choice('U','u'),choice('N','n')),
		com_del: $ => seq(choice('D','d'),choice('E','e'),choice('L','l')),
		sep_del: $ => seq(','),
		com_new: $ => seq(choice('N','n'),choice('E','e'),choice('W','w')),
		com_clr: $ => seq(choice('C','c'),choice('L','l'),choice('R','r')),
		com_auto: $ => /[Aa] *[Uu] *[Tt] *[Oo]/,
		sep_auto: $ => seq(','),
		com_man: $ => seq(choice('M','m'),choice('A','a'),choice('N','n')),
		com_himem: $ => seq(choice('H','h'),choice('I','i'),choice('M','m'),choice('E','e'),choice('M','m'),':'),
		com_lomem: $ => seq(choice('L','l'),choice('O','o'),choice('M','m'),choice('E','e'),choice('M','m'),':'),
		op_plus: $ => seq('+'),
		op_minus: $ => seq('-'),
		op_times: $ => seq('*'),
		op_div: $ => seq('/'),
		op_aeq: $ => seq('='),
		op_aneq: $ => seq('#'),
		op_gtreq: $ => seq('>','='),
		op_gtr: $ => seq('>'),
		op_lesseq: $ => seq('<','='),
		op_neq: $ => seq('<','>'),
		op_less: $ => seq('<'),
		op_and: $ => /[Aa] *[Nn] *[Dd]/,
		op_or: $ => /[Oo] *[Rr]/,
		op_mod: $ => /[Mm] *[Oo] *[Dd]/,
		op_pow: $ => seq('^'),
		open_dim_str: $ => seq('('),
		sep_slice: $ => seq(','),
		statement_then_line: $ => /[Tt] *[Hh] *[Ee] *[Nn]/,
		statement_then: $ => /[Tt] *[Hh] *[Ee] *[Nn]/,
		sep_input_str: $ => seq(','),
		sep_input_int: $ => seq(','),
		quote: $ => seq('"'),
		unquote: $ => seq('"'),
		open_slice: $ => seq('('),
		open_int: $ => seq('('),
		fcall_peek: $ => seq(choice('P','p'),choice('E','e'),choice('E','e'),choice('K','k')),
		fcall_rnd: $ => seq(choice('R','r'),choice('N','n'),choice('D','d')),
		fcall_sgn: $ => seq(choice('S','s'),choice('G','g'),choice('N','n')),
		fcall_abs: $ => seq(choice('A','a'),choice('B','b'),choice('S','s')),
		fcall_pdl: $ => seq(choice('P','p'),choice('D','d'),choice('L','l')),
		open_dim_int: $ => seq('('),
		op_unary_plus: $ => seq('+'),
		op_unary_minus: $ => seq('-'),
		op_not: $ => seq(choice('N','n'),choice('O','o'),choice('T','t')),
		open_aexpr: $ => seq('('),
		op_seq: $ => seq('='),
		op_sneq: $ => seq('#'),
		fcall_lenp: $ => seq(choice('L','l'),choice('E','e'),choice('N','n'),'('),
		fcall_ascp: $ => seq(choice('A','a'),choice('S','s'),choice('C','c'),'('),
		fcall_scrnp: $ => seq(choice('S','s'),choice('C','c'),choice('R','r'),choice('N','n'),'('),
		sep_scrn: $ => seq(','),
		open_fcall: $ => seq('('),
		dollar: $ => seq('$'),
		open_str: $ => seq('('),
		sep_dim_str: $ => seq(','),
		sep_dim_int: $ => seq(','),
		sep_print_str: $ => seq(';'),
		sep_print_int: $ => seq(';'),
		sep_print_null: $ => seq(';'),
		sep_tab_str: $ => seq(','),
		sep_tab_int: $ => seq(','),
		sep_tab_null: $ => seq(','),
		statement_text: $ => /[Tt] *[Ee] *[Xx] *[Tt]/,
		statement_gr: $ => /[Gg] *[Rr]/,
		statement_call: $ => seq(choice('C','c'),choice('A','a'),choice('L','l'),choice('L','l')),
		statement_dim_str: $ => seq(choice('D','d'),choice('I','i'),choice('M','m')),
		statement_dim_int: $ => seq(choice('D','d'),choice('I','i'),choice('M','m')),
		statement_tab: $ => seq(choice('T','t'),choice('A','a'),choice('B','b')),
		statement_end: $ => /[Ee] *[Nn] *[Dd]/,
		statement_input_str: $ => seq(choice('I','i'),choice('N','n'),choice('P','p'),choice('U','u'),choice('T','t')),
		statement_input_prompt: $ => seq(choice('I','i'),choice('N','n'),choice('P','p'),choice('U','u'),choice('T','t')),
		statement_input_int: $ => seq(choice('I','i'),choice('N','n'),choice('P','p'),choice('U','u'),choice('T','t')),
		statement_for: $ => /[Ff] *[Oo] *[Rr]/,
		op_eq_for: $ => seq('='),
		op_to: $ => /[Tt] *[Oo]/,
		op_step: $ => /[Ss] *[Tt] *[Ee] *[Pp]/,
		statement_next: $ => seq(choice('N','n'),choice('E','e'),choice('X','x'),choice('T','t')),
		sep_next: $ => seq(','),
		statement_return: $ => /[Rr] *[Ee] *[Tt] *[Uu] *[Rr] *[Nn]/,
		statement_gosub: $ => seq(choice('G','g'),choice('O','o'),choice('S','s'),choice('U','u'),choice('B','b')),
		statement_rem: $ => prec(1,seq(choice('R','r'),choice('E','e'),choice('M','m'))),
		statement_let: $ => seq(choice('L','l'),choice('E','e'),choice('T','t')),
		statement_goto: $ => /[Gg] *[Oo] *[Tt] *[Oo]/,
		statement_if: $ => seq(choice('I','i'),choice('F','f')),
		statement_print_str: $ => prec(1,seq(choice('P','p'),choice('R','r'),choice('I','i'),choice('N','n'),choice('T','t'))),
		statement_print_int: $ => prec(1,seq(choice('P','p'),choice('R','r'),choice('I','i'),choice('N','n'),choice('T','t'))),
		statement_print_null: $ => prec(1,seq(choice('P','p'),choice('R','r'),choice('I','i'),choice('N','n'),choice('T','t'))),
		statement_poke: $ => seq(choice('P','p'),choice('O','o'),choice('K','k'),choice('E','e')),
		sep_poke: $ => seq(','),
		statement_coloreq: $ => prec(1,seq(choice('C','c'),choice('O','o'),choice('L','l'),choice('O','o'),choice('R','r'),'=')),
		statement_plot: $ => seq(choice('P','p'),choice('L','l'),choice('O','o'),choice('T','t')),
		sep_plot: $ => seq(','),
		statement_hlin: $ => seq(choice('H','h'),choice('L','l'),choice('I','i'),choice('N','n')),
		sep_hlin: $ => seq(','),
		op_hlin_at: $ => /[Aa] *[Tt]/,
		statement_vlin: $ => seq(choice('V','v'),choice('L','l'),choice('I','i'),choice('N','n')),
		sep_vlin: $ => seq(','),
		op_vlin_at: $ => /[Aa] *[Tt]/,
		statement_vtab: $ => seq(choice('V','v'),choice('T','t'),choice('A','a'),choice('B','b')),
		op_eq_assign_str: $ => seq('='),
		op_eq_assign_int: $ => seq('='),
		close: $ => seq(')'),
		statement_list_line: $ => /[Ll] *[Ii] *[Ss] *[Tt]/,
		sep_list: $ => seq(','),
		statement_list: $ => /[Ll] *[Ii] *[Ss] *[Tt]/,
		statement_pop: $ => /[Pp] *[Oo] *[Pp]/,
		statement_nodsp_str: $ => seq(choice('N','n'),choice('O','o'),choice('D','d'),choice('S','s'),choice('P','p')),
		statement_nodsp_int: $ => seq(choice('N','n'),choice('O','o'),choice('D','d'),choice('S','s'),choice('P','p')),
		statement_notrace: $ => /[Nn] *[Oo] *[Tt] *[Rr] *[Aa] *[Cc] *[Ee]/,
		statement_dsp_str: $ => seq(choice('D','d'),choice('S','s'),choice('P','p')),
		statement_dsp_int: $ => seq(choice('D','d'),choice('S','s'),choice('P','p')),
		statement_trace: $ => /[Tt] *[Rr] *[Aa] *[Cc] *[Ee]/,
		statement_prn: $ => seq(choice('P','p'),choice('R','r'),'#'),
		statement_inn: $ => seq(choice('I','i'),choice('N','n'),'#'),

		op_error: $ => prec(1,choice(
			/[Aa] *[Nn] *[Dd]/,
			/[Gg] *[Oo] *[Tt] *[Oo]/,
			/[Mm] *[Oo] *[Dd]/,
			/[Tt] *[Hh] *[Ee] *[Nn]/,
			/[Tt] *[Oo]/,
			/[Oo] *[Rr]/,
			/[Aa] *[Uu] *[Tt] *[Oo]/,
			seq(choice('A','a'),choice('T','t')),
			/[Ff] *[Oo] *[Rr]/,
			/[Ss] *[Tt] *[Ee] *[Pp]/,
		)),

		// Statements, immediate mode commands are included, but will get special prefix `com`.

		statement: $ => choice(
			$.com_load,
			$.com_save,
			$.com_con,
			$.com_run,
			seq($.com_run_line,$.linenum),
			seq($.com_del, $.linenum, optional(seq($.sep_del, $.linenum))),
			$.com_new,
			$.com_clr,
			seq($.com_auto, $.linenum, optional(seq($.sep_auto, $.linenum))),
			$.com_man,
			seq($.com_himem, $._aexpr),
			seq($.com_lomem, $._aexpr),
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

		assignment_str: $ => seq(optional($.statement_let),$._svar,$.op_eq_assign_str,$._sexpr),
		assignment_int: $ => seq(optional($.statement_let),$._avar,$.op_eq_assign_int,$._aexpr),

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

		str_name: $ => prec.left(seq(
			choice(...LETTER_SEQ),
			repeat(choice(
				seq($.op_error,'\u00ff'),
				...LETTER_SEQ,
				...NUMBER_SEQ)),
			$.dollar)),
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
