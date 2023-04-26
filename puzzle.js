// register some puzzle modes; a mode is just a set of options,
// so the options do not need to all be learned and manually applied to each puzzle.
// a puzzle can have multiple modes and multiple custom options.
var puzzleModes = {};
puzzleModes["default"] = {
    "data-allowed-characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "data-text-shift-key": "rebus",
    "data-fill-classes": null,
    "data-fills": null,
    "data-fill-cycle": true,
    "data-clue-numbers": null,
    "data-shape": null,
    "data-shape-replacements": null,
    "data-solution": null,
    "data-custom-borders": null,
    "data-unselectable-givens": false,
    "data-paths": null,
    "data-path-style": "straight",
    "data-drag-paint-fill": true,
    "data-drag-draw-path": false,
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

puzzleModes["pathpaint"] = {
    "data-path-style": "curved",
    "data-drag-paint-fill": true,
    "data-drag-draw-path": true,
    "data-fill-cycle": false
}

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

    if (this.container.firstChild && this.container.firstChild.nodeType === Node.TEXT_NODE) {
        var json = JSON.parse(this.container.firstChild.textContent);
        for (const[key, value] of Object.entries(json)) { this.options[key] = value; }
        this.container.removeChild(this.container.firstChild);
    }

    this.dx = 1;
    this.dy = 0;
    this.mousedown = false;
    this.lastCell = null;
    this.currentFill = null;

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

    this.findClassInList = function(td, classes) {
        var cls = "";
        if (classes) { classes.forEach(c => { if (td.classList.contains(c)) cls = c; }) }
        return cls;
    }

    this.cycleClasses = function(td, classes, reverse) {
        var cls = this.findClassInList(td, classes);

        if (cls) {
            cls = classes[(classes.indexOf(cls) + classes.length + (reverse ? -1 : 1)) % classes.length];
            this.setClassInCycle(td, classes, cls);
        }

        return cls;
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
            if (e.currentTarget.parentElement.classList.contains("given-fill")) return;
            if (this.options["data-fill-behavior"] == "cycle") { this.cycleClasses(e.target.parentElement, this.fillClasses, e.shiftKey); }
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
        this.lastCell = e.currentTarget;

        if (this.options["data-drag-paint-fill"]) {
            if (this.options["data-fill-cycle"] && !e.currentTarget.classList.contains("given-fill")) { this.currentFill = this.cycleClasses(e.currentTarget, this.fillClasses, e.which != 1 || this.fShift); }
            else { this.currentFill = this.findClassInList(e.currentTarget, this.fillClasses); }
        }
        
        e.currentTarget.querySelector("input").focus();
        e.preventDefault();
    }

    this.mouseEnter = function(e) {
        if (!this.mousedown) return;

        var canPaint = this.options["data-drag-paint-fill"];

        if (this.options["data-drag-draw-path"]) {
            canPaint &= this.LinkCells(this.lastCell, e.currentTarget);
        }

        if (canPaint && !e.currentTarget.classList.contains("given-fill")) {
            this.setClassInCycle(e.currentTarget, this.fillClasses, this.currentFill);
        }

        this.lastCell = e.currentTarget;
        e.currentTarget.querySelector("input").focus();
    }

    this.getOptionArray = function(option, splitchar, special) {
        var val = this.options[option];
        if (!val || Array.isArray(val) || val == special) { return val; }
        return val.split(splitchar);
    }

    this.getOptionDict = function(option) {
        var val = this.options[option];
        // TODO attribute version
        return val;
    }

    this.translate = function(ch, replacements) {
        if (!replacements || !replacements[ch]) return ch;
        return replacements[ch];
    }

    this.clueMouseEnter = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.add("marked"); }); }
        if (downcluenumber) { this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.add("marked"); }); }
    }

    this.clueMouseLeave = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.remove("marked"); }); }
        if (downcluenumber) { this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.remove("marked"); }); }
    }

    this.clueClick = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelector("td[data-across-cluenumber='" + acrosscluenumber + "'] input").focus(); this.dx = 1; this.dy = 0; }
        if (downcluenumber) { this.container.querySelector("td[data-down-cluenumber='" + downcluenumber + "'] input").focus(); this.dx = 0; this.dy = 1; }
    }

    this.focus = function(e) {
        var acrosscluenumber = e.currentTarget.parentElement.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.parentElement.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelector("dd[data-across-cluenumber='" + acrosscluenumber + "']").classList.add("marked"); }
        if (downcluenumber) { this.container.querySelector("dd[data-down-cluenumber='" + downcluenumber + "']").classList.add("marked"); }
    }

    this.blur = function(e) {
        var acrosscluenumber = e.currentTarget.parentElement.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.parentElement.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelector("dd[data-across-cluenumber='" + acrosscluenumber + "']").classList.remove("marked"); }
        if (downcluenumber) { this.container.querySelector("dd[data-down-cluenumber='" + downcluenumber + "']").classList.remove("marked"); }
    }

    this.pathTranslate = ["o0", "i2", "i0", "l0", "i1", "r2", "r1", "t1", "i3", "r3", "r0", "t3", "l1", "t2", "t0", "x0"];
    this.updateSvg = function(td) {
        var svg = td.querySelector("svg");
        if (!svg) { svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "-10 -10 20 20"); td.appendChild(svg); }

        var pathCode = td.getAttribute("data-path-code");
        if (pathCode) { pathCode = parseInt(pathCode); } else { pathCode = 0; }
        var translatedData = this.pathTranslate[pathCode];

        while (svg.firstChild) { svg.removeChild(svg.firstChild); }

        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.classList.add("path");
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "path-" + this.options["data-path-style"] + ".svg#path-" + translatedData[0]);
        if (translatedData[1] != "0") { use.setAttributeNS(null, "transform", "rotate(" + parseInt(translatedData[1] * 90) + ")"); }
        svg.appendChild(use);
    }

    this.IsFullyLinked = function(code) {
        var linkCount = 0;
        while (code) { linkCount++; code &= (code - 1); }
        return (linkCount >= 2);
    }

    this.LinkCellsDirectional = function(cellFrom, directionFrom, cellTo, directionTo) {
        var codeFrom = cellFrom.getAttribute("data-path-code");
        var codeTo = cellTo.getAttribute("data-path-code");
        if (!(codeFrom & directionFrom) && !(codeTo & directionTo) && !this.IsFullyLinked(codeFrom) && !this.IsFullyLinked(codeTo)) {
            // TODO undoable
            cellFrom.setAttribute("data-path-code", codeFrom | directionFrom);
            cellTo.setAttribute("data-path-code", codeTo | directionTo);
            this.updateSvg(cellFrom);
            this.updateSvg(cellTo);
            return true;
        }
        else if ((codeFrom & directionFrom) && (codeTo & directionTo)) {
            var givenCodeFrom = cellFrom.getAttribute("data-given-path-code");
            var givenCodeTo = cellTo.getAttribute("data-given-path-code");
            if (!(givenCodeFrom & directionFrom) && !(givenCodeTo & directionTo)) {
                // TODO undoable
                cellFrom.setAttribute("data-path-code", codeFrom & ~directionFrom);
                cellTo.setAttribute("data-path-code", codeTo & ~directionTo);
                this.updateSvg(cellFrom);
                this.updateSvg(cellTo);

                if (this.options["data-drag-paint-fill"]) {
                    if (cellFrom.getAttribute("data-path-code") == 0 && !cellFrom.classList.contains("given-fill")) {
                        this.setClassInCycle(cellFrom, this.fillClasses, this.fillClasses[0]);
                    }
                    if (cellTo.getAttribute("data-path-code") == 0 && !cellTo.classList.contains("given-fill")) {
                        this.setClassInCycle(cellTo, this.fillClasses, this.fillClasses[0]);
                    }
                }
                return true;
            }
        }

        return false;
    }

    this.LinkCells = function(cellFrom, cellTo)
    {
        var colFrom = Array.prototype.indexOf.call(cellFrom.parentElement.children, cellFrom);
        var rowFrom = Array.prototype.indexOf.call(cellFrom.parentElement.parentElement.children, cellFrom.parentElement);
        var colTo = Array.prototype.indexOf.call(cellTo.parentElement.children, cellTo);
        var rowTo = Array.prototype.indexOf.call(cellTo.parentElement.parentElement.children, cellTo.parentElement);

        if (colFrom === colTo) {
            if (rowFrom === rowTo - 1) { return this.LinkCellsDirectional(cellFrom, 2, cellTo, 1); }
            else if (rowFrom === rowTo + 1) { return this.LinkCellsDirectional(cellFrom, 1, cellTo, 2); }
        }
        else if (rowFrom === rowTo) {
            if (colFrom === colTo - 1) { return this.LinkCellsDirectional(cellFrom, 8, cellTo, 4); }
            else if (colFrom === colTo + 1) { return this.LinkCellsDirectional(cellFrom, 4, cellTo, 8); }
        }

        return false;
    }

    this.fillClasses = this.getOptionArray("data-fill-classes", " ");

    var clueNumbers = this.getOptionArray("data-clue-numbers", " ", "auto");
    var shape = this.getOptionArray("data-shape", "|");
    var shapeReplacements = this.getOptionDict("data-shape-replacements");
    var fills = this.getOptionArray("data-fills", "|");
    var solution = this.getOptionArray("data-solution", "|");
    var borders = this.getOptionArray("data-custom-borders", "|");
    var paths = this.getOptionArray("data-paths", "|");
    var extracts = this.getOptionArray("data-extracts", " ");
    var unselectableGivens = this.options["data-unselectable-givens"];

    var table = document.createElement("table");
    var clueNum = 0;
    var extractNum = 0;

    var acrossClues = this.container.querySelectorAll(".crossword-clues.across dd");
    var acrossClueIndex = 0;
    var downClues = this.container.querySelectorAll(".crossword-clues.down dd");
    var downClueIndex = 0;

    if (shape.length == 1 && /^\d+x\d+$/.test(shape[0])) {
        var dim = shape[0].split("x");
        shape = [];
        for (r = 0; r < dim[1]; r++) {
            shape[r] = [];
            for (c = 0; c < dim[0]; c++) { shape[r][c] = "."; }
        }
    }

    for (var r = 0; r < shape.length; r++) {
        var tr = document.createElement("tr");

        for (var c = 0; c < shape[r].length; c++) {
            var td = document.createElement("td");
            var shapeCh = shape[r][c];
            
            var cell = document.createElement("input");
            cell.setAttribute("type", "text");

            if (shapeCh == '.') {
                if (solution) { cell.value = this.translate(solution[r][c], shapeReplacements); }
            }
            else if (shapeCh == '#') {
                td.classList.add("extract");
                if (solution) { cell.value = this.translate(solution[r][c], shapeReplacements); }
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
                cell.value = this.translate(shapeCh, shapeReplacements);
                td.classList.add("given");
                if (unselectableGivens) { td.classList.add("unselectable"); }
            }

            if (!td.classList.contains("unselectable")) {
                cell.addEventListener("keydown",  e => { this.keyDown(e); });

                td.addEventListener("mousedown",  e => { this.mouseDown(e); });
                td.addEventListener("mouseenter",  e => { this.mouseEnter(e); });
                td.addEventListener("contextmenu",  e => { e.preventDefault(); });
                if (clueNumbers) {
                    cell.addEventListener("focus",  e => { this.focus(e); });
                    cell.addEventListener("blur",  e => { this.blur(e); });
                }
            }

            td.appendChild(cell);

            if (borders) {
                if (borders.length == shape.length) {
                    var b = parseInt(borders[r][c], 16);
                    if (b & 1) { td.classList.add("border-top"); }
                    if (b & 2) { td.classList.add("border-bottom"); }
                    if (b & 4) { td.classList.add("border-left"); }
                    if (b & 8) { td.classList.add("border-right"); }
                }
                else if (borders.length == shape.length * 2 + 1) {
                    var topRow = borders[r * 2];
                    var midRow = borders[r * 2 + 1];
                    var botRow = borders[r * 2 + 2];
                    var chTop = (topRow.length == shape[r].length) ? topRow[c] : topRow[c * 2 + 1];
                    var chLeft = (midRow.length == shape[r].length + 1) ? midRow[c] : midRow[c * 2];
                    var chRight = (midRow.length == shape[r].length + 1) ? midRow[c + 1] : midRow[c * 2 + 2];
                    var chBottom = (botRow.length == shape[r].length) ? botRow[c] : botRow[c * 2 + 1];
                    if (chTop != " " && chTop != ".") { td.classList.add("border-top"); }
                    if (chBottom != " " && chBottom != ".") { td.classList.add("border-bottom"); }
                    if (chLeft != " " && chLeft != ".") { td.classList.add("border-left"); }
                    if (chRight != " " && chRight != ".") { td.classList.add("border-right"); }
                }
            }

            if (paths) {
                if (paths.length == shape.length) {
                    var p = parseInt(paths[r][c], 16);
                    if (!p) { p = 0; }
                    td.setAttribute("data-path-code", p);
                    td.setAttribute("data-given-path-code", p);
                }

                this.updateSvg(td);
            }

            if (clueNumbers && shape[r][c] != '@') {
                var acrossClue = (c == 0 || shape[r][c-1] == '@' || td.classList.contains("border-left")) && c < shape[r].length - 1 && shape[r][c+1] != '@' && !td.classList.contains("border-right"); // block/edge left, letter right
                var downClue = (r == 0 || shape[r-1][c] == '@' || td.classList.contains("border-top")) && r < shape.length - 1 && shape[r+1][c] != '@' && !td.classList.contains("border-bottom"); // block/edge above, letter below
                if (acrossClue || downClue) {
                    var clueRealNum = (clueNumbers == "auto") ? ++clueNum : clueNumbers[clueNum++];

                    if (acrossClue) { td.setAttribute("data-across-cluenumber", clueRealNum); }
                    if (downClue) { td.setAttribute("data-down-cluenumber", clueRealNum); }
                    if (acrossClue && acrossClues[acrossClueIndex]) { acrossClues[acrossClueIndex++].setAttribute("data-across-cluenumber", clueRealNum); }
                    if (downClue && downClues[downClueIndex]) { downClues[downClueIndex++].setAttribute("data-down-cluenumber", clueRealNum); }

                    var clue = document.createElement("div");
                    clue.classList.add("clue");
                    clue.innerText = clueRealNum;
                    td.appendChild(clue);
                }
                if (!acrossClue && c > 0 && shape[r][c-1] != '@' && !td.classList.contains("border-left")) { td.setAttribute("data-across-cluenumber", tr.children[c-1].getAttribute("data-across-cluenumber")); }
                if (!downClue && r > 0 && shape[r-1][1] != '@' && !td.classList.contains("border-top")) { td.setAttribute("data-down-cluenumber", table.children[r-1].children[c].getAttribute("data-down-cluenumber")); }
            }

            if (this.fillClasses) {
                if (fills && fills[r][c] != '.') {
                    td.classList.add(this.fillClasses[parseInt(fills[r][c])]);
                    td.classList.add("given-fill");
                } else {
                    td.classList.add(this.fillClasses[0]);
                }
            }

            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    this.container.insertBefore(table, this.container.firstChild);

    this.container.querySelectorAll(".crossword-clues dd").forEach((clue) => {
        clue.addEventListener("mouseenter", e => { this.clueMouseEnter(e); });
        clue.addEventListener("mouseleave", e => { this.clueMouseLeave(e); });
        clue.addEventListener("click", e => { this.clueClick(e); });
        clue.addEventListener("contextmenu", e => { e.target.classList.toggle("strikethrough"); e.preventDefault(); });
    });

    window.addEventListener("mouseup", e => {this.mousedown = false; });
}