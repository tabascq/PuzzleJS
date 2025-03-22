puzzleValidators["spoke-count-in-text"] = {
    getDescription: function(puzzleGrid, param) { return("Every cell with a number in its text has a count of spokes that matches the number."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                if (cell.text()) {
                    var count = parseInt(cell.text());
                    var directions = cell.spokeDirections().length;
                    if (directions > count) { cell.fail(); }
                    else if (directions < count) { cell.incomplete(); }
                }
            });
        });
    }
}