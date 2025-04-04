// Currently only works for 2-color nonograms, but will be expanded in the future.

puzzleValidators["fill-spans-from-outer-clues"] = {
    getDescription: function(puzzleGrid, param) {
        var targetFillIndex = parseInt(param ?? "1");
        var targetFillClass = (puzzleGrid.getOption("data-fill-classes") ?? "").split(" ")[targetFillIndex] ?? "black";
        return(`Outer clues for each row and column describe contiguous spans of ${targetFillClass} fill in that row or column.`);
    },
    validate: function(puzzleGrid, param) {
        var checkLine = function(targetFillIndex, check, line, clues) {
            var counts = [];
            var lastIndex = 0;
            var noUnknowns = true;

            line.forEach(cell => {
                var fillIndex = cell.fillIndex();

                if (fillIndex == 0) { noUnknowns = false;}
                else if (fillIndex == targetFillIndex) { if (fillIndex == lastIndex) { counts[counts.length-1]++; } else { counts.push(1); } }

                lastIndex = fillIndex;
            });

            var clueNumbers = clues ? clues.split(" ") : [];
            var currentTotal = 0;
            var clueNumberTotal = 0;
        
            for (var i = 0; i < counts.length; i++) { currentTotal += counts[i]; }
            for (var i = 0; i < clueNumbers.length; i++) { clueNumbers[i] = parseInt(clueNumbers[i]); clueNumberTotal += clueNumbers[i]; }
        
            if (counts.length == 0) { counts.push(0); }
            if (clueNumbers.length == 0) { clueNumbers.push(0); }

            check.pass();
            if (currentTotal < clueNumberTotal) { if (noUnknowns) { check.fail(); } else { check.incomplete(); } }
            else if (currentTotal > clueNumberTotal || counts.length != clueNumbers.length) { check.fail(); }
            else { for (var i = 0; i < counts.length; i++) { if (counts[i] != clueNumbers[i]) { check.fail(); } } }
        }

        var checkSide = function(sideName, targetFillIndex) {
            var result = 1;
            if (puzzleGrid.getOption(`data-${sideName}-clues`)) {
                var clues = puzzleGrid.getOption(`data-${sideName}-clues`).split("|");
                var lines = (sideName == "top" || sideName == "bottom") ? puzzleGrid.getColumns() : puzzleGrid.getRows();
                var checks = puzzleGrid.getOuterChecks(sideName);
                for (var i = 0; i < lines.length; i++) {
                    checkLine(targetFillIndex, checks ? checks[i] : null, lines[i], clues[i]);
                }
            }
        }

        var targetFillIndex = parseInt(param ?? "1");
        checkSide("top", targetFillIndex);
        checkSide("bottom", targetFillIndex);
        checkSide("left", targetFillIndex);
        checkSide("right", targetFillIndex);
    }
};