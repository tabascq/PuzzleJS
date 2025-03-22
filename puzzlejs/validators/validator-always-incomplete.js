puzzleValidators["validator-always-incomplete"] = {
    getDescription: function(puzzleGrid, param) { return("Always incomplete, likely because some logic rules for this puzzle have not been implemented."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.incomplete();
    }
};