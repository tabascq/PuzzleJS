// register some puzzle modes; a mode is just a set of options,
// so the options do not need to all be learned and manually applied to each puzzle.
// a puzzle can have multiple modes and multiple custom options.
var puzzleModes = {};
puzzleModes["default"] = {
    "data-allowed-characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "data-text-shift-key": "rebus",
    "data-fill-classes": null,
    "data-clue-numbers": null,
    "data-shape": null,
    "data-solution": null,
    "data-custom-borders": null,
    "data-unselectable-givens": false,
    "data-extracts": null
};

puzzleModes["linear"] = {
    "data-unselectable-givens": true
}

puzzleModes["crossword"] = {
    "data-clue-numbers": "auto"
};

puzzleModes["notext"] = {
    "data-allowed-characters": ""
}

puzzleModes["minidoku"] = {
    "data-allowed-characters": "1234",
    "data-custom-borders": "5959|6a6a|5959|6a6a",
    "data-text-shift-key": "candidates"
};

// Go through all puzzles and give them a PuzzleEntry object
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".puzzle-entry").forEach((p) => { new PuzzleEntry(p); });
});

function UndoManager() {
    this.undoStack = [];
    this.redoStack = [];

    // undo/redo support
    this.redoUnit = function(unit) {
        var extractId = unit.elem.getAttribute("data-extract-id");
        var elems = extractId ? document.querySelectorAll("." + extractId) : [unit.elem];

        elems.forEach(elem =>{
            if (unit.adds) { unit.adds.forEach((a) => { elem.classList.add(a); }); }
            if (unit.removes) { unit.removes.forEach((a) => { elem.classList.remove(a); }); }
            if (unit.children) { unit.children.forEach((c) => { this.redoUnit(c) }); }
            if (unit.oldValue || unit.newValue) { elem.value = unit.newValue; }
        });
    }

    this.undoUnit = function(unit) {
        var extractId = unit.elem.getAttribute("data-extract-id");
        var elems = extractId ? document.querySelectorAll("." + extractId) : [unit.elem];

        elems.forEach(elem =>{
            if (unit.adds) { unit.adds.forEach((a) => { elem.classList.remove(a); }); }
            if (unit.removes) { unit.removes.forEach((a) => { elem.classList.add(a); }); }
            if (unit.children) { unit.children.forEach((c) => { this.undoUnit(c) }); }
            if (unit.oldValue || unit.newValue) { elem.value = unit.oldValue; }
        });
    }

    this.undo = function() {
        if (this.undoStack.length == 0) { return; }

        var unit = this.undoStack.pop();
        this.undoUnit(unit);
        this.redoStack.push(unit);
        this.rebuildTransientState();
    }

    this.redo = function() {
        if (this.redoStack.length == 0) { return; }

        var unit = this.redoStack.pop();
        this.redoUnit(unit);
        this.undoStack.push(unit);
        this.rebuildTransientState();
    }

    this.modify = function(elem, adds, removes, newValue) {
        var trueAdds = [];
        var trueRemoves = [];

        adds.forEach((a) => { if (a && !elem.classList.contains(a)) { trueAdds.push(a); }});
        removes.forEach((r) => { if (r && elem.classList.contains(r)) { trueRemoves.push(r); }});

        if (trueAdds.length == 0 && trueRemoves.length == 0 && newValue == null) { return; }

        var unit = { "elem": elem };
        if (trueAdds.length > 0) { unit.adds = trueAdds; }
        if (trueRemoves.length > 0) { unit.removes = trueRemoves; }
        if (newValue != null) { unit.oldValue = elem.value; unit.newValue = newValue; }

        this.redoUnit(unit);
        this.undoStack.push(unit);
        this.redoStack = [];
        this.rebuildTransientState();
    }

    this.rebuildTransientState = function() {
        // TODO: raise event for any state that a special case chooses to update
    }
}

