// Validates whether there is a single spoke group that is a segment.

puzzleValidators["spoke-single-segment"] = function(puzzleGrid, param) {
    var spokeGroups = puzzleGrid.getSpokeGroups();

    // if there's only 1 then we're done
    if (spokeGroups.length == 1 && spokeGroups[0].type == "segment") return 1;

    // mark errors on any loops or webs
    var result = 0;
    spokeGroups.forEach(group => {
        if (group.type != "segment") { result = -1; group.cells.forEach(c => { c.fail(); }); } 
    });

    return result;
};