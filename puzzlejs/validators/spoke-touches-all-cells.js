// Validates whether every cell has spoke connected to it.

puzzleValidators["spoke-touches-all-cells"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            if (cell.spokeDirections().length == 0) { result = -1; }
        });
    });

    return result;
};