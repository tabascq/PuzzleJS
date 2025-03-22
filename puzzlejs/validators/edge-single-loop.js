puzzleValidators["edge-single-loop"] = {
    getDescription: function(puzzleGrid, param) { return("All edges form a single loop."); },
    validate: function(puzzleGrid, param) {
        var edgeGroups = puzzleGrid.getEdgeGroups();

        // if there's only 1 loop then we're done
        if (edgeGroups.length == 1 && edgeGroups[0].type == "loop") return;

        // mark errors on any loops or webs, anything else is just incomplete
        edgeGroups.forEach(group => {
            if (group.type != "chain") { group.vertices.forEach(v => { v.fail(); }); } 
            else { group.vertices.forEach(v => { v.incomplete(); }); } 
        });
    }
};