// Validates whether the size of a group of the target fill equals the text within the group.
// param denotes the index of the fill (default: 2).

puzzleValidators["fill-group-size-in-text"] = function(puzzleGrid, param) {
    var targetFillIndex = parseInt(param ?? "2");
    var result = 1;

    puzzleGrid.getFillGroups().forEach(group => {
        if (group.fillIndex != targetFillIndex) return;

        // count the number of target numbers in the group
        var targetCount;
        var numberOfTargetCounts = 0;
        group.cells.forEach(cell => {
            var text = cell.text();
            if (text) { numberOfTargetCounts++; targetCount = parseInt(text); }
        });

        // assess the validity of the group based on whether it's complete (complete: no adjacent unknowns)
        var groupResult;
        if (numberOfTargetCounts != 1) { groupResult = -1; }                                    // no single target - never good
        else if (group.cells.length > targetCount) { groupResult = -1; }                        // group too large for a single target - never good
        else if (group.cells.length < targetCount) { groupResult = (group.complete ? -1 : 0); } // group too small for a single target - bad if complete
        else { groupResult = (group.complete ? 1 : 0); }                                        // group just right - good if complete

        // Fail this group if it's bad and update the result
        if (groupResult == -1) { group.cells.forEach(cell => { cell.fail(); }); }
        result = Math.min(groupResult, result);
    });

    return result;
};