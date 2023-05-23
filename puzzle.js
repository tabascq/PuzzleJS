var puzzleJsFolderPath = document.currentScript.src.replace("puzzle.js", "");

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
    "data-borders": null,
    "data-unselectable-givens": false,
    "data-paths": null,
    "data-path-style": "straight",
    "data-edge-style": "box",
    "data-drag-paint-fill": true,
    "data-drag-draw-path": false,
    "data-drag-draw-edge": false,
    "data-top-clues": null,
    "data-bottom-clues": null,
    "data-left-clues": null,
    "data-right-clues": null,
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

puzzleModes["sudoku"] = {
    "data-allowed-characters": "123456789",
    "data-borders": "3x3",
    "data-text-shift-key": "candidates"
};

puzzleModes["pathpaint"] = {
    "data-path-style": "curved",
    "data-drag-draw-path": true,
    "data-fill-cycle": false
}

puzzleModes["trains"] = {
    "data-path-style": "track",
    "data-drag-paint-fill": false,
    "data-drag-draw-path": true
}

puzzleModes["slitherlink"] = {
    "data-drag-draw-edge" : true,
    "data-edge-style": "dots"
}

// Go through all puzzles and give them a PuzzleEntry object
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".puzzle-entry").forEach((p) => { new PuzzleEntry(p); });
});

