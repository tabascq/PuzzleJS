puzzleValidators["spoke-touches-all-cells"] = {
    getDescription: function(puzzleGrid, param) { return("Every cell has a spoke line connected to it."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                if (cell.spokeDirections().length == 0) { cell.incomplete(); }
            });
        });
    }
};