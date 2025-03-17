// Validates whether every cell containing text has spoke connected to it.

puzzleValidators["spoke-touches-all-text"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            if (cell.text() && cell.text() != "1" && cell.spokeDirections().length == 0) { result = -1; } // has text but no spoke
        });
    });

    return result;
};