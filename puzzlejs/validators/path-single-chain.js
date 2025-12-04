puzzleValidators["path-single-chain"] = {
    getDescription: function(puzzleGrid, param) { return("All paths form a single chain."); },
    validate: function(puzzleGrid, param) {
        var pathGroups = puzzleGrid.getPathGroups();

        // if there's only 1 then we're done
        if (pathGroups.length == 1 && pathGroups[0].type == "chain") return;

        // at best incomplete
        puzzleGrid.incomplete();

        // mark errors on any loops or webs
        pathGroups.forEach(group => {
            if (group.type != "chain") { group.cells.forEach(c => { c.fail(); }); } 
            else { group.cells.forEach(c => { c.incomplete(); }); } 
        });
    }
};