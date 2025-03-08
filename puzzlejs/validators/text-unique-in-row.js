// Validates whether the text characters in a row are all unique. Part of the validation rules of Sudoku, KenKen, etc.

puzzleValidators["text-unique-in-row"] = function(puzzleGrid, param) {
    var result = 1; // success until proven otherwise

    // build the set of what's allowed, which can contain duplicates for single character cell entries
    var allowed = {};
    for (var c of puzzleGrid.getOption("data-text-characters")) { if (allowed[c]) { allowed[c]++; } else { allowed[c] = 1; } };

    puzzleGrid.getRows().forEach(row => {
        // build the set of what's used for this row
        var used = {};
        row.forEach(cell => {
            var value = cell.text();
            if (!value || cell.hasCandidates()) {
                result = Math.min(result, 0); // validation is incomplete at best with blanks/candidates present
            } else { if (used[value]) { used[value]++; } else { used[value] = 1; } }
        });
    
        // now fail anything that was used too much
        for (const [key, value] of Object.entries(used)) {
            if (!allowed[key] || value > allowed[key]) {
                result = -1; row.forEach(cell => { if (cell.text() == key) { cell.fail(); }});
            }
        }
    });

    return result;
};