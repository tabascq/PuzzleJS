puzzleValidators["path-touches-all-text"] = {
    getDescription: function(puzzleGrid, param) { return(`Every cell containing text ${param ? `(except "${param}") ` : ``}has a path line connected to it.`); },
    validate: function(puzzleGrid, param) {
        puzzleGrid.getRows().forEach(row => {
            row.forEach(cell => {
                if (cell.text() && cell.text() != param && cell.pathDirections().length == 0) { cell.incomplete(); }
            });
        });
    }
};