function PuzzleEntry(p) {
    this.container = p;
    p.setAttribute("data-puzzle-entry", this);

    // Assign all options by applying all properties from all modes. Modes specified earliest in data-mode get precedence.
    var modes = p.getAttribute("data-mode");
    modes = modes ? modes.split(" ") : [];
    modes.push("default"); 
    modes.reverse();

    this.options = {};
    modes.forEach(m => { for (const [key, value] of Object.entries(puzzleModes[m])) { this.options[key] = value; } });

    // Finally, any explicitly-specified attributes win.
    for (const [key, value] of Object.entries(this.options)) {
        var localValue = this.container.getAttribute(key);
        if (localValue) { this.options[key] = localValue; }
    }

    this.dx = 1;
    this.dy = 0;
    this.mousedown = false;
    this.currentFill = null;

    this.fillClasses = this.options["data-fill-classes"];
    if (this.fillClasses) { this.fillClasses = this.fillClasses.split(" "); }

    this.locateScope = function(scopeId) {
        var ancestor = this.container;

        while (ancestor) {
            if (ancestor.getAttribute(scopeId) != undefined) { return ancestor; }
            ancestor = ancestor.parentElement;
        }

        return this.container;
    }

    var undoScope = this.locateScope("data-undo-scope");
    this.undoManager = undoScope.puzzleUndoManager;
    if (!this.undoManager) { this.undoManager = new UndoManager(); undoScope.puzzleUndoManager = this.undoManager; }

    // keyboard support
    this.move = function(elem, drow, dcol) {
        var td = elem.parentElement;
        var col = dcol + Array.prototype.indexOf.call(td.parentElement.children, td);
        var row = drow + Array.prototype.indexOf.call(td.parentElement.parentElement.children, td.parentElement);

        while (true) {
            var td = this.container.querySelector("tr:nth-child(" + (row + 1) + ") td:nth-child(" + (col + 1) + ")");

            if (!td) {
                return false;
            }

            var input = td.querySelector("input");

            if (input && !td.classList.contains("unselectable")) {
                this.dx = Math.abs(dcol);
                this.dy = Math.abs(drow);
                input.focus();
                return true;
            }

            col += dcol;
            row += drow;
        }
    }

    this.cycleClasses = function(td, classes, reverse) {
        if (!classes) { return ""; }

        var start = reverse ? classes.length - 1 : 0;
        var end = reverse ? -1 : classes.length;
        var delta = reverse ? -1 : 1;

        for (var i = start; i != end; i += delta) {
            if (td.classList.contains(classes[i])) {
                var cls = classes[(i + classes.length + delta) % classes.length];
                this.setClassInCycle(td, classes, cls);
                return cls;
            }
        }

        return "";
    }

    this.setClassInCycle = function(td, classes, cls) {
        if (classes && !td.classList.contains(cls)) { this.undoManager.modify(td, [cls], classes); }
    }

    this.keyDown = function(e) {
        if (e.keyCode == 9) return;

        e.preventDefault();
        if (this.options["data-solution"]) { return; }
        
        if (e.ctrlKey && e.keyCode == 90) { this.undoManager.undo(); } // Ctrl-Z
        else if (e.ctrlKey && e.keyCode == 89) { this.undoManager.redo(); } // Ctrl-Y
        else if (e.keyCode == 37) { this.move(e.target, 0, -1); } // left
        else if (e.keyCode == 38) { this.move(e.target, -1, 0); } // up
        else if (e.keyCode == 39) { this.move(e.target, 0, 1); } // right
        else if (e.keyCode == 40) { this.move(e.target, 1, 0); } // down
        else if (e.keyCode == 32) { // space
            this.dx = 1 - this.dx; this.dy = 1 - this.dy;
            this.cycleClasses(e.target.parentElement, this.fillClasses, e.shiftKey);
        } else if (e.keyCode == 8 || e.keyCode == 46) { // backspace/delete
            this.setText(e.target, [], [], "");
            this.move(e.target, -this.dy, -this.dx);
        } else {
            var ch = String.fromCharCode(e.keyCode);

            if (this.options["data-allowed-characters"].includes(ch)) {
                if (e.shiftKey) {
                    var val = this.getText(e.target);
                    if (this.options["data-text-shift-key"] == "rebus" || !val.includes(ch)) { val = val + ch; }
                    else { val = val.replace(ch, ""); }
    
                    this.setText(e.target, ["small-text"], [], val);
                } else {
                    this.setText(e.target, [], ["small-text"], ch);
                    this.move(e.target, this.dy, this.dx);
                }
            }
        }
    }

    this.setText = function(target, adds, removes, text) {
        if (target.value != text && !target.parentElement.classList.contains("given")) { this.undoManager.modify(target, adds, removes, text); }
    }

    this.getText = function(target) {
        return target.value;
    }

    this.mouseDown = function(e) {
        this.mousedown = true;
        this.currentFill = this.cycleClasses(e.currentTarget, this.fillClasses, e.which != 1 || this.fShift);
    }

    this.mouseEnter = function(e) {
        if (this.mousedown) {
            this.setClassInCycle(e.currentTarget, this.fillClasses, this.currentFill);
            e.currentTarget.querySelector("input").focus();
        }
    }

    var clueNumbers = this.options["data-clue-numbers"];
    if (clueNumbers && clueNumbers != "auto") { clueNumbers = clueNumbers.split(" "); }

    var shape = this.options["data-shape"].split("|");
    var solution = this.options["data-solution"];
    if (solution) { solution = solution.split("|"); }
    var borders = this.options["data-custom-borders"];
    if (borders) { borders = borders.split("|"); }
    var extracts = this.options["data-extracts"];
    if (extracts) { extracts = extracts.split(" "); }
    var unselectableGivens = this.options["data-unselectable-givens"];

    var table = document.createElement("table");
    var clueNum = 0;
    var extractNum = 0;

    for (var r = 0; r < shape.length; r++) {
        var tr = document.createElement("tr");

        for (var c = 0; c < shape[r].length; c++) {
            var td = document.createElement("td");
            var shapeCh = shape[r][c];
            
            var cell = document.createElement("input");
            cell.setAttribute("type", "text");

            if (shapeCh == '.') {
                if (solution) { cell.value = solution[r][c]; }
            }
            else if (shapeCh == '#') {
                td.classList.add("extract");
                if (solution) { cell.value = solution[r][c]; }
                if (extracts) {
                    var code = extracts[extractNum++];
                    var id = "extract-id-" + code;
                    cell.setAttribute("data-extract-id", id);
                    cell.classList.add(id);

                    var extractCode = document.createElement("div");
                    extractCode.classList.add("extract-code");
                    extractCode.innerText = code;
                    td.appendChild(extractCode);    
                }
            }
            else if (shapeCh == '@') {
                td.classList.add("black-cell");
                if (unselectableGivens) { td.classList.add("unselectable"); }
            }
            else {
                cell.value = shapeCh;
                td.classList.add("given");
                if (unselectableGivens) { td.classList.add("unselectable"); }
            }

            if (!td.classList.contains("unselectable")) {
                cell.addEventListener("keydown",  e => { this.keyDown(e); });

                if (this.fillClasses) {
                    td.addEventListener("mousedown",  e => { this.mouseDown(e); });
                    td.addEventListener("mouseenter",  e => { this.mouseEnter(e); });
                }
                td.addEventListener("contextmenu",  e => { e.preventDefault(); });
            }

            td.appendChild(cell);

            if (borders) {
                var b = parseInt(borders[r][c], 16);
                if (b & 1) { td.classList.add("border-top"); }
                if (b & 2) { td.classList.add("border-bottom"); }
                if (b & 4) { td.classList.add("border-left"); }
                if (b & 8) { td.classList.add("border-right"); }
            }

            if (clueNumbers && shape[r][c] != '@' && (
                ((r == 0 || shape[r-1][c] == '@') && r < shape.length - 1 && shape[r+1][c] != '@') || // block/edge above, letter below
                ((c == 0 || shape[r][c-1] == '@') && c < shape[r].length - 1 && shape[r][c+1] != '@') // block/edge left, letter right
            )) {
                var clue = document.createElement("div");
                clue.classList.add("clue");
                clue.innerText = (clueNumbers == "auto") ? ++clueNum : clueNumbers[clueNum++];
                td.appendChild(clue);
            }

            if (this.fillClasses) { td.classList.add(this.fillClasses[0]); }

            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    this.container.appendChild(table);

    window.addEventListener("mouseup", e => {this.mousedown = false; });
}