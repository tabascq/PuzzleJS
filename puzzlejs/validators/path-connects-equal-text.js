// Validates whether a path is a single line connecting two equal texts.

puzzleValidators["path-connects-equal-text"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getPathGroups().forEach(group => {
        var groupResult = 1;

        if (group.type != "segment") { groupResult = -1; }                                                      // no loops or webs
        else if (!group.cells[0].text() || !group.cells[group.cells.length - 1].text()) { groupResult = 0; }    // inconclusive if either end has no text yet
        else { groupResult = (group.cells[0].text() == group.cells[group.cells.length - 1].text()) ? 1 : -1; }  // text has to match if present

        if (groupResult == -1) { group.cells.forEach(cell => { cell.fail(); }); }
        result = Math.min(groupResult, result);
    });

    return result;
};