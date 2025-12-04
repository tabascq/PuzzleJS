puzzleValidators["path-count-from-outer-clues"] = {
    getDescription: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "1");
        var targetFillClass = (puzzleGrid.getOption("data-fill-classes") ?? "").split(" ")[targetFillIndex];
        return(`Outer clues for each row and column provide the count of cells with paths in that row or column.${(targetFillIndex > 0 && targetFillClass) ? ` A cell can be filled with ${targetFillClass} to mark that the cell will eventually contain a path.` : ""}`);
    },
    validate: function(puzzleGrid, param) {
        var checkLine = function(targetFillIndex, check, line, clue) {
            var count = 0;
            var noUnknowns = true;
            var anyTargetFills = false;

            if (!/^\d+$/.test(clue)) return;

            line.forEach(cell => {
                var fillIndex = cell.fillIndex();
                var pathCount = cell.pathDirections().length;

                if (fillIndex == 0 && pathCount == 0) { noUnknowns = false; }
                else if (pathCount > 0) { count++; }
                else if (fillIndex == targetFillIndex) { count++; anyTargetFills = true; }
            });

            var clueNumber = parseInt(clue);
        
            check.pass();
            if (count < clueNumber) { if (noUnknowns) { check.fail(); } else { check.incomplete(); } }
            else if (count > clueNumber) { check.fail(); }
            else if (anyTargetFills) { puzzleGrid.incomplete(); }
        }

        var checkSide = function(sideName, targetFillIndex) {
            if (puzzleGrid.getOption(`data-${sideName}-clues`)) {
                var clues = puzzleGrid.getOption(`data-${sideName}-clues`).split("|");
                var lines = (sideName == "top" || sideName == "bottom") ? puzzleGrid.getColumns() : puzzleGrid.getRows();
                var checks = puzzleGrid.getOuterChecks(sideName);
                for (var i = 0; i < lines.length; i++) {
                    checkLine(targetFillIndex, checks[i], lines[i], clues[i]);
                }
            }
        }

        var targetFillIndex = parseInt(param ?? "1");

        var pathGroups = puzzleGrid.getPathGroups();

        checkSide("top", targetFillIndex);
        checkSide("bottom", targetFillIndex);
        checkSide("left", targetFillIndex);
        checkSide("right", targetFillIndex);
    }
};