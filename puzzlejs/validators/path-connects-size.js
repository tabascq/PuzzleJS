puzzleValidators["path-connects-size"] = {
    getDescription: function(puzzleGrid, param) { return("The cells at the endpoints of every path chain have text that is the same as the length of the path."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getPathGroups().forEach(group => {
            var groupFail = false;
            var firstText = group.cells[0].text();
            var lastText = group.cells[group.cells.length - 1].text();

            if (group.type != "chain") { groupFail = true; }                                                // no loops or webs
            else if (!firstText || !lastText) { group.cells.forEach(cell => { cell.incomplete(); }) }       // inconclusive if either end has no text yet
            else if (parseInt(firstText) != group.cells.length) { groupFail = true; }                       // text has to match size if present
            else if (parseInt(lastText) != group.cells.length) { groupFail = true; }                        // text has to match size if present

            if (groupFail) { group.cells.forEach(cell => { cell.fail(); }); }
        });
    }
};