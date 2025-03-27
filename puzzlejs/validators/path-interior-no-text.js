puzzleValidators["path-interior-no-text"] = {
    getDescription: function(puzzleGrid, param) { return("The cells in the middle of every path chain (i.e. not the endpoints) have no text."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getPathGroups().forEach(group => {
            if (group.type != "chain") { group.cells.forEach(cell => { cell.fail(); }); }                                                      // no loops or webs

            // fail if any intermediate cells have text
            for (var c = 1; c < group.cells.length - 1; c++) { if (group.cells[c].text()) { group.cells[c].fail(); }}
        });
    }
};