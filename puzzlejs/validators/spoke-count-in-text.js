// Validates whether every cell containing text has a count of spokes that matches.

puzzleValidators["spoke-count-in-text"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            if (cell.text()) {
                var count = parseInt(cell.text());
                var directions = cell.spokeDirections().length;
                if (directions > count) { result = -1; cell.fail(); }
                else if (directions < count) { result = Math.min(result, 0); }
            }
        });
    });

    return result;
};