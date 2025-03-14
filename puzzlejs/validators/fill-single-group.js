// Validates whether there is a single group with the target fill.
// param denotes the index of the fill (default: 1).

puzzleValidators["fill-single-group"] = function(puzzleGrid, param) {
    var targetFillIndex = parseInt(param ?? "1");
    var fillGroups = puzzleGrid.getFillGroups();

    // if there's only 1 then we're done
    var groupCount = 0;
    fillGroups.forEach(group => { if (group.fillIndex == targetFillIndex) { groupCount++; } });
    if (groupCount == 1) { return 1; }

    // mark errors on any complete groups
    var completeGroupCount = 0;
    fillGroups.forEach(group => { if (group.fillIndex == targetFillIndex && group.complete) {
        completeGroupCount++;
        group.cells.forEach(c => { c.fail(); });
    } });

    // If any groups were in fact complete that's an error
    return (completeGroupCount > 0) ? -1 : 0;
};