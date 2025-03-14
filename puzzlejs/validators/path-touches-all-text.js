// Validates whether a path is a single line connecting two equal texts.

puzzleValidators["path-touches-all-text"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            if (cell.text() && cell.text() != "1" && cell.pathDirections().length == 0) { result = -1; } // has text but no path
        });
    });

    return result;
};