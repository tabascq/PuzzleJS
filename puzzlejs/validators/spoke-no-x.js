// Validates whether no spokes cross each other (i.e. diagonally).

puzzleValidators["spoke-no-x"] = function(puzzleGrid, param) {
    var result = 1;

    var rows = puzzleGrid.getRows();
    rows.forEach((row, r) => {
        for (var c = 0; c < row.length - 1; c++) {
            if (row[c].spokeDirections().includes("bottom-right") && row[c + 1].spokeDirections().includes("bottom-left")) {
                result = -1;
                row[c].fail();
                row[c + 1].fail();
                rows[r + 1][c].fail();
                rows[r + 1][c + 1].fail();
            }
        }
    });

    return result;
};