puzzleValidators["fill-no-2x2"] = {
    getDescription: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "1");
        var targetFillClass = (puzzleGrid.getOption("data-fill-classes") ?? "").split(" ")[targetFillIndex] ?? "black";
        return(`There are no 2x2 areas with entirely ${targetFillClass} fill.`);
    },
    validate: function(puzzleGrid, param) {
        var targetFillIndex = param ?? 1;
        var rows = puzzleGrid.getRows();
    
        for (var r = 0; r < rows.length - 1; r++) {
            for (var c = 0; c < rows[r].length - 1; c++) {
                if (rows[r][c].fillIndex() == targetFillIndex && 
                    rows[r][c + 1].fillIndex() == targetFillIndex && 
                    rows[r + 1][c] && rows[r + 1][c].fillIndex() == targetFillIndex && 
                    rows[r + 1][c + 1] && rows[r + 1][c + 1].fillIndex() == targetFillIndex) {
                    rows[r][c].fail();
                    rows[r][c + 1].fail();
                    rows[r + 1][c].fail();
                    rows[r + 1][c + 1].fail();
                }
            }
        }
    }
};