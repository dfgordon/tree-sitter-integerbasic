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

		load_tok: $ => /L *O *A *D/,
		save_tok: $ => /S *A *V *E/,
		con_tok: $ => /C *O *N/,
		run_tok: $ => /R *U *N/,
		run_tok: $ => /R *U *N/,
		del_tok: $ => /D *E *L/,
		new_tok: $ => /N *E *W/,
		clr_tok: $ => /C *L *R/,
		auto_tok: $ => /A *U *T *O/,
		man_tok: $ => /M *A *N/,
		himemcolon_tok: $ => /H *I *M *E *M *:/,
		lomemcolon_tok: $ => /L *O *M *E *M *:/,
		plus_tok: $ => '+',
		minus_tok: $ => '-',
		times_tok: $ => '*',
		div_tok: $ => '/',
		eq_tok: $ => '=',
		n_tok: $ => '#',
		gtreq_tok: $ => /> *=/,
		gtr_tok: $ => '>',
		lesseq_tok: $ => /< *=/,
		lessgtr_tok: $ => /< *>/,
		less_tok: $ => '<',
		and_tok: $ => /A *N *D/,
		or_tok: $ => /O *R/,
		mod_tok: $ => /M *O *D/,
		pow_tok: $ => '^',
		then_tok: $ => /T *H *E *N/,
		then_tok: $ => /T *H *E *N/,
		peekp_tok: $ => /P *E *E *K *\(/,
		rndp_tok: $ => /R *N *D *\(/,
		sgnp_tok: $ => /S *G *N *\(/,
		absp_tok: $ => /A *B *S *\(/,
		pdlp_tok: $ => /P *D *L *\(/,
		plus_tok: $ => '+',
		minus_tok: $ => '-',
		not_tok: $ => /N *O *T/,
		eq_tok: $ => '=',
		n_tok: $ => '#',
		lenp_tok: $ => /L *E *N *\(/,
		ascp_tok: $ => /A *S *C *\(/,
		scrnp_tok: $ => /S *C *R *N *\(/,
		text_tok: $ => /T *E *X *T/,
		gr_tok: $ => /G *R/,
		call_tok: $ => /C *A *L *L/,
		dim_tok: $ => /D *I *M/,
		dim_tok: $ => /D *I *M/,
		tab_tok: $ => /T *A *B/,
		end_tok: $ => /E *N *D/,
		input_tok: $ => /I *N *P *U *T/,
		input_tok: $ => /I *N *P *U *T/,
		input_tok: $ => /I *N *P *U *T/,
		for_tok: $ => /F *O *R/,
		eq_tok: $ => '=',
		to_tok: $ => /T *O/,
		step_tok: $ => /S *T *E *P/,
		next_tok: $ => /N *E *X *T/,
		return_tok: $ => /R *E *T *U *R *N/,
		gosub_tok: $ => /G *O *S *U *B/,
		rem_tok: $ => /R *E *M/,
		let_tok: $ => /L *E *T/,
		goto_tok: $ => /G *O *T *O/,
		if_tok: $ => /I *F/,
		print_tok: $ => /P *R *I *N *T/,
		print_tok: $ => /P *R *I *N *T/,
		print_tok: $ => /P *R *I *N *T/,
		poke_tok: $ => /P *O *K *E/,
		coloreq_tok: $ => /C *O *L *O *R *=/,
		plot_tok: $ => /P *L *O *T/,
		hlin_tok: $ => /H *L *I *N/,
		at_tok: $ => /A *T/,
		vlin_tok: $ => /V *L *I *N/,
		at_tok: $ => /A *T/,
		vtab_tok: $ => /V *T *A *B/,
		eq_tok: $ => '=',
		eq_tok: $ => '=',
		list_tok: $ => /L *I *S *T/,
		list_tok: $ => /L *I *S *T/,
		pop_tok: $ => /P *O *P/,
		nodsp_tok: $ => /N *O *D *S *P/,
		nodsp_tok: $ => /N *O *D *S *P/,
		notrace_tok: $ => /N *O *T *R *A *C *E/,
		dsp_tok: $ => /D *S *P/,
		dsp_tok: $ => /D *S *P/,
		trace_tok: $ => /T *R *A *C *E/,
		prn_tok: $ => /P *R *#/,
		inn_tok: $ => /I *N *#/,


		// Statements

		statement: $ => choice(
			seq($.call_tok,$._aexpr),
			seq($.coloreq_tok,$._aexpr),
			seq($.dim_tok,$._dim_item,repeat(seq(',',$._dim_item))),
			seq($.dsp_tok,$.int_scalar),
			$.end_tok,
			seq($.for_tok,$._avar,$.eq_tok,$._aexpr,$.to_tok,$._aexpr,optional(seq($.step_tok,$._aexpr))),
			seq($.gosub_tok,$._aexpr),
			seq($.goto_tok,$._aexpr),
			$.gr_tok,
			seq($.hlin_tok,$._aexpr,',',$._aexpr,$.at_tok,$._aexpr),
			seq($.if_tok,$._expr,$.then_tok,$.statement),
			seq($.if_tok,$._expr,$.then_tok,$._aexpr),
			seq($.inn_tok,$._aexpr),
			seq($.input_tok,optional(seq($.string,',')),$._var,repeat(seq(',',$._var))),
			seq($.list_tok,optional(seq($.linenum,optional(seq(',',$.linenum))))),
			seq($.next_tok,seq($._avar,repeat(seq(',',$._avar)))),
			seq($.nodsp_tok,$.int_scalar),
			$.notrace_tok,
			seq($.plot_tok,$._aexpr,',',$._aexpr),
			seq($.poke_tok,$._aexpr,',',$._aexpr),
			$.pop_tok,
			seq($.prn_tok,$._aexpr),
			seq($.print_tok,repeat(seq($._expr,choice(',',';'))),optional($._expr)),
			seq($.rem_tok,optional($.comment_text)),
			$.return_tok,
			seq($.tab_tok,$._aexpr),
			$.text_tok,
			$.trace_tok,
			seq($.vlin_tok,$._aexpr,',',$._aexpr,$.at_tok,$._aexpr),
			seq($.vtab_tok,$._aexpr),
			$.assignment
		),

		comment_text: $ => /.+/,

		assignment: $ => prec(1,choice(
			seq(optional($.let_tok),$._avar,$.eq_tok,$._aexpr),
			seq(optional($.let_tok),$._svar,$.eq_tok,$._sexpr)
		)),

		// Numerical functions (integer BASIC has no string functions)
		// We have put left parenthesis in all, even though the A2ROM does this only
		// for ASC, LEN, and SCRN.

		fcall: $ => choice(
			seq($.absp_tok,$._aexpr,')'),
			seq($.ascp_tok,$._sexpr,')'),
			seq($.lenp_tok,$._sexpr,')'),
			seq($.pdlp_tok,$._aexpr,')'),
			seq($.peekp_tok,$._aexpr,')'),
			seq($.rndp_tok,$._aexpr,')'),
			seq($.scrnp_tok,$._aexpr,',',$._aexpr,')'),
			seq($.sgnp_tok,$._aexpr,')')
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
			seq($.plus_tok,$._aexpr),
			seq($.minus_tok,$._aexpr),
			seq($.not_tok,$._aexpr)
		)),
		binary_aexpr: $ => choice(
			prec.left(6,seq($._aexpr,$.pow_tok,$._aexpr)),
			prec.left(5,seq($._aexpr,choice($.times_tok,$.div_tok,$.mod_tok),$._aexpr)),
			prec.left(4,seq($._aexpr,choice($.plus_tok,$.minus_tok),$._aexpr)),
			prec.left(3,seq($._aexpr,$._alop,$._aexpr)),
			prec.left(3,seq($._sexpr,$._slop,$._sexpr))
		),
		_alop: $ => choice($.eq_tok,$.n_tok,$.lessgtr_tok,$.gtr_tok,$.less_tok,$.gtreq_tok,$.lesseq_tok,$.and_tok,$.or_tok),
		_slop: $ => choice($.eq_tok,$.n_tok),

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
