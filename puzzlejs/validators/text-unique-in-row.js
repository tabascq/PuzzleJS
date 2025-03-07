// Validates whether the text characters in a row are all unique. Part of the validation rules of Sudoku, KenKen, etc.
// future: param can be a list of allowable values including duplicates

puzzleValidators["text-unique-in-row"] = function(puzzleGrid, param) {
    var result = 1; // success until proven otherwise

    puzzleGrid.getRows().forEach(row => {
        var alreadySeen = {};
        row.forEach(cell => {
            var value = cell.text();
            if (!value || cell.hasCandidates()) {
                result = Math.min(result, 0); // validation is incomplete at best with blanks/candidates present
            } else {
                if (!alreadySeen[value]) { alreadySeen[value] = cell; } // first time we have seen this value
                else { result = -1; cell.fail(); alreadySeen[value].fail(); } // a duplicate value, fail all the things
            }
        });
    });

    return result;
};