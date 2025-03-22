puzzleValidators["path-touches-all-cells"] = {
    getDescription: function(puzzleGrid, param) { return("Every cell has a path line connected to it."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                if (cell.pathDirections().length == 0) { cell.incomplete(); }
            });
        });
    }
};