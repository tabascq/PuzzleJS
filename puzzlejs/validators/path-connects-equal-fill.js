puzzleValidators["path-connects-equal-fill"] = {
    getDescription: function(puzzleGrid, param) { return("The cells at the endpoints of every path chain have the same fill."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getPathGroups().forEach(group => {
            var groupFail = false;
            var firstFill = group.cells[0].fillIndex();
            var lastFill = group.cells[group.cells.length - 1].fillIndex();

            if (group.type != "chain") { groupFail = true; }                                                // no loops or webs
            else if (!firstFill || !lastFill) { group.cells.forEach(cell => { cell.incomplete(); }) }       // inconclusive if either end has default fill
            else if (firstFill != lastFill) { groupFail = true; }                                           // fill has to match

            if (groupFail) { group.cells.forEach(cell => { cell.fail(); }); }
        });
    }
};