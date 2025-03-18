// Validates whether a path is a single line connecting two equal texts.

puzzleValidators["spoke-sequentially-numbered-segments"] = function(puzzleGrid, param) {
    var result = 1;

    puzzleGrid.getSpokeGroups().forEach(group => {
        // fail all non-segments
        if (group.type != "segment") { result = -1; return; }

        // fail anywhere that the difference between texts is not the difference in path indices
        var lastIndex = null;
        var lastNumber = null;
        group.cells.forEach((cell, index) => {
            var text = cell.text();
            if (text && !cell.hasCandidates() && /^[0-9]*$/.test(value)) {
                var number = parseInt(text);

                // fail any range between two numbers that is of the wrong length
                if (lastNumber != null && Math.abs(number - lastNumber) != (index - lastIndex)) {
                    result = -1;
                    for (var i = lastIndex; i <= index; i++) { group.cells[i].fail();}
                }

                lastIndex = index;
                lastNumber = number;
            }
        });

        // inconclusive if the path cannot start with 1 at one end or the other
        if (lastNumber != null && lastIndex + 1 != lastNumber && (group.cells.length - lastIndex != lastNumber)) { result = Math.min(result, 0); }
    });

    return result;
};