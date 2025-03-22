puzzleValidators["path-connects-equal-text"] = {
    getDescription: function(puzzleGrid, param) { return("The cells at the endpoints of every path chain have the same text."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getPathGroups().forEach(group => {
            var groupFail = false;
            var firstText = group.cells[0].text();
            var lastText = group.cells[group.cells.length - 1].text();

            if (group.type != "chain") { groupFail = true; }                                                // no loops or webs
            else if (!firstText || !lastText) { group.cells.forEach(cell => { cell.incomplete(); }) }       // inconclusive if either end has no text yet
            else if (firstText != lastText) { groupFail = true; }                                           // text has to match

            if (groupFail) { group.cells.forEach(cell => { cell.fail(); }); }
        });
    }
};