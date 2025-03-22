puzzleValidators["spoke-sequentially-numbered-chains"] = {
    getDescription: function(puzzleGrid, param) { return("Each spoke chain connects cells with the numbers 1, 2, 3, ...."); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getSpokeGroups().forEach(group => {
            // fail all non-chains
            if (group.type != "chain") { group.cells.forEach(c => { c.fail(); }); return; }

            // fail anywhere that the difference between texts is not the difference in path indices
            var lastIndex = null;
            var lastNumber = null;
            group.cells.forEach((cell, index) => {
                var text = cell.text();
                if (text && !cell.hasCandidates() && /^[0-9]*$/.test(text)) {
                    var number = parseInt(text);

                    // fail any range between two numbers that is of the wrong length
                    if (lastNumber != null && Math.abs(number - lastNumber) != (index - lastIndex)) {
                        for (var i = lastIndex; i <= index; i++) { group.cells[i].fail();}
                    }

                    lastIndex = index;
                    lastNumber = number;
                }
            });

            // inconclusive if the path cannot start with 1 at one end or the other
            if (lastNumber != null && lastIndex + 1 != lastNumber && (group.cells.length - lastIndex != lastNumber)) {
                group.cells[0].incomplete();
                group.cells[group.cells.length - 1].incomplete();
            }
        });
    }
};