puzzleValidators["spoke-no-x"] = {
    getDescription: function(puzzleGrid, param) { return("No spoke lines cross each other (i.e. diagonally)."); },
    validate: function(puzzleGrid, param) {
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
    }
};