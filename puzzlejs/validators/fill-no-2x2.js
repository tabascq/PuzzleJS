// Validates whether there are no 2x2 regions with the target fill.
// param denotes the index of the fill (default: 1).

puzzleValidators["fill-no-2x2"] = function(puzzleGrid, param) {
    var result = 1;

    var targetFillIndex = param ?? 1;
    var rows = puzzleGrid.getRows();

    for (var r = 0; r < rows.length - 1; r++) {
        for (var c = 0; c < rows[r].length - 1; c++) {
            if (rows[r][c].fillIndex() == targetFillIndex && 
                rows[r][c + 1].fillIndex() == targetFillIndex && 
                rows[r + 1][c] && rows[r + 1][c].fillIndex() == targetFillIndex && 
                rows[r + 1][c + 1] && rows[r + 1][c + 1].fillIndex() == targetFillIndex) {
                result = -1;
                rows[r][c].fail();
                rows[r][c + 1].fail();
                rows[r + 1][c].fail();
                rows[r + 1][c + 1].fail();
            }
        }
    }
    return result;
};