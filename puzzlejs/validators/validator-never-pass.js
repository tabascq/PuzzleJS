// Never passes, never fails.
// Useful if a puzzle wants *some* failure-marking logic to run even if not *all* logic is provided by validators.

puzzleValidators["validator-never-pass"] = function(puzzleGrid, param) {
    return 0;
};