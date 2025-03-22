puzzleValidators["spoke-touches-all-text"] = {
    getDescription: function(puzzleGrid, param) { return(`Every cell containing text ${param ? `(except &ldquo;${param}&rdquo;)` : ""}has a spoke line connected to it.`); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                if (cell.text() && cell.text() != param && cell.spokeDirections().length == 0) { cell.incomplete(); }
            });
        });
    }
};