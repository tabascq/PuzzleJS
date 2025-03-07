// Validates whether the text characters in a region (a box or irregular shape bounded by edges) obey the math indicated by an inner clue within the region.
// Part of the validation rules of KenKen.
// Supports "TomTom" rules where regions larger than 2 can use - and /.

puzzleValidators["text-math-in-region"] = function(puzzleGrid, param) {
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

    var result = 1;

    puzzleGrid.getRegions().forEach(region => {
        var numbers = [];
        var target;
        var targetOperator;

        region.forEach(cell => {
            // get the cell contents
            var value = cell.text();
            if (!value || cell.hasCandidates()) { result = Math.min(0, result); return; } // validation is incomplete at best with blanks/candidates present
            numbers.push(parseInt(value));

            // look for a target clue and optional operator
            var clue = cell.clueLabel();
            if (clue) {
                target = parseInt(clue);
                if (clue.lastChar == "+" || clue.lastChar == "-" || clue.lastChar == "x" || clue.lastChar == "/") { targetOperator = clue; }
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
            if (!anyMatch) {
                result = -1;
                region.forEach(cell => { cell.fail(); });
            }
        }
    });

    return result;
};