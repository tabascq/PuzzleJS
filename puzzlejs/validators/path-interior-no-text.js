// Validates whether a path is a single line connecting two equal texts.

puzzleValidators["path-interior-no-text"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getPathGroups().forEach(group => {
        var groupResult = 1;

        if (group.type != "segment") { groupResult = -1; }                                                      // no loops or webs

        // fail if any intermediate cells have text
        for (var c = 1; c < group.cells.length - 1; c++) { if (group.cells[c].text()) { groupResult = -1; }}

        if (groupResult == -1) { group.cells.forEach(cell => { cell.fail(); }); }
        result = Math.min(groupResult, result);
    });

    return result;
};