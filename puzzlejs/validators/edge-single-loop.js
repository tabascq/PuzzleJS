// Validates whether there is a single edge group that is a loop.

puzzleValidators["edge-single-loop"] = function(puzzleGrid, param) {
    var edgeGroups = puzzleGrid.getEdgeGroups();

    // if there's only 1 then we're done
    if (edgeGroups.length == 1 && edgeGroups[0].type == "loop") return 1;

    // mark errors on any loops or webs
    var result = 0;
    edgeGroups.forEach(group => {
        if (group.type != "segment") { result = -1; /* group.vertices.forEach(v => { v.fail(); });*/ } 
    });

    return result;
};