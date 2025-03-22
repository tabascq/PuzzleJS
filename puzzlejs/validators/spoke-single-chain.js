puzzleValidators["spoke-single-chain"] = {
    getDescription: function(puzzleGrid, param) { return("All spokes form a single chain."); },
    validate: function(puzzleGrid, param) {
        var spokeGroups = puzzleGrid.getSpokeGroups();

        // if there's only 1 then we're done
        if (spokeGroups.length == 1 && spokeGroups[0].type == "chain") return;

        // mark errors on any loops or webs, anything else is just incomplete
        spokeGroups.forEach(group => {
            if (group.type != "chain") { group.cells.forEach(c => { c.fail(); }); } 
            else { group.cells.forEach(c => { c.incomplete(); }); } 
        });
    }
};