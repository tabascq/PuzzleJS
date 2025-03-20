// Validates whether every cell with a number in text has that number of edges.
// param is a condition indicating when to be strict about error reporting; if strict, undercounts are failures.

puzzleValidators["edge-count-in-text"] = function(puzzleGrid, param) {
    var result = 1;
    var strict = false;

    if (param == "single-loop") {
        var edgeGroups = puzzleGrid.getEdgeGroups();

        // if there's only 1 then we're done
        if (edgeGroups.length == 1 && edgeGroups[0].type == "loop") { strict = true; }
    }

    puzzleGrid.getRows().forEach(row => {
        row.forEach(cell => {
            var text = cell.text();
            if (/^[0-9]+$/.test(text)) {
                var count = parseInt(text);
                var edges = cell.edgeDirections();
                if (edges.length > count) { result = -1; cell.fail(); }
                else if (edges.length < count) {
                    result = Math.min(result, 0);
                    if (strict) { result = -1; cell.fail(); }
                }
            }
        });
    });

    return result;
};