function UndoManager() {
    this.undoStack = [];
    this.redoStack = [];
    this.activeGroup = null;

    // undo/redo support
    this.redoUnit = function(unit) {
        var extractId = unit.elem.getAttribute("data-extract-id");
        var elems = extractId ? document.querySelectorAll("." + extractId) : [unit.elem];

        elems.forEach(elem =>{
            if (unit.adds) { unit.adds.forEach((a) => { elem.classList.add(a); }); }
            if (unit.removes) { unit.removes.forEach((a) => { elem.classList.remove(a); }); }
            if (unit.attribute) { elem.setAttribute(unit.attribute, unit.newValue); }
        });
    }

    this.undoUnit = function(unit) {
        var extractId = unit.elem.getAttribute("data-extract-id");
        var elems = extractId ? document.querySelectorAll("." + extractId) : [unit.elem];

        elems.forEach(elem =>{
            if (unit.adds) { unit.adds.forEach((a) => { elem.classList.remove(a); }); }
            if (unit.removes) { unit.removes.forEach((a) => { elem.classList.add(a); }); }
            if (unit.attribute) { elem.setAttribute(unit.attribute, unit.oldValue); }
        });
    }

    this.undo = function() {
        if (this.activeGroup) { this.endGroup(); }
        if (this.undoStack.length == 0) { return; }

        var group = this.undoStack.pop();
        group.units.forEach((unit) => { this.undoUnit(unit); });
        this.redoStack.push(group);
        this.notify(group);
    }

    this.redo = function() {
        if (this.activeGroup) { this.endGroup(); }
        if (this.redoStack.length == 0) { return; }

        var group = this.redoStack.pop();
        group.units.forEach((unit) => { this.redoUnit(unit); });
        this.undoStack.push(group);
        this.notify(group);
    }

    this.startGroup = function(puzzleEntry) {
        if (this.activeGroup) { this.endGroup(); }
        this.activeGroup = { puzzleEntry: puzzleEntry, units: [] };
    }

    this.endGroup = function() {
        if (!this.activeGroup) return;

        if (this.activeGroup.units.length) {
            this.undoStack.push(this.activeGroup);
            this.redoStack = [];
            this.notify(this.activeGroup);
        }

        this.activeGroup = null;
    }

    this.modifyClass = function(elem, adds, removes) {
        var trueAdds = [];
        var trueRemoves = [];

        adds.forEach((a) => { if (a && !elem.classList.contains(a)) { trueAdds.push(a); }});
        removes.forEach((r) => { if (r && elem.classList.contains(r)) { trueRemoves.push(r); }});

        if (trueAdds.length == 0 && trueRemoves.length == 0) { return; }

        var unit = { "elem": elem };
        if (trueAdds.length > 0) { unit.adds = trueAdds; }
        if (trueRemoves.length > 0) { unit.removes = trueRemoves; }

        this.redoUnit(unit);
        this.activeGroup.units.push(unit);
    }

    this.modifyAttribute = function(elem, attribute, newValue) {
        var oldValue = elem.getAttribute(attribute);
        if (oldValue == newValue) { return; }

        var unit = { "elem": elem, "attribute": attribute, "oldValue": oldValue, "newValue": newValue };

        this.redoUnit(unit);
        this.activeGroup.units.push(unit);
    }

    this.notify = function(group) {
        group.puzzleEntry.onUndoRedo(group.units);
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
        var col = dcol + Array.prototype.indexOf.call(td.parentElement.children, td) - this.leftClueDepth;
        var row = drow + Array.prototype.indexOf.call(td.parentElement.parentElement.children, td.parentElement) - this.topClueDepth;

        while (true) {
            var td = this.container.querySelector("tr:nth-child(" + (row + this.topClueDepth + 1) + ") td:nth-child(" + (col + this.leftClueDepth + 1) + ")");

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
            this.undoManager.startGroup(this);
            cls = classes[(classes.indexOf(cls) + classes.length + (reverse ? -1 : 1)) % classes.length];
            this.setClassInCycle(td, classes, cls);
            this.undoManager.endGroup();
        }

        return cls;
    }

    this.setClassInCycle = function(td, classes, cls) {
        if (classes && !td.classList.contains(cls)) { this.undoManager.modifyClass(td, [cls], classes); }
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
        if (target.value != text && !target.parentElement.classList.contains("given")) {
            this.undoManager.startGroup(this);
            this.undoManager.modifyClass(target, adds, removes);
            this.undoManager.modifyAttribute(target, "value", text);
            this.undoManager.endGroup();
        }
    }

    this.getText = function(target) {
        return target.value;
    }

    this.onUndoRedo = function(units) {
        units.forEach((u) => { if (u.attribute == "data-path-code" || u.attribute == "data-edge-code" || u.attribute == "data-x-edge-code") { this.updateSvg(u.elem); }});
    }

    this.getEventEdgeState = function(e) {
        var tolerance = e.currentTarget.offsetWidth/5;
        var cell = e.currentTarget;
        var closeTop = (e.offsetY <= tolerance);
        var closeBottom = (e.offsetY >= e.currentTarget.offsetHeight - tolerance);
        var closeLeft = (e.offsetX <= tolerance);
        var closeRight = (e.offsetX >= e.currentTarget.offsetWidth - tolerance);

        if (closeBottom || closeRight) {
            var col = Array.prototype.indexOf.call(cell.parentElement.children, cell) - this.leftClueDepth;
            var row = Array.prototype.indexOf.call(cell.parentElement.parentElement.children, cell.parentElement) - this.topClueDepth;

            if (closeBottom && row < this.numRows - 1) { closeBottom = false; closeTop = true; row++; }
            if (closeRight && col < this.numCols - 1) { closeRight = false; closeLeft = true; col++; }

            cell = cell.parentElement.parentElement.children[row + this.topClueDepth].children[col + this.leftClueDepth];
        }

        var edgeCode = 0;
        if (closeTop && !closeLeft && !closeRight) { edgeCode = 1; }
        else if (closeBottom && !closeLeft && !closeRight) { edgeCode = 2; }
        else if (closeLeft && !closeTop && !closeBottom) { edgeCode = 4; }
        else if (closeRight && !closeTop && !closeBottom) { edgeCode = 8; }

        return { cell: cell, edgeCode: edgeCode };
    }

    this.toggleEdgeState = function(edgeState, right) {
        if (edgeState.edgeCode == 0) return;
        if (this.lastEdgeState != null && this.lastEdgeState.cell === edgeState.cell && this.lastEdgeState.edgeCode === edgeState.edgeCode) return;

        var curEdgeCode = edgeState.cell.getAttribute("data-edge-code");
        var curXEdgeCode = edgeState.cell.getAttribute("data-x-edge-code");
        var curEdgeVal = (curEdgeCode & edgeState.edgeCode) ? 1 : ((curXEdgeCode & edgeState.edgeCode) ? -1 : 0);

        if (!this.lastEdgeState) {
            this.fromEdgeVal = curEdgeVal;
            this.toEdgeVal = this.fromEdgeVal + (right ? -1 : 1);
            if (this.toEdgeVal > 1) { this.toEdgeVal -= 3; }
            if (this.toEdgeVal < -1) { this.toEdgeVal += 3; }
        }

        this.lastEdgeState = edgeState;

        if (curEdgeVal != this.fromEdgeVal) return;

        this.undoManager.startGroup(this);
        if (this.fromEdgeVal == 1 || this.toEdgeVal == 1) this.undoManager.modifyAttribute(edgeState.cell, "data-edge-code", curEdgeCode ^ edgeState.edgeCode);
        if (this.fromEdgeVal == -1 || this.toEdgeVal == -1) this.undoManager.modifyAttribute(edgeState.cell, "data-x-edge-code", curXEdgeCode ^ edgeState.edgeCode);
        this.undoManager.endGroup();
        this.updateSvg(edgeState.cell);
    }

    this.mouseDown = function(e) {
        this.mousedown = true;
        this.lastCell = e.currentTarget;

        if (this.options["data-drag-draw-edge"]) {
            var edgeState = this.getEventEdgeState(e);
            this.lastEdgeState = null;
            this.toggleEdgeState(edgeState, (e.which != 1 || this.fShift));
            e.preventDefault();
            return;
        }
        else if (this.options["data-drag-paint-fill"]) {
            if (this.options["data-fill-cycle"] && !e.currentTarget.classList.contains("given-fill")) { this.currentFill = this.cycleClasses(e.currentTarget, this.fillClasses, e.which != 1 || this.fShift); }
            else { this.currentFill = this.findClassInList(e.currentTarget, this.fillClasses); }
        }
        
        e.currentTarget.querySelector("input").focus();
        e.preventDefault();
    }

    this.mouseMove = function(e) {
        if (!this.mousedown) return;

        if (this.options["data-drag-draw-edge"]) {
            var edgeState = this.getEventEdgeState(e);
            this.toggleEdgeState(edgeState, (e.which != 1 || this.fShift));
            e.preventDefault();
            return;
        }
    }

    this.mouseEnter = function(e) {
        if (!this.mousedown) return;
        if (this.lastCell === e.currentTarget) return;
        if (this.options["data-drag-draw-edge"]) return;

        var wantPaint = this.options["data-drag-paint-fill"];
        var canPaint = wantPaint;

        this.undoManager.startGroup(this);

        if (this.options["data-drag-draw-path"]) {
            var targetFill = this.findClassInList(e.currentTarget, this.fillClasses);
            var setLast = false; 
            if (wantPaint && this.currentFill == this.fillClasses[0]) { this.currentFill = targetFill; setLast = true; }
            if (wantPaint && targetFill != this.fillClasses[0] && targetFill != this.currentFill) { canPaint = false; }
            else { canPaint &= this.LinkCells(this.lastCell, e.currentTarget); }
        }

        if (canPaint && !e.currentTarget.classList.contains("given-fill")) {
            this.setClassInCycle(e.currentTarget, this.fillClasses, this.currentFill);
        }

        if (canPaint && setLast) { this.setClassInCycle(this.lastCell, this.fillClasses, this.currentFill); }

        this.undoManager.endGroup();

        if (!wantPaint || canPaint) {
            this.lastCell = e.currentTarget;
            e.currentTarget.querySelector("input").focus();
        }
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
        if (acrosscluenumber) { this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.add("hovered"); }); }
        if (downcluenumber) { this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.add("hovered"); }); }
    }

    this.clueMouseLeave = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.remove("hovered"); }); }
        if (downcluenumber) { this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.remove("hovered"); }); }
    }

    this.clueClick = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.container.querySelector("td[data-across-cluenumber='" + acrosscluenumber + "'] input").focus(); this.dx = 1; this.dy = 0; }
        if (downcluenumber) { this.container.querySelector("td[data-down-cluenumber='" + downcluenumber + "'] input").focus(); this.dx = 0; this.dy = 1; }
    }

    this.focus = function(e) {
        // Strip highlighting on all cells.
        this.container.querySelectorAll("td[data-across-cluenumber]").forEach(td => { td.classList.remove("marked"); });
        this.container.querySelectorAll("td[data-down-cluenumber]").forEach(td => { td.classList.remove("marked"); });
        // Now reapply the highlighting to relevant cells and clues.
        var acrosscluenumber = e.currentTarget.parentElement.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.parentElement.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) {
            this.container.querySelector("dd[data-across-cluenumber='" + acrosscluenumber + "']").classList.add("marked");
            if (this.dx !== 0) {
                this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.add("marked"); });
            }
        }
        if (downcluenumber) {
            this.container.querySelector("dd[data-down-cluenumber='" + downcluenumber + "']").classList.add("marked");
            if (this.dy !== 0) {
                this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.add("marked"); });
            }
        }
    }

    this.blur = function(e) {
        var acrosscluenumber = e.currentTarget.parentElement.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.parentElement.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) {
            this.container.querySelector("dd[data-across-cluenumber='" + acrosscluenumber + "']").classList.remove("marked");
            if (this.dx !== 0) {
                this.container.querySelectorAll("td[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.remove("marked"); });
            }
        }
        if (downcluenumber) {
            this.container.querySelector("dd[data-down-cluenumber='" + downcluenumber + "']").classList.remove("marked");
            if (this.dy !== 0) {
                this.container.querySelectorAll("td[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.remove("marked"); });
            }
        }
    }

    this.addEdgeToSvg = function(svg, edgeName) {
        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.classList.add(edgeName);
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", puzzleJsFolderPath + "edge-" + this.options["data-edge-style"] + ".svg#" + edgeName);
        svg.appendChild(use);
    }

    this.pathTranslate = ["o0", "i2", "i0", "l0", "i1", "r2", "r1", "t1", "i3", "r3", "r0", "t3", "l1", "t2", "t0", "x0"];
    this.updateSvg = function(td) {
        var svg = td.querySelector("svg");
        if (!svg) { svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "-15 -15 30 30"); td.appendChild(svg); }

        var pathCode = td.getAttribute("data-path-code");
        if (pathCode) { pathCode = parseInt(pathCode); } else { pathCode = 0; }
        var translatedData = this.pathTranslate[pathCode];

        svg.innerHTML = "";

        if (pathCode) {
            var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.classList.add("path");
            use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", puzzleJsFolderPath + "path-" + this.options["data-path-style"] + ".svg#path-" + translatedData[0]);
            if (translatedData[1] != "0") { use.setAttributeNS(null, "transform", "rotate(" + parseInt(translatedData[1] * 90) + ")"); }
            svg.appendChild(use);
        }
        
        if (!td.classList.contains("unselectable")) { this.addEdgeToSvg(svg, "edge-base"); }

        var edgeCode = td.getAttribute("data-edge-code");
        if (edgeCode & 1) { this.addEdgeToSvg(svg, "edge-top"); }
        if (edgeCode & 2) { this.addEdgeToSvg(svg, "edge-bottom"); }
        if (edgeCode & 4) { this.addEdgeToSvg(svg, "edge-left"); }
        if (edgeCode & 8) { this.addEdgeToSvg(svg, "edge-right"); }

        edgeCode = td.getAttribute("data-x-edge-code");
        if (edgeCode & 1) { this.addEdgeToSvg(svg, "x-edge-top"); }
        if (edgeCode & 2) { this.addEdgeToSvg(svg, "x-edge-bottom"); }
        if (edgeCode & 4) { this.addEdgeToSvg(svg, "x-edge-left"); }
        if (edgeCode & 8) { this.addEdgeToSvg(svg, "x-edge-right"); }
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
            this.undoManager.modifyAttribute(cellFrom, "data-path-code", codeFrom | directionFrom);
            this.undoManager.modifyAttribute(cellTo, "data-path-code", codeTo | directionTo);
            return true;
        }
        else if ((codeFrom & directionFrom) && (codeTo & directionTo)) {
            var givenCodeFrom = cellFrom.getAttribute("data-given-path-code");
            var givenCodeTo = cellTo.getAttribute("data-given-path-code");
            if (!(givenCodeFrom & directionFrom) && !(givenCodeTo & directionTo)) {
                this.undoManager.modifyAttribute(cellFrom, "data-path-code", codeFrom & ~directionFrom);
                this.undoManager.modifyAttribute(cellTo, "data-path-code", codeTo & ~directionTo);

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
        var colFrom = Array.prototype.indexOf.call(cellFrom.parentElement.children, cellFrom) - this.leftClueDepth;
        var rowFrom = Array.prototype.indexOf.call(cellFrom.parentElement.parentElement.children, cellFrom.parentElement) - this.topClueDepth;
        var colTo = Array.prototype.indexOf.call(cellTo.parentElement.children, cellTo) - this.leftClueDepth;
        var rowTo = Array.prototype.indexOf.call(cellTo.parentElement.parentElement.children, cellTo.parentElement) - this.topClueDepth;

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

    this.parseOuterClues = function(clues) {
        var clueDepth = 0;
        if (clues) { for (var i = 0; i < clues.length; i++) { clues[i] = clues[i].split(" "); clueDepth = Math.max(clues[i].length, clueDepth); } }
        return clueDepth;    
    }

    this.addEmptyOuterCell = function(tr) {
        var td = document.createElement("td");
        td.classList.add("unselectable");
        tr.appendChild(td);
    }

    this.addOuterClue = function(tr, clues, clueIndex, cls) {
        var td = document.createElement("td");
        if (clueIndex >= 0 && clueIndex < clues.length && clues[clueIndex]) {
            td.textContent = clues[clueIndex];
            td.classList.add(cls);
            td.addEventListener("contextmenu", e => { e.target.classList.toggle("strikethrough"); e.preventDefault(); });
        } else { td.classList.add("unselectable"); }

        tr.appendChild(td);
    }

    this.fillClasses = this.getOptionArray("data-fill-classes", " ");

    var clueNumbers = this.getOptionArray("data-clue-numbers", " ", "auto");
    var shape = this.getOptionArray("data-shape", "|");
    var shapeReplacements = this.getOptionDict("data-shape-replacements");
    var fills = this.getOptionArray("data-fills", "|");
    var solution = this.getOptionArray("data-solution", "|");
    var borders = this.getOptionArray("data-borders", "|");
    var paths = this.getOptionArray("data-paths", "|");
    var extracts = this.getOptionArray("data-extracts", " ");
    var unselectableGivens = this.options["data-unselectable-givens"];
    var topClues = this.getOptionArray("data-top-clues", "|");
    var bottomClues = this.getOptionArray("data-bottom-clues", "|");
    var leftClues = this.getOptionArray("data-left-clues", "|");
    var rightClues = this.getOptionArray("data-right-clues", "|");

    this.topClueDepth = this.parseOuterClues(topClues);
    this.bottomClueDepth = this.parseOuterClues(bottomClues);
    this.leftClueDepth = this.parseOuterClues(leftClues);
    this.rightClueDepth = this.parseOuterClues(rightClues);

    var table = document.createElement("table");
    var clueNum = 0;
    var extractNum = 0;

    var acrossClues = this.container.querySelectorAll(".crossword-clues.across dd");
    var acrossClueIndex = 0;
    var downClues = this.container.querySelectorAll(".crossword-clues.down dd");
    var downClueIndex = 0;

    var regularRowBorder = 0;
    var regularColBorder = 0;

    if (shape.length == 1 && /^\d+x\d+$/.test(shape[0])) {
        var dim = shape[0].split("x");
        shape = [];
        for (r = 0; r < dim[1]; r++) {
            shape[r] = [];
            for (c = 0; c < dim[0]; c++) { shape[r][c] = "."; }
        }
    }

    if (borders && borders.length == 1 && /^\d+x\d+$/.test(borders[0])) {
        var dim = borders[0].split("x");
        borders = null;
        regularColBorder = dim[0];
        regularRowBorder = dim[1];
    }

    for (var i = 0; i < this.topClueDepth; i++) {
        var tr = document.createElement("tr");
        for (var j = 0; j < this.leftClueDepth; j++) { this.addEmptyOuterCell(tr); }
        for (var j = 0; j < topClues.length; j++) { this.addOuterClue(tr, topClues[j], i - this.topClueDepth + topClues[j].length, "top-clue"); }
        for (var j = 0; j < this.rightClueDepth; j++) { this.addEmptyOuterCell(tr); }

        table.appendChild(tr);
    }

    this.numRows = shape.length;
    this.numCols = 0;

    for (var r = 0; r < shape.length; r++) {
        var tr = document.createElement("tr");

        for (var j = 0; j < this.leftClueDepth; j++) { this.addOuterClue(tr, leftClues[r], j - this.leftClueDepth + leftClues[r].length, "left-clue"); }

        this.numCols = Math.max(this.numCols, shape[r].length);
        for (var c = 0; c < shape[r].length; c++) {
            var td = document.createElement("td");
            td.classList.add("interior");
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
                if (this.options["data-drag-draw-edge"]) { td.addEventListener("mousemove",  e => { this.mouseMove(e); }); }
                td.addEventListener("mouseenter",  e => { this.mouseEnter(e); });
                td.addEventListener("contextmenu",  e => { e.preventDefault(); });
                if (clueNumbers) {
                    cell.addEventListener("focus",  e => { this.focus(e); });
                    cell.addEventListener("blur",  e => { this.blur(e); });
                }
            }

            td.appendChild(cell);

            var edgeCode = 0;
            if (regularRowBorder) {
                if ((r % regularRowBorder) == 0) { edgeCode |= 1; }
                if (r == shape.length - 1) { edgeCode |= 2; }
            }
            if (regularColBorder) {
                if ((c % regularColBorder) == 0) { edgeCode |= 4; }
                if (c == shape[r].length - 1) { edgeCode |= 8; }
            }

            if (borders) {
                if (borders.length == shape.length) {
                    edgeCode |= parseInt(borders[r][c], 16);
                }
                else if (borders.length == shape.length * 2 + 1) {
                    var topRow = borders[r * 2];
                    var midRow = borders[r * 2 + 1];
                    var botRow = borders[r * 2 + 2];
                    var chTop = (topRow.length == shape[r].length) ? topRow[c] : topRow[c * 2 + 1];
                    var chLeft = (midRow.length == shape[r].length + 1) ? midRow[c] : midRow[c * 2];
                    var chRight = (midRow.length == shape[r].length + 1) ? midRow[c + 1] : midRow[c * 2 + 2];
                    var chBottom = (botRow.length == shape[r].length) ? botRow[c] : botRow[c * 2 + 1];
                    if (chTop != " " && chTop != ".") { edgeCode |= 1; }
                    if (chBottom != " " && chBottom != ".") { edgeCode |= 2; }
                    if (chLeft != " " && chLeft != ".") { edgeCode |= 4; }
                    if (chRight != " " && chRight != ".") { edgeCode |= 8; }
                }
            }

            if (edgeCode) { td.setAttribute("data-edge-code", edgeCode); }

            if (paths) {
                if (paths.length == shape.length) {
                    var p = parseInt(paths[r][c], 16);
                    if (!p) { p = 0; }
                    td.setAttribute("data-path-code", p);
                    td.setAttribute("data-given-path-code", p);
                }
            }

            if (clueNumbers && shape[r][c] != '@') {
                var acrossClue = (c == 0 || shape[r][c-1] == '@' || (edgeCode & 4)) && c < shape[r].length - 1 && shape[r][c+1] != '@' && !(edgeCode & 8); // block/edge left, letter right
                var downClue = (r == 0 || shape[r-1][c] == '@' || (edgeCode & 1)) && r < shape.length - 1 && shape[r+1][c] != '@' && !(edgeCode & 2); // block/edge above, letter below
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
                if (!acrossClue && c > 0 && shape[r][c-1] != '@' && !(edgeCode & 4)) { td.setAttribute("data-across-cluenumber", tr.children[c-1].getAttribute("data-across-cluenumber")); }
                if (!downClue && r > 0 && shape[r-1][1] != '@' && !(edgeCode & 1)) { td.setAttribute("data-down-cluenumber", table.children[r-1].children[c].getAttribute("data-down-cluenumber")); }
            }

            if (this.fillClasses) {
                if (fills && fills[r][c] != '.') {
                    td.classList.add(this.fillClasses[parseInt(fills[r][c])]);
                    td.classList.add("given-fill");
                } else {
                    td.classList.add(this.fillClasses[0]);
                }
            }

            this.updateSvg(td);
            tr.appendChild(td);
        }

        for (var j = 0; j < this.rightClueDepth; j++) { this.addOuterClue(tr, rightClues[r], j, "right-clue"); }

        table.appendChild(tr);
    }

    for (var i = 0; i < this.bottomClueDepth; i++) {
        var tr = document.createElement("tr");
        for (var j = 0; j < this.leftClueDepth; j++) { this.addEmptyOuterCell(tr); }
        for (var j = 0; j < bottomClues.length; j++) { this.addOuterClue(tr, bottomClues[j], i, "bottom-clue"); }
        for (var j = 0; j < this.rightClueDepth; j++) { this.addEmptyOuterCell(tr); }

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