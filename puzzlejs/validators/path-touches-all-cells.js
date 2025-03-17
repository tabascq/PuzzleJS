// Validates whether every cell has path connected to it.

puzzleValidators["path-touches-all-cells"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            if (cell.pathDirections().length == 0) { result = -1; }
        });
    });

    return result;
};