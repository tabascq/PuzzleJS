puzzleValidators["fill-single-group"] = {
    getDescription: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "1");
        var targetFillClass = (puzzleGrid.getOption("data-fill-classes") ?? "").split(" ")[targetFillIndex] ?? "black";
        return(`All cells with ${targetFillClass} fill are connected.`);
    },
    validate: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "1");
        var fillGroups = puzzleGrid.getFillGroups();
    
        // if there's only 1 then we're done
        var groupCount = 0;
        fillGroups.forEach(group => { if (group.fillIndex == targetFillIndex) { groupCount++; } });
        if (groupCount == 1) { return; }
    
        // mark errors/incomplete on other groups
        fillGroups.forEach(group => {
            if (group.fillIndex == targetFillIndex) {
                if (group.complete) { group.cells.forEach(c => { c.fail(); }); }
                else { group.cells.forEach(c => { c.incomplete(); }); }
            }
        });
    }
};