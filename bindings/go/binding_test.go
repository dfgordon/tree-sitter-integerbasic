package tree_sitter_integerbasic_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-integerbasic"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_integerbasic.Language())
	if language == nil {
		t.Errorf("Error loading Integerbasic grammar")
	}
}
