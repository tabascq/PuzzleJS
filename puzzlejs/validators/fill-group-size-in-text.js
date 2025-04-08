puzzleValidators["fill-group-size-in-text"] = {
    getDescription: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "2");
        var targetFillClass = (puzzleGrid.getOption("data-fill-classes") ?? "").split(" ")[targetFillIndex] ?? "white";
        return(`The size of every contiguous ${targetFillClass} fill group equals the text of a single number within the group.`);
    },
    validate: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "2");

        puzzleGrid.getFillGroups().forEach(group => {
            if (group.fillIndex != targetFillIndex) return;

            // count the number of target numbers in the group
            var targetCount;
            var numberOfTargetCounts = 0;
            group.cells.forEach(cell => {
                var text = cell.text();
                if (/^[0-9]+$/.test(text)) { numberOfTargetCounts++; targetCount = parseInt(text); }
            });

            // assess the validity of the group based on whether it's complete (complete: no adjacent unknowns)
            var groupFail = false;
            if (numberOfTargetCounts != 1) { groupFail = true; }                                  // no single target - never good
            else if (group.cells.length > targetCount) { groupFail = true; }                      // group too large for a single target - never good
            else if (!group.complete) { group.cells.forEach(cell => { cell.incomplete(); }); }    // group is incomplete
            else if (group.cells.length < targetCount) { groupFail = true; }                      // group too small for a single target - bad if complete

            // Fail this group if it's bad
            if (groupFail) { group.cells.forEach(cell => { cell.fail(); }); }
        });
    }
};