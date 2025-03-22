puzzleValidators["text-math-in-region"] = {
    getDescription: function(puzzleGrid, param) { return("The cells in every heavy-bordered region form the number provided by the region's clue, using the operator provided (or any operator +-x/ if none is provided)."); },
    validate: function(puzzleGrid, param) {
        // apply all numbers but the first to the first number, using the provided operator, see if the result matches the target
        var testOperator = function(numbers, operator, target) {
            var operationResult = numbers[0];
            for (var i = 1; i <numbers.length; i++) {
                switch(operator) {
                    case "+": operationResult += numbers[i]; break;
                    case "-": operationResult -= numbers[i]; break;
                    case "x": operationResult *= numbers[i]; break;
                    case "/": operationResult /= numbers[i]; break;
                }
            }
            return (operationResult == target);
        }

        puzzleGrid.getRegions().forEach(region => {
            var numbers = [];
            var target;
            var targetOperator;

            region.forEach(cell => {
                // get the cell contents
                var value = cell.text();
                if (!value || cell.hasCandidates() || !/^[0-9]*$/.test(value)) { cell.incomplete(); return; }
                numbers.push(parseInt(value));

                // look for a target clue and optional operator
                var clue = cell.clueLabel();
                if (clue) {
                    target = parseInt(clue);
                    var op = clue[clue.length - 1];
                    if (op == "+" || op == "-" || op == "x" || op == "/") { targetOperator = op; }
                }
            });

            // if the region is full and has a target number, see if the math works
            if (numbers.length == region.length && target != undefined) {
                numbers.sort((a, b) => b - a); // reverse sort all numbers

                var anyMatch = false;
                if (targetOperator == "+" || targetOperator == undefined) { anyMatch |= testOperator(numbers, "+", target); }
                if (targetOperator == "-" || targetOperator == undefined) { anyMatch |= testOperator(numbers, "-", target); }
                if (targetOperator == "x" || targetOperator == undefined) { anyMatch |= testOperator(numbers, "x", target); }
                if (targetOperator == "/" || targetOperator == undefined) { anyMatch |= testOperator(numbers, "/", target); }

                // fail if the math doesn't work
                if (!anyMatch) { region.forEach(cell => { cell.fail(); }); }
            }
        });
    }
};