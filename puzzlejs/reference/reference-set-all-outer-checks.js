// Trivial validator just to illustrate how things work. See the validators folder for more realistic examples.

puzzleValidators["reference-set-all-outer-checks"] = {
    getDescription: function(puzzleGrid, param) { return(`Trivial validator for use in the PuzzleJS reference. Just sets all outer checks to ${param}.`); },
    validate: function(puzzleGrid, param) {
        var checkSide = function(sideName, param) {
            if (puzzleGrid.getOption(`data-${sideName}-clues`)) {
                puzzleGrid.getOuterChecks(sideName).forEach(check => { if (param == "pass") { check.pass(); } else { check.fail(); } });
            }
        }

        checkSide("top", param);
        checkSide("bottom", param);
        checkSide("left", param);
        checkSide("right", param);
    }
}