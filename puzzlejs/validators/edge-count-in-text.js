// param is a condition indicating when to be strict about error reporting; if strict, undercounts are failures.

puzzleValidators["edge-count-in-text"] = {
    getDescription: function(puzzleGrid, param) { return("For every cell with a number, that number equals the number of edges touching the cell."); },
    validate: function(puzzleGrid, param) {
        var strict = false;

        if (param == "single-loop") {
            var edgeGroups = puzzleGrid.getEdgeGroups();
            if (edgeGroups.length == 1 && edgeGroups[0].type == "loop") { strict = true; }
        }

        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                var text = cell.text();
                if (/^[0-9]+$/.test(text)) {
                    var count = parseInt(text);
                    var edges = cell.edgeDirections();
                    if (edges.length > count) { cell.fail(); }
                    else if (edges.length < count) {
                        if (strict) { cell.fail(); } else { cell.incomplete(); }
                    }
                }
            });
        });
    }
};