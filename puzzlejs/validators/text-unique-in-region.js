puzzleValidators["text-unique-in-region"] = {
    getDescription: function(puzzleGrid, param) { return("Every cell has text that is unique within its heavy-bordered region."); },
    validate: function(puzzleGrid, param) {
        // build the set of what's allowed, which can contain duplicates for single character cell entries
        var allowed = {};
        for (var c of puzzleGrid.getOption("data-text-characters")) { if (allowed[c]) { allowed[c]++; } else { allowed[c] = 1; } };

        puzzleGrid.getRegions().forEach(region => {
            // build the set of what's used for this region
            var used = {};
            region.forEach(cell => {
                var value = cell.text();
                if (!value || cell.hasCandidates()) { cell.incomplete(); }
                else if (used[value]) { used[value]++; }
                else { used[value] = 1; }
            });
        
            // now fail anything that was used too much
            for (const [key, value] of Object.entries(used)) {
                if (!allowed[key] || value > allowed[key]) {
                    region.forEach(cell => { if (cell.text() == key) { cell.fail(); }});
                }
            }
        });
    }
};