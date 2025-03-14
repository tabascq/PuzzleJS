// Validates whether there are contiguous spans of fills denoted by outer clues, like you would see in a nonogram.
// Currently only works for 2-color nonograms, but will be expanded in the future.

puzzleValidators["fill-spans-from-outer-clues"] = function(puzzleGrid, param) {
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

        var result = 1;
        if (currentTotal < clueNumberTotal) { result = noUnknowns ? -1 : 0; }
        else if (currentTotal > clueNumberTotal || counts.length != clueNumbers.length) { result = -1; }
        else { for (var i = 0; i < counts.length; i++) { if (counts[i] != clueNumbers[i]) { result = -1; } } }

        if (check && result == 1) { check.pass(); }
        if (check && result == -1) { check.fail(); }
        return result;
    }

    var checkSide = function(sideName, targetFillIndex) {
        var result = 1;
        if (puzzleGrid.getOption(`data-${sideName}-clues`)) {
            var clues = puzzleGrid.getOption(`data-${sideName}-clues`).split("|");
            var lines = (sideName == "top" || sideName == "bottom") ? puzzleGrid.getColumns() : puzzleGrid.getRows();
            var checks = puzzleGrid.getOuterChecks(sideName);
            for (var i = 0; i < lines.length; i++) {
                result = Math.min(result, checkLine(targetFillIndex, checks ? checks[i] : null, lines[i], clues[i]));
            }
        }

        return result;
    }

    var result = 1;
    
    // TODO: someday acquire targetFillIndex from param (if present) so different directions can target different colors
    result = Math.min(result, checkSide("top", 1));
    result = Math.min(result, checkSide("bottom", 1));
    result = Math.min(result, checkSide("left", 1));
    result = Math.min(result, checkSide("right", 1));
    return result;
};