/* (c) 2025 Kenny Young
 * This code is licensed under the MIT License.
 * https://github.com/tabascq/PuzzleJS
 */
var puzzleJsFolderPath = document.currentScript.src.split("puzzle.js")[0];

// register some puzzle modes; a mode is just a set of options,
// so the options do not need to all be learned and manually applied to each puzzle.
// a puzzle can have multiple modes and multiple custom options.
var puzzleModes = {};
puzzleModes["default"] = {
    // text
    "data-text": null,
    "data-text-replacements": null,
    "data-text-characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "data-text-shift-key": "rebus",
    "data-text-shift-lock": false,
    "data-text-solution": null,
    "data-text-advance-on-type": false,
    "data-text-advance-style": "crossword",
    "data-text-advance-skip-filled" : false,
    "data-text-avoid-position": null,

    // fills
    "data-fill-classes": null,
    "data-fills": null,
    "data-fill-cycle": true,

    // paths
    "data-paths": null,
    "data-path-max-directions": 2,
    "data-path-style": "straight",

    // edges
    "data-edges": null,
    "data-edge-style": "box",

    // spokes
    "data-spokes": null,
    "data-spoke-max-directions": null,
    "data-spoke-allowed-directions": "*",
    "data-spoke-levels": 1,
    "data-spoke-style": "solid",

    // clues
    "data-clue-locations": null,
    "data-clue-indicators": null,
    "data-clue-position": "top-left",
    "data-top-clues": null,
    "data-bottom-clues": null,
    "data-left-clues": null,
    "data-right-clues": null,

    // linked content
    "data-links": null,
    "data-link-position": "top-left",
    "data-extracts": null,
    "data-extract-position": "bottom-right",

    // misc
    "data-drag-paint-fill": true,
    "data-drag-draw-path": false,
    "data-drag-draw-edge": false,
    "data-drag-draw-spoke": false,
    "data-unselectable-givens": false,
    "data-extra-style-classes": null,
    "data-extra-styles": null,
    "data-no-input": false,
    "data-no-screenreader": false,
    "data-show-commands": false,
    "data-reset-prompt": "Clear all puzzle content?",
    "data-puzzle-id": null,
    "data-team-id": null,
    "data-player-id": null
};

puzzleModes["linear"] = {
    "data-text-advance-on-type": true,
    "data-text-advance-skip-filled" : true,
    "data-unselectable-givens": true
}

puzzleModes["crossword"] = {
    "data-text-advance-on-type": true,
    "data-text-advance-skip-filled" : true,
    "data-clue-locations": "crossword"
};

puzzleModes["crostic-grid"] = {
    "data-text-advance-on-type": true,
    "data-text-advance-style": "wrap",
    "data-text-advance-skip-filled" : true,
    "data-text-avoid-position": "top",
    "data-link-position": "top-left|top-right"
}

puzzleModes["crostic-clue"] = {
    "data-text-advance-on-type": true,
    "data-text-advance-style": "wrap",
    "data-text-advance-skip-filled" : true,
    "data-text-avoid-position": "top",
    "data-link-position": "top-left"
}

puzzleModes["notext"] = {
    "data-text-characters": ""
}

puzzleModes["sudoku"] = {
    "data-text-characters": "123456789",
    "data-edges": "3x3",
    "data-text": "9x9",
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
    "data-fill-cycle": false,
    "data-drag-draw-path": true
}

puzzleModes["slitherlink"] = {
    "data-drag-draw-edge" : true,
    "data-edge-style": "dots"
}

puzzleModes["spokes"] = {
    "data-drag-draw-spoke": true
}

puzzleModes["wordsearch"] = {
    "data-drag-draw-spoke": true
}

puzzleModes["slant"] = {
    "data-drag-draw-spoke": true,
    "data-spoke-allowed-directions": "x",
    "data-edge-style": "offset"
}

puzzleModes["bridges"] = {
    "data-drag-draw-spoke": true,
    "data-drag-paint-fill": false,
    "data-fill-cycle": false,
    "data-spoke-allowed-directions": "+",
    "data-spoke-levels": 2
}

puzzleModes["solution"] = {
    "data-no-input": true
}

// Parse string as raw JS objects. e.g. "false" -> false
// (if ("false") is truthy in JS)
function parseFalseStrings(s) {
    return s.toLowerCase() === "false" ? false : s;
}

// Go through all puzzles and give them a PuzzleEntry object
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".puzzle-entry").forEach((p, index) => { new PuzzleEntry(p, index); });
});

function resetAllPuzzleStateOnPage() {
    document.querySelectorAll(".puzzle-entry").forEach((p) => { p.puzzleEntry.prepareToReset(); });
    window.location.reload();
}

function UndoManager() {
    this.undoStack = [];
    this.redoStack = [];
    this.activeAction = null;

    this.undoAction = function(action) {
        var teamId = action.puzzleEntry.container.getAttribute("data-team-id");
        var playerId = action.puzzleEntry.container.getAttribute("data-player-id");

        action.groups.forEach(g => {
            var changes = [];
            var puzzleId = g.puzzleGrid.puzzleId;
            g.units.forEach(u => { changes.push({puzzleId: puzzleId, teamId: teamId, locationKey: u.elem.id, propertyKey: u.propertyKey, value: u.oldValue, playerId: playerId}); });
            g.puzzleGrid.changeWithoutUndo(changes);
            g.puzzleGrid.container.dispatchEvent(new CustomEvent("puzzlechanged", { detail: changes, bubbles: true }));
        });
    }

    this.redoAction = function(action) {
        var teamId = action.puzzleEntry.container.getAttribute("data-team-id");
        var playerId = action.puzzleEntry.container.getAttribute("data-player-id");
        
        action.groups.forEach(g => {
            var changes = [];
            var puzzleId = g.puzzleGrid.puzzleId;
            g.units.forEach(u => { changes.push({puzzleId: puzzleId, teamId: teamId, locationKey: u.elem.id, propertyKey: u.propertyKey, value: u.newValue, playerId: playerId}); });
            g.puzzleGrid.changeWithoutUndo(changes);
            g.puzzleGrid.container.dispatchEvent(new CustomEvent("puzzlechanged", { detail: changes, bubbles: true }));
        });
    }

    this.undo = function() {
        if (this.activeAction) { this.endAction(); }
        if (this.undoStack.length == 0) { return; }

        var action = this.undoStack.pop();
        this.undoAction(action);
        this.redoStack.push(action);
    }

    this.redo = function() {
        if (this.activeAction) { this.endAction(); }
        if (this.redoStack.length == 0) { return; }

        var action = this.redoStack.pop();
        this.redoAction(action);
        this.undoStack.push(action);
    }

    this.startAction = function(puzzleEntry) {
        this.activeAction = { puzzleEntry: puzzleEntry, groups: [], totalUnits: 0 };
    }

    this.endAction = function() {
        var retVal = false;

        if (this.activeAction && this.activeAction.groups.length > 0) {
            try {
                this.redoAction(this.activeAction);
                this.undoStack.push(this.activeAction);
                this.redoStack = [];
                retVal = true;
            }
            catch { }
        }

        this.activeAction = null;
        return retVal;
    }

    this.addUnit = function(puzzleGrid, element, propertyKey, oldValue, newValue) {
        if (oldValue == newValue) return;

        var group;

        this.activeAction.groups.forEach(g => { if (g.puzzleGrid == puzzleGrid) { g = group; } });
        if (!group) {
            group = { puzzleGrid: puzzleGrid, units: [] };
            this.activeAction.groups.push(group);
        }

        var unit = { "elem": element, "propertyKey": propertyKey, "oldValue": oldValue, "newValue" : newValue };
        group.units.push(unit);
    }
}

function PuzzleEntry(p, index) {
    this.container = p;
    this.recordingProperties = {};

    p.puzzleEntry = this;

    // Assign all options by applying all properties from all modes. Modes specified earliest in data-mode get precedence.
    this.setDataModeOptions = function(element, options, fDefault) {
        var modes = element.getAttribute("data-mode");
        modes = modes ? modes.split(" ") : [];
        if (fDefault)
            modes.push("default"); 
        modes.reverse();
        modes.forEach(m => { if (puzzleModes[m]) for (const [key, value] of Object.entries(puzzleModes[m])) { options[key] = value; } });
    }

    this.extractJsonOptions = function(element) {
        var jsonOptions = {};

        if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
            try {
                var json = JSON.parse(element.firstChild.textContent);
                for (const[key, value] of Object.entries(json)) { jsonOptions[key] = value; }
                element.removeChild(element.firstChild);
            } catch {}
        }

        return jsonOptions;
    }

    // Finally, any explicitly-specified attributes win.
    this.readLocalOptions = function(element, jsonOptions, options) {
        for (const [key, value] of Object.entries(options)) {
            if (element.hasAttribute(key)) { options[key] = parseFalseStrings(element.getAttribute(key)); }
            if (jsonOptions[key] != undefined) { options[key] = jsonOptions[key];}
        }
    }

    this.pointerIsDown = false;
    this.lastCell = null;
    this.currentFill = null;
    this.xKeyMode = false;
    this.tilt = 0;
    this.reticleXMode = false;
    this.jsonOptions = this.extractJsonOptions(this.container);

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

    // Assume that if a button with class 'clipboard-button' exists, we're using copyjack.
    this.isUsingCopyjack = document.querySelector('button.clipboard-button') !== null;

    this.puzzleGridFromCell = function(cell) {
        var ancestor = cell;
        while (ancestor) {
            if (ancestor.puzzleGrid) return ancestor.puzzleGrid;
            ancestor = ancestor.parentElement;
        }

        return this.activeGrid;
    }

    this.dirCodeFromDxDy = function(dx, dy) { return dy * 3 + dx + 4; }
    this.dxFromDirCode = function(dirCode) { return (dirCode % 3) - 1; }
    this.dyFromDirCode = function(dirCode) { return (dirCode - (dirCode % 3)) / 3 - 1; }
    this.rotateDirCode = function(dirCode, rotate) {
        if (!rotate) return dirCode;

        const dirRotates = [0, 1, 2, 5, 8, 7, 6, 3];
        var dirIndex = dirRotates.indexOf(dirCode) + rotate;
        while (dirIndex < 0) dirIndex += 8;
        dirIndex = dirIndex % 8;
        return dirRotates[dirIndex];
    }

    this.setDxDy = function(dx, dy) {
        if (this.dx && !dx) this.container.classList.remove("advance-horizontal");
        else if (this.dy && !dy) this.container.classList.remove("advance-vertical");
        if (!this.dx && dx) this.container.classList.add("advance-horizontal");
        else if (!this.dy && dy) this.container.classList.add("advance-vertical");
        this.dx = dx;
        this.dy = dy;
    }

    this.setActiveGrid = function(grid) {
        if (this.activeGrid === grid) return;

        var dx = 0;
        var dy = 0;
        if (grid.options["data-text-advance-on-type"]) {
            if (grid.numCols > 1) { dx = 1; }        
            else if (grid.numRows > 1) { dy = 1; }        
        }
        this.setDxDy(dx, dy);

        this.canHaveCenterFocus = grid.canHaveText || (grid.fillClasses && grid.options["data-fill-cycle"]) || grid.canDrawPaths || grid.canDrawSpokes;
        this.canHaveCornerFocus = grid.canDrawEdges;
        this.keyboardFocusModel = grid.options["data-no-input"] ? "none" : (this.canHaveCornerFocus ? "corner" : "center");
    
        this.activeGrid = grid;
    }

    // --- Functions to update state ---
    // keyboard support
    this.move = function(td, drow, dcol, jumpFromGrid=false, skipFilled=false) {
        var puzzleGrid = this.puzzleGridFromCell(td);
        var puzzleGridOrig = puzzleGrid;
        var tdOrig = td;
        var drowOrig = drow;
        var dcolOrig = dcol;

        var dirCode = this.dirCodeFromDxDy(dcol, drow);
        dirCode = this.rotateDirCode(dirCode, puzzleGrid.tilt + this.tilt);

        drow = this.dyFromDirCode(dirCode);
        dcol = this.dxFromDirCode(dirCode);

        var parts = td.id.split("-");
        var row = drow + parseInt(parts[1]);
        var col = dcol + parseInt(parts[2]);

        if (this.fShift && (this.activeGrid.canDrawPaths || this.activeGrid.canDrawSpokes)) {
            var tdTo;
            if (td.cellLinks && td.cellLinks[dirCode]) {
                tdTo = td.cellLinks[dirCode];
            }
            else {
                tdTo = puzzleGrid.lookup["cell-" + row + "-" + col];
            }

            if (tdTo && tdTo.classList.contains("inner-cell")) {
                this.lastCell = td;
                this.currentFill = this.findClassInList(td, this.activeGrid.fillClasses);
                this.dragBetweenCells(tdTo, false);
            }
        }

        var usedLink = false;
        while (true) {
            if (td.cellLinks && td.cellLinks[dirCode]) {
                usedLink = true;
                
                td = td.cellLinks[dirCode];
                puzzleGrid = this.puzzleGridFromCell(td);
            }
            else {
                td = puzzleGrid.lookup["cell-" + row + "-" + col];
            }

            if (!td) {
                if (this.activeGrid.options["data-text-advance-style"] == "wrap") {
                    if (dcol == 1 && col == puzzleGrid.numCols && row+1 < puzzleGrid.numRows) {
                        row += 1;
                        col = 0;
                        td = puzzleGrid.lookup["cell-" + row + "-0"];
                    }
                    else if (dcol == -1 && col == -1 && row > 0) {
                        row -= 1;
                        col = puzzleGrid.numCols - 1;
                        td = puzzleGrid.lookup["cell-" + row + "-" + col];
                    }
                }
                if (!td) {
                    if (skipFilled)
                        return this.move(tdOrig, drowOrig, dcolOrig);
                    if (jumpFromGrid && !this.fShift)
                        return this.jumpToNearGrid(tdOrig, drowOrig, dcolOrig);
                    return false;
                }
            }

            var text = td.querySelector(".text span");

            if (text && !td.classList.contains("unselectable") && (!skipFilled || !text.innerText)) {
                if (this.activeGrid.options["data-text-advance-on-type"] && this.activeGrid.options["data-text-advance-style"] != "wrap") {
                    this.setDxDy(Math.abs(dcol), Math.abs(drow));
                }
                this.updateCenterFocus(td);
                if (puzzleGrid != puzzleGridOrig) {
                    var detail = { oldGridId: puzzleGridOrig.puzzleId, newGridId: puzzleGrid.puzzleId };
                    this.container.dispatchEvent(new CustomEvent("puzzlegridnavigate", { detail: detail, bubbles: true }));
                }
                return true;
            }

            if (usedLink) { return false; } // max 1 step after link

            col += dcol;
            row += drow;
        }
    }

    this.jumpToNearGrid = function(td, drow, dcol) {
        let rcActive = this.activeGrid.grid.getBoundingClientRect();
        let igridBest = -1;
        let dzBest = Infinity;
        let puzzleGrid;

        for (let igrid = 0; igrid < this.puzzleGrids.length; ++igrid) {
            let grid, rc;
            if ((puzzleGrid = this.puzzleGrids[igrid]) && (grid = puzzleGrid.grid) && (rc = grid.getBoundingClientRect())) {
                let dz = this.dzDistanceToRect(rcActive, rc, drow, dcol);
                if (dz >= 0 && dz < dzBest) { dzBest = dz; igridBest = igrid; }
            }
        }
        if (igridBest == -1)
            return false;

        rcActive = td.getBoundingClientRect(); // look relative to current cell
        let xActive = (rcActive.left + rcActive.right) / 2;
        let yActive = (rcActive.top + rcActive.bottom) / 2;
        puzzleGrid = this.puzzleGrids[igridBest];
        dzBest = Infinity;
        let tdBest = null;
        puzzleGrid.container.querySelectorAll(".inner-cell").forEach(td => {
            let rc;
            if (td && (rc = td.getBoundingClientRect())) {
                let x = (rc.left + rc.right) / 2;
                let y = (rc.top + rc.bottom) / 2;
                let dz = Math.abs(x - xActive) ** 2 + Math.abs(y - yActive) ** 2;
                if (dz >= 0 && dz < dzBest) { dzBest = dz; tdBest = td; }
            }
        });
        if (!tdBest)
            return false;

        let detail = { oldGridId: this.activeGrid.puzzleId, newGridId: puzzleGrid.puzzleId };
        this.setActiveGrid(puzzleGrid);
        this.updateCenterFocus(tdBest);
        this.container.dispatchEvent(new CustomEvent("puzzlegridnavigate", { detail: detail, bubbles: true }));
        return true;
    }

    // returns distance from rcActive to rc in direction indicated by drow/dcol
    // return will be negative if rc not in indicated direction
    this.dzDistanceToRect = function(rcActive, rc, drow, dcol) {
        if (drow) { // moving up/down
            if (rc.left < rcActive.right && rc.right > rcActive.left)
                return drow > 0 ? rc.top - rcActive.bottom : rcActive.top - rc.bottom;
        } else if (dcol) {
            if (rc.top < rcActive.bottom && rc.bottom > rcActive.top)
                return dcol > 0 ? rc.left - rcActive.right : rcActive.left - rc.right;
        }
        return -1;
    }

    this.moveToEdge = function(e) {
        let td = e.target;
        let puzzleGrid = this.puzzleGridFromCell(td);
        let parts = td.id.split("-");
        let row = parseInt(parts[1]);
        let col = parseInt(parts[2]);
        switch (e.keyCode)
        {
        case 33: // PgUp
            row = 0;
            break;
        case 34: // PgDn
            row = puzzleGrid.numRows - 1;
            break;
        case 35: // End
            col = puzzleGrid.numCols - 1;
            break;
        case 36: // Home
            col = 0;
            break;
        default:
            return;
        }
        td = puzzleGrid.lookup["cell-" + row + "-" + col];
        if (td)
            this.updateCenterFocus(td);
    }

    this.moveCorner = function(dy, dx) {
        var dirCode = this.dirCodeFromDxDy(dx, dy);
        dirCode = this.rotateDirCode(dirCode, this.activeGrid.tilt);

        // check to see if we should hop to an adjacent grid
        if (this.activeGrid.sideLinks && 
            ((dirCode == 1 && this.cornerFocusY == 0) || (dirCode == 7 && this.cornerFocusY == this.activeGrid.numRows) ||
             (dirCode == 3 && this.cornerFocusX == 0) || (dirCode == 5 && this.cornerFocusX == this.activeGrid.numCols))) {
            var sideLink = this.activeGrid.sideLinks[dirCode];
            var adjacentDir;

            for (const [key, value] of Object.entries(sideLink.puzzleGrid.sideLinks)) { if (value.puzzleGrid == this.activeGrid) { adjacentDir = key; }}

            if (adjacentDir == 1 || adjacentDir == 3 || adjacentDir == 5 || adjacentDir == 7) {
                var edgeIsX = dirCode == 1 || dirCode == 7;
                var edgeVal = edgeIsX ? this.cornerFocusX : this.cornerFocusY;
                if (!sideLink.align) { edgeVal = (edgeIsX ? this.activeGrid.numCols : this.activeGrid.numRows) - edgeVal; }

                var detail = { oldGridId: this.activeGrid.puzzleId, newGridId: sideLink.puzzleGrid.puzzleId };

                this.setActiveGrid(sideLink.puzzleGrid);
                dirCode = 8 - adjacentDir;
                if (adjacentDir == 1 || adjacentDir == 7) {
                    this.cornerFocusX = edgeVal;
                    this.cornerFocusY = (adjacentDir == 1) ? 0 : this.activeGrid.numRows;
                } else {
                    this.cornerFocusX = (adjacentDir == 3) ? 0 : this.activeGrid.numCols;
                    this.cornerFocusY = edgeVal;
                }

                this.container.dispatchEvent(new CustomEvent("puzzlegridnavigate", { detail: detail, bubbles: true }));
            }
        }

        dy = this.dyFromDirCode(dirCode);
        dx = this.dxFromDirCode(dirCode);
        
        var newX = dx + this.cornerFocusX;
        var newY = dy + this.cornerFocusY;

        newX = Math.max(newX, 0);
        newX = Math.min(newX, this.activeGrid.numCols);
        newY = Math.max(newY, 0);
        newY = Math.min(newY, this.activeGrid.numRows);

        if (this.fShift && (this.cornerFocusX != newX || this.cornerFocusY != newY)) {
            var xMin = Math.min(this.cornerFocusX, newX);
            var xMax = Math.max(this.cornerFocusX, newX);
            var yMin = Math.min(this.cornerFocusY, newY);
            var yMax = Math.max(this.cornerFocusY, newY);
            var xCell = Math.min(xMin, this.activeGrid.numCols - 1);
            var yCell = Math.min(yMin, this.activeGrid.numRows - 1);
            var edgeState = { puzzleGrid: this.activeGrid, cell: this.activeGrid.lookup["cell-" + yCell + "-" + xCell], edgeCode: 0 };

            if (xMax != xMin) { edgeState.edgeCode |= (yCell == yMax ? 1 : 2); }
            if (yMax != yMin) { edgeState.edgeCode |= (xCell == xMax ? 4 : 8); }
            this.lastEdgeState = null;
            this.setEdgeState(edgeState, this.xKeyMode ? "toggle-x" : "toggle-line");
            this.lastEdgeState = null;
        }

        this.cornerFocusX = newX;
        this.cornerFocusY = newY;
        this.updateCornerFocus();
    }

    this.findClassInList = function(td, classes) {
        var cls = "";
        if (classes) { classes.forEach(c => { if (td.classList.contains(c)) cls = c; }); if (cls === "") cls = classes[0]; }
        return cls;
    }

    this.cycleClasses = function(td, propertyKey, classes, reverse) {
        var cls = this.findClassInList(td, classes);

        if (cls) {
            this.undoManager.startAction(this);
            cls = classes[(classes.indexOf(cls) + classes.length + (reverse ? -1 : 1)) % classes.length];
            this.setClassInCycle(td, propertyKey, classes, cls);
            this.undoManager.endAction();
        }

        return cls;
    }

    this.setClassInCycle = function(td, propertyKey, classes, cls) {
        if (classes && !td.classList.contains(cls)) {
            this.undoManager.addUnit(this.locateGrid(td), td, propertyKey, this.findClassInList(td, classes), cls);
        }
    }

    this.handleEventChar = function(e, ch) {
        if (!this.activeGrid.canHaveAllChars && this.activeGrid.options["data-text-shift-key"] != "none" && (e.shiftKey || this.activeGrid.options["data-text-shift-lock"])) {
            var val = this.getText(e.target).replace("\xa0", " ");
            if (this.activeGrid.options["data-text-shift-key"] == "rebus" || !val.includes(ch)) { val = val + ch; }
            else { val = val.replace(ch, ""); }

            this.setText(e.target, val, true);
        } else {
            this.setText(e.target, ch, false);
            if (this.activeGrid.options["data-text-advance-on-type"]) { this.move(e.target, this.dy, this.dx, false, this.activeGrid.options["data-text-advance-skip-filled"]); }
        }
    }

    this.handleBackspaceChar = function(e) {
        var newVal = "";

        if ((e.shiftKey || this.activeGrid.options["data-text-shift-lock"]) && this.activeGrid.options["data-text-shift-key"] == "rebus") {
            newVal = this.getText(e.target).replace("\xa0", " ");
            newVal = newVal.substring(0, newVal.length - 1);
            if (newVal.length && newVal[newVal.length - 1] == " ") {
                newVal = newVal.substring(0, newVal.length - 1) + "\xa0";
            }
        }

        if (newVal) {
            this.setText(e.target, newVal, e.target.classList.contains("small-text"));
        } else {
            this.setText(e.target, "", false);
            if (this.activeGrid.options["data-text-advance-on-type"]) { this.move(e.target, -this.dy, -this.dx); }
        }
    }

    this.beforeInput = function(e) {
        this.beforeInputOrKeyDown({ target: e.target, keyCode: (e.data ? e.data.toUpperCase().charCodeAt(0) : 46) });
        e.preventDefault();
    }

    this.input = function(e) {
        // beforeInput asked to cancel, but Samsung Galaxy doesn't appear to listen
        var text = e.target.querySelector(".text");
        if (text.firstChild.nodeType === Node.TEXT_NODE) {
            text.firstChild.remove();
        }
        else {
            // TODO build a clone of our span's innerText and replace it here?
            text.firstChild.innerText = text.firstChild.innerText.substring(1);
        }
    }

    this.setTilt = function(e, tilt) {
        this.tilt = (this.tilt == tilt) ? 0 : tilt;
        this.updateSvg(e.target);
    }

    this.toggleReticle = function(e) {
        this.reticleXMode = !this.reticleXMode;
        this.updateSvg(e.target);
    }

    this.keyDown = function(e) {
        this.fShift = e.shiftKey;
        if (e.keyCode == 9) return;
        this.beforeInputOrKeyDown(e);
        e.preventDefault();
    }

    this.beforeInputOrKeyDown = function(e) {
        if (!this.activeGrid.canHaveAllChars && (this.activeGrid.options["data-text-solution"] || this.activeGrid.options["data-no-input"])) { return; }
        
        if (e.ctrlKey && e.keyCode == 90) { this.undoManager.undo(); } // Ctrl-Z
        else if (e.ctrlKey && e.keyCode == 89) { this.undoManager.redo(); } // Ctrl-Y
        else if (e.keyCode == 37) { this.move(e.target, 0, -1, true); } // left
        else if (e.keyCode == 38) { this.move(e.target, -1, 0, true); } // up
        else if (e.keyCode == 39) { this.move(e.target, 0, 1, true); } // right
        else if (e.keyCode == 40) { this.move(e.target, 1, 0, true); } // down
        else if (e.keyCode >= 33 && e.keyCode <= 36) { this.moveToEdge(e); } // pgup/dn, end, home
        else if (e.keyCode == 191 && this.activeGrid.canDrawSpokes) { this.setTilt(e, 1); } // /
        else if (e.keyCode == 220 && this.activeGrid.canDrawSpokes) { this.setTilt(e, -1); } // \
        else if (e.keyCode == 187 && this.fShift && this.activeGrid.canDrawSpokes) { this.toggleReticle(e); } // +
        else if (e.keyCode == 88 && this.activeGrid.canDrawSpokes && !this.activeGrid.options["data-text-characters"].includes("X")) { this.toggleReticle(e); } // x
        else if (e.keyCode == 190 && this.canHaveCornerFocus) { this.setCornerFocusMode(); } // period
        else if (e.keyCode == 32) { // space
            if (e.ctrlKey) {
                this.toggleClass(e.currentTarget, "interesting");
            } else if (this.activeGrid.canHaveAllChars || this.activeGrid.options["data-text-characters"].includes(" ")) {
                this.handleEventChar(e, "\xa0");
            } else {
                let dirToggled = false;
                if (this.activeGrid.options["data-text-advance-on-type"] && this.activeGrid.options["data-text-advance-style"] != "wrap" && this.activeGrid.numCols > 1 && this.activeGrid.numRows > 1) { this.setDxDy(1 - this.dx, 1 - this.dy); dirToggled = true; }
                if (this.activeGrid.options["data-clue-locations"]) { this.unmark(e.target); this.mark(e.target); }
                if (this.activeGrid.options["data-fill-cycle"] && this.activeGrid.fillClasses && this.activeGrid.fillClasses.length > 1) {
                    if (!e.currentTarget.classList.contains("given-fill") || this.activeGrid.canChangeGivenFills) { this.currentFill = this.cycleClasses(e.target, "class-fill", this.activeGrid.fillClasses, e.shiftKey); }
                } else if (!dirToggled) {
                    this.setText(e.target, "", e.target.classList.contains("small-text"));
                    if (this.activeGrid.options["data-text-advance-on-type"])
                        this.move(e.target, this.dy, this.dx);
                }
            }
        } else if (e.keyCode == 8) { // backspace
            this.handleBackspaceChar(e);
        } else if (e.keyCode == 46) { // delete
            this.setText(e.target, "", e.target.classList.contains("small-text"));
        } else {
            var code = e.keyCode;
            if (code >= 96 && code <= 105) { code -= 48; }
            var ch = String.fromCharCode(code);

            if (this.activeGrid.options["data-text-shift-key"] == "none" && e.key.length == 1) { ch = e.key.toUpperCase(); }

            if (this.activeGrid.canHaveAllChars && e.key.length == 1) {
                this.handleEventChar(e, e.key.toUpperCase());
            }
            else if (this.activeGrid.options["data-text-characters"].includes(ch)) {
                this.handleEventChar(e, ch);
            }
        }
    }

    this.keyDownCorner = function(e) {
        this.fShift = e.shiftKey;

        if (e.keyCode == 9) return;

        e.preventDefault();
        if (this.activeGrid.options["data-no-input"]) { return; }
        
        if (e.ctrlKey && e.keyCode == 90) { this.undoManager.undo(); } // Ctrl-Z
        else if (e.ctrlKey && e.keyCode == 89) { this.undoManager.redo(); } // Ctrl-Y
        else if (e.keyCode == 37) { this.moveCorner(0, -1); } // left
        else if (e.keyCode == 38) { this.moveCorner(-1, 0); } // up
        else if (e.keyCode == 39) { this.moveCorner(0, 1); } // right
        else if (e.keyCode == 40) { this.moveCorner(1, 0); } // down
        else if (e.keyCode == 190 && this.canHaveCenterFocus) { this.setCenterFocusMode(); } // period
        else if (e.keyCode == 88) { this.xKeyMode = !this.xKeyMode; this.cornerFocus.classList.toggle("x-mode"); this.updateCornerLabel(); } // toggle "x" mode
    }

    this.setText = function(target, text, smalltext) {
        var textElement = target.querySelector(".text span");
        var wasSmalltext = target.classList.contains("small-text");
        if ((textElement.innerText != text || wasSmalltext != smalltext) && !target.classList.contains("given-text")) {
            var grid = this.locateGrid(target);
            this.undoManager.startAction(this);
            if (wasSmalltext != smalltext) { this.undoManager.addUnit(grid, target, "class-small-text", wasSmalltext ? "small-text" : null, smalltext ? "small-text" : null); }
            if (textElement.innerText != text) { this.undoManager.addUnit(grid, target, "text", textElement.innerText, text); }
            this.undoManager.endAction();
        }
    }

    this.getText = function(target) {
        return target.querySelector(".text span").innerText;
    }

    this.toggleClass = function(target, className) {
        var grid = this.locateGrid(target);
        var wasSet = target.classList.contains(className);
        this.undoManager.startAction(this);
        this.undoManager.addUnit(grid, target, "class-" + className, wasSet ? className : null, wasSet ? null : className);
        this.undoManager.endAction();
    }

    this.precisionHitTestSubregion = function(cell, clientX, clientY, style) {
        var region = document.createElement('div');
        region.style.cssText = "z-index:10000;" + style;
        cell.appendChild(region);

        var hit = (document.elementFromPoint(clientX, clientY) == region);
        cell.removeChild(region);

        return hit;
    }

    this.getEventEdgeState = function(cell, clientX, clientY) {
        var closeTop;
        var closeBottom;
        var closeLeft;
        var closeRight;

        var puzzleGrid = this.puzzleGridFromCell(cell);

        if (!this.usePrecisionHitTesting) {
            var tolerance = cell.offsetWidth/5;
            var cellClientRect = cell.getBoundingClientRect();
            var offsetX = clientX - cellClientRect.x;
            var offsetY = clientY - cellClientRect.y;
    
            closeTop = (offsetY <= tolerance);
            closeBottom = (offsetY >= cell.offsetHeight - tolerance);
            closeLeft = (offsetX <= tolerance);
            closeRight = (offsetX >= cell.offsetWidth - tolerance);
        } else {
            closeTop = this.precisionHitTestSubregion(cell, clientX, clientY, "position: absolute; left: 0%; top: 0%; width: 100%; height: 20%;");
            closeBottom = this.precisionHitTestSubregion(cell, clientX, clientY, "position: absolute; left: 0%; top: 80%; width: 100%; height: 20%;");
            closeLeft = this.precisionHitTestSubregion(cell, clientX, clientY, "position: absolute; top: 0%; left: 0%; height: 100%; width: 20%;");
            closeRight = this.precisionHitTestSubregion(cell, clientX, clientY, "position: absolute; top: 0%; left: 80%; height: 100%; width: 20%;");
        }

        if (closeBottom || closeRight) {
            var parts = cell.id.split("-");
            var row = parseInt(parts[1]);
            var col = parseInt(parts[2]);

            if (closeBottom && row < puzzleGrid.numRows - 1) { closeBottom = false; closeTop = true; row++; }
            if (closeRight && col < puzzleGrid.numCols - 1) { closeRight = false; closeLeft = true; col++; }

            cell = puzzleGrid.lookup["cell-" + row + "-" + col];
        }

        var any = closeLeft || closeRight || closeTop || closeBottom;

        // edgecode is a "four-bit integer":
        //  - The rightmost bit is 1 iff the top border is shaded.
        //  - The 2nd-to-rightmost bit is 1 iff the bottom border is shaded.
        //  - The 2nd-to-leftmost bit is 1 iff the left border is shaded.
        //  - The leftmost bit is 1 iff the right border is shaded.
        var edgeCode = 0;
        if (closeTop && !closeLeft && !closeRight) { edgeCode = 1; }
        else if (closeBottom && !closeLeft && !closeRight) { edgeCode = 2; }
        else if (closeLeft && !closeTop && !closeBottom) { edgeCode = 4; }
        else if (closeRight && !closeTop && !closeBottom) { edgeCode = 8; }

        if (edgeCode == 0 && (closeTop || closeBottom || closeLeft || closeRight)) {
            var parts = cell.id.split("-");
            var row = parseInt(parts[1]);
            var col = parseInt(parts[2]);
            if (this.canHaveCornerFocus) {
                this.setCornerFocusMode();
                this.setActiveGrid(puzzleGrid);
                this.cornerFocusX = col + (closeRight ? 1 : 0);
                this.cornerFocusY = row + (closeBottom ? 1 : 0);
                this.updateCornerFocus();
            }
        }

        return { puzzleGrid: puzzleGrid, cell: cell, edgeCode: edgeCode, any: any };
    }

    this.setEdgeCode = function(edgeState, codeName, oldCode) {
        this.undoManager.addUnit(edgeState.puzzleGrid, edgeState.cell, codeName, oldCode, oldCode ^ edgeState.edgeCode);

        if (!edgeState.cell.cellLinks) return;

        const edgeDirCodes = [1, 2, 4, 8];
        const linkDirCodes = [1, 7, 3, 5];
        const linkCodeTranslate = [0, 1, 0, 4, 0, 8, 0, 2, 0];

        for (var codeIndex = 0; codeIndex < 4; codeIndex++) {
            if (edgeState.edgeCode & edgeDirCodes[codeIndex]) {
                var link = edgeState.cell.cellLinks[linkDirCodes[codeIndex]];
                if (link) {
                    for (const [key, value] of Object.entries(link.cellLinks)) {
                        if (value == edgeState.cell) {
                            var oldLinkCode = link.getAttribute(codeName);
                            this.undoManager.addUnit(this.locateGrid(link), link, codeName, oldLinkCode, oldLinkCode ^ linkCodeTranslate[key]);
                        }
                    }
                }
            }
        }
    }

    this.setEdgeState = function(edgeState, mode) {
        if (edgeState.edgeCode == 0) return;
        if (this.lastEdgeState != null && this.lastEdgeState.cell === edgeState.cell && this.lastEdgeState.edgeCode === edgeState.edgeCode) return;

        var givenEdgeCode = edgeState.cell.getAttribute("data-given-edge-code");
        if ((givenEdgeCode & edgeState.edgeCode) && !this.recordingProperties["data-edges"]) return;
        
        var curEdgeCode = edgeState.cell.getAttribute("data-edge-code");
        var curXEdgeCode = edgeState.cell.getAttribute("data-x-edge-code");
        var curEdgeVal = (curEdgeCode & edgeState.edgeCode) ? 1 : ((curXEdgeCode & edgeState.edgeCode) ? -1 : 0);

        if (!this.lastEdgeState) {
            this.fromEdgeVal = curEdgeVal;
            switch(mode) {
                case "cycle-front": this.toEdgeVal = this.fromEdgeVal + 1; break;
                case "cycle-back": this.toEdgeVal = this.fromEdgeVal - 1; break;
                case "toggle-line": this.toEdgeVal = (this.fromEdgeVal == 1) ? 0 : 1; break;
                case "toggle-x": this.toEdgeVal = (this.fromEdgeVal == -1) ? 0 : -1; break;
            }
            if (this.toEdgeVal > 1) { this.toEdgeVal -= 3; }
            if (this.toEdgeVal < -1) { this.toEdgeVal += 3; }
        }

        this.lastEdgeState = edgeState;

        if (curEdgeVal != this.fromEdgeVal) return;

        this.undoManager.startAction(this);
        if (this.fromEdgeVal == 1 || this.toEdgeVal == 1) this.setEdgeCode(edgeState, "data-edge-code", curEdgeCode);
        if (this.fromEdgeVal == -1 || this.toEdgeVal == -1) this.setEdgeCode(edgeState, "data-x-edge-code", curXEdgeCode);
        this.undoManager.endAction();
    }

    this.canAdvanceHoriz = function(td) { return this.canAdvance(td, 0, 1, 0x0c); }
    this.canAdvanceVert = function(td) { return this.canAdvance(td, 1, 0, 0x03); }
    this.canAdvance = function(td, drow, dcol, codeMask) {
        let edgeCode = td.getAttribute("data-edge-code");
        if (edgeCode & codeMask == codeMask)
            return false;
        let parts = td.id.split("-");
        let row = parseInt(parts[1]);
        let col = parseInt(parts[2]);
        let puzzleGrid = this.puzzleGridFromCell(td);
        let tdT = puzzleGrid.lookup["cell-" + (row - drow) + "-" + (col - dcol)];
        if (tdT && !tdT.classList.contains("unselectable"))
            return true;
        tdT = puzzleGrid.lookup["cell-" + (row + drow) + "-" + (col + dcol)];
        return tdT && !tdT.classList.contains("unselectable");
    }

    this.endPointerIsDown = function() {
        if (!this.pointerIsDown) return;

        this.pointerIsDown = false;
        this.puzzleGrids.forEach(p => { p.saveState(); });
    }

    this.pointerDown = function(e) {
        if (this.pointerIsDown) { this.endPointerIsDown(); return; }

        this.pointerIsDown = true;

        var grid = this.puzzleGridFromCell(e.currentTarget);
        if (grid !== this.activeGrid) { this.setActiveGrid(grid); }

        if (e.target.hasPointerCapture(e.pointerId)) { e.target.releasePointerCapture(e.pointerId); }

        if (!e.ctrlKey && this.activeGrid.options["data-text-advance-on-type"] && this.activeGrid.options["data-text-advance-style"] != "wrap" && this.activeGrid.numCols > 1 && this.activeGrid.numRows > 1) {
            if (document.activeElement == e.currentTarget) {
                this.setDxDy(1 - this.dx, 1 - this.dy);
                e.currentTarget.blur(); e.currentTarget.focus(); // Re-render the highlighting direction.
            } else {
                if (this.dx) {
                    if (!this.canAdvanceHoriz(e.target) && this.canAdvanceVert(e.target))
                        this.setDxDy(0, 1);
                } else if (this.dy) {
                    if (!this.canAdvanceVert(e.target) && this.canAdvanceHoriz(e.target))
                        this.setDxDy(1, 0);
                }
            }
        }
        this.lastCell = e.currentTarget;
        this.currentFill = null;

        if (e.ctrlKey) {
            this.toggleClass(e.currentTarget, "interesting");
            e.preventDefault();
            return;
        }

        if (this.activeGrid.canDrawEdges) {
            var edgeState = this.getEventEdgeState(e.currentTarget, e.clientX, e.clientY);
            this.lastEdgeState = null;
            this.setEdgeState(edgeState, (e.button > 0 || e.shiftKey) ? "cycle-back" : "cycle-front");
            if (edgeState.any) {
                e.preventDefault();
                return;
            }
        }
        
        if (this.activeGrid.options["data-fill-cycle"] && (!e.currentTarget.classList.contains("given-fill") || this.activeGrid.canChangeGivenFills)) { this.currentFill = this.cycleClasses(e.currentTarget, "class-fill", this.activeGrid.fillClasses, e.button > 0 || e.shiftKey); }
        else { this.currentFill = this.findClassInList(e.currentTarget, this.activeGrid.fillClasses); }
        
        if (this.canHaveCenterFocus) {
            this.setCenterFocusMode();
            this.updateCenterFocus(e.currentTarget);
        }
        e.preventDefault();
    }

    this.pointerMove = function(e) {
        if (!this.pointerIsDown) return;

        e.preventDefault();

        var dragBetweenCells;

        if (!this.usePrecisionHitTesting) {
            var cellClientRect = e.currentTarget.getBoundingClientRect();
            var centerOffsetX = e.clientX - cellClientRect.x - e.currentTarget.offsetWidth/2;
            var centerOffsetY = e.clientY - cellClientRect.y - e.currentTarget.offsetHeight/2;
    
            dragBetweenCells = ((centerOffsetX * centerOffsetX + centerOffsetY * centerOffsetY) * 4 < e.currentTarget.offsetWidth * e.currentTarget.offsetHeight);
        } else {
            dragBetweenCells = this.precisionHitTestSubregion(e.currentTarget, e.clientX, e.clientY, "top: 0; left: 0; width: 100%; height: 100%; border-radius: 100%")
        }

        if (dragBetweenCells) { this.dragBetweenCells(e.currentTarget, e.buttons > 1); }

        if (this.activeGrid.canDrawEdges && !this.currentFill) {
            var edgeState = this.getEventEdgeState(e.currentTarget, e.clientX, e.clientY);
            this.setEdgeState(edgeState, (e.button > 0 || e.shiftKey) ? "cycle-back" : "cycle-front");
        }
    }

    this.pointerCancel = function(e) {
        this.endPointerIsDown();
    }

    this.dragBetweenCells = function(to, rightMouse) {
        if (this.lastCell === to) return;

        var wantPaint = this.activeGrid.options["data-drag-paint-fill"] && !!this.currentFill;
        var canPaint = wantPaint;

        this.undoManager.startAction(this);

        if (wantPaint && (this.activeGrid.canDrawPaths || this.activeGrid.canDrawSpokes)) {
            var targetFill = this.findClassInList(to, this.activeGrid.fillClasses);
            var setLast = false; 
            if (wantPaint && this.currentFill == this.activeGrid.fillClasses[0]) { this.currentFill = targetFill; setLast = true; }
            if (wantPaint && targetFill != this.activeGrid.fillClasses[0] && targetFill != this.currentFill) { canPaint = false; }
        }

        if (this.activeGrid.canDrawSpokes && (!wantPaint || canPaint)) {
            canPaint &= this.LinkCellsSpoke(this.lastCell, to, rightMouse);
        }

        if (this.activeGrid.canDrawPaths && (!wantPaint || canPaint)) {
            canPaint &= this.LinkCellsPath(this.lastCell, to);
        }

        if (canPaint && (!to.classList.contains("given-fill") || this.activeGrid.canChangeGivenFills)) {
            this.setClassInCycle(to, "class-fill", this.activeGrid.fillClasses, this.currentFill);
        }

        if (canPaint && setLast) { this.setClassInCycle(this.lastCell, "class-fill", this.activeGrid.fillClasses, this.currentFill); }

        var didWork = this.undoManager.endAction();

        if (!wantPaint || canPaint) {
            this.lastCell = to;
            if (didWork) { this.updateCenterFocus(to); }
        }
    }

    this.getOptionArray = function(options, option, splitchar, special) {
        var val = options[option];
        if (/^\[.*\]$/.test(val)) {
            try {
                val = JSON.parse(val.replaceAll("'", '"'));
            } catch {}
        }
        if (!val || Array.isArray(val) || val == special) { return val; }
        return val.split(splitchar);
    }

    this.getOptionDict = function(options, option) {
        var val = options[option];
        if (typeof val === 'string' || val instanceof String) {
            try {
                val = JSON.parse(val.replaceAll("'", '"'));
            } catch {
                val = null;
            }
        }
        return val;
    }

    this.getOptionPosArray = function(options, option, splitchar) {
        var apos = this.getOptionArray(options, option, splitchar);
        if (!apos)
            return [];
        return apos.map((pos) => { return (pos && pos != "none") ? "pos-" + pos : ""; });
    }

    this.cluePointerEnter = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.content.querySelectorAll(".cell[data-across-cluenumber='" + acrosscluenumber + "']").forEach(cell => { cell.classList.add("hovered"); }); }
        if (downcluenumber) { this.content.querySelectorAll(".cell[data-down-cluenumber='" + downcluenumber + "']").forEach(cell => { cell.classList.add("hovered"); }); }
    }

    this.cluePointerLeave = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.content.querySelectorAll(".cell[data-across-cluenumber='" + acrosscluenumber + "']").forEach(cell => { cell.classList.remove("hovered"); }); }
        if (downcluenumber) { this.content.querySelectorAll(".cell[data-down-cluenumber='" + downcluenumber + "']").forEach(cell => { cell.classList.remove("hovered"); }); }
    }

    this.clueClick = function(e) {
        var acrosscluenumber = e.currentTarget.getAttribute("data-across-cluenumber");
        var downcluenumber = e.currentTarget.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) { this.setDxDy(1, 0); this.content.querySelector(".cell[data-across-cluenumber='" + acrosscluenumber + "']").focus(); }
        if (downcluenumber) { this.setDxDy(0, 1); this.content.querySelector(".cell[data-down-cluenumber='" + downcluenumber + "']").focus(); }
    }

    this.scrollClue = function(li) {
        const ol = li.parentElement;
        if (li.offsetTop < ol.scrollTop ||
                li.offsetTop + li.offsetHeight > ol.scrollTop + ol.clientHeight) {
            ol.scrollTop = li.offsetTop + (li.offsetHeight - ol.clientHeight) / 2 - ol.offsetTop;
      }
    }

    this.mark = function(cell) {
        if (this.activeGrid.options["data-clue-locations"] !== "crossword") return;
        
        // Strip highlighting on all cells.
        this.content.querySelectorAll(".cell[data-across-cluenumber]").forEach(td => { td.classList.remove("marked"); });
        this.content.querySelectorAll(".cell[data-down-cluenumber]").forEach(td => { td.classList.remove("marked"); });
        // Now reapply the highlighting to relevant cells and clues.
        var acrosscluenumber = cell.getAttribute("data-across-cluenumber");
        var downcluenumber = cell.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) {
            const li = this.container.querySelector("li[data-across-cluenumber='" + acrosscluenumber + "']");
            if (li) {
                li.classList.add("marked");
                this.scrollClue(li);
            }
            if (this.dx !== 0) {
                this.content.querySelectorAll(".cell[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.add("marked"); });
            }
        }
        if (downcluenumber) {
            const li = this.container.querySelector("li[data-down-cluenumber='" + downcluenumber + "']");
            if (li) {
                li.classList.add("marked");
                this.scrollClue(li);
            }
            if (this.dy !== 0) {
                this.content.querySelectorAll(".cell[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.add("marked"); });
            }
        }
    }

    this.unmark = function(cell) {
        if (this.activeGrid.options["data-clue-locations"] !== "crossword") return;

        var acrosscluenumber = cell.getAttribute("data-across-cluenumber");
        var downcluenumber = cell.getAttribute("data-down-cluenumber");
        if (acrosscluenumber) {
            this.container.querySelectorAll("li[data-across-cluenumber='" + acrosscluenumber + "']").forEach(li => { li.classList.remove("marked"); });
            if (this.dx !== 0) {
                this.content.querySelectorAll(".cell[data-across-cluenumber='" + acrosscluenumber + "']").forEach(td => { td.classList.remove("marked"); });
            }
        }
        if (downcluenumber) {
            this.container.querySelectorAll("li[data-down-cluenumber='" + downcluenumber + "']").forEach(li => { li.classList.remove("marked"); });
            if (this.dy !== 0) {
                this.content.querySelectorAll(".cell[data-down-cluenumber='" + downcluenumber + "']").forEach(td => { td.classList.remove("marked"); });
            }
        }
    }

    this.locateGrid = function(element) {
        if (this.puzzleGrids.length == 1) { return this.puzzleGrids[0]; }

        while (element) {
            if (element.puzzleGrid) return element.puzzleGrid;
            element = element.parentElement;
        }
    }

    this.updateSvg = function(td) {
        this.locateGrid(td).updateSvg(td);
    }

    this.IsFullyLinked = function(code, maxLinks) {
        if (!maxLinks) return false;

        code = parseInt(code);
        maxLinks = parseInt(maxLinks);

        var linkCount = 0;
        while (code) { linkCount++; code &= (code - 1); }
        return (linkCount >= maxLinks);
    }

    this.LinkCellsDirectional = function(attributeNameBase, maxLinks, cellFrom, directionFrom, cellTo, directionTo) {
        var attributeName = "data-" + attributeNameBase + "-code";
        var codeFrom = cellFrom.getAttribute(attributeName);
        var codeTo = cellTo.getAttribute(attributeName);
        if (!codeFrom) { codeFrom = 0; } else { codeFrom = parseInt(codeFrom); }
        if (!codeTo) { codeTo = 0; } else { codeTo = parseInt(codeTo); }
        var currentSpokeLevel = 0;
        var maxSpokeLevels = parseInt(this.activeGrid.options["data-spoke-levels"]) + 1;
        if (attributeNameBase.includes("spoke")) {
            if ((codeFrom & directionFrom) && (codeTo & directionTo) && (attributeNameBase === "spoke")) { currentSpokeLevel++; }
            else {
                for (var l = 2; l < maxSpokeLevels; l++) {
                    var tempName = "data-spoke-" + l.toString() + "-code";
                    var tempCodeFrom = cellFrom.getAttribute(tempName);
                    var tempCodeTo = cellTo.getAttribute(tempName);
                    if (!tempCodeFrom) { tempCodeFrom = 0; } else { tempCodeFrom = parseInt(tempCodeFrom); }
                    if (!tempCodeTo) { tempCodeTo = 0; } else { tempCodeTo = parseInt(tempCodeTo); }
                    if ((tempCodeFrom & directionFrom) && (tempCodeTo & directionTo)) { 
                        currentSpokeLevel = l; 
                        if (attributeNameBase === "spoke") {
                            attributeNameBase = "spoke-" + l.toString();
                            attributeName = "data-" + attributeNameBase + "-code";
                            codeFrom = tempCodeFrom;
                            codeTo = tempCodeTo;
                        }
                        break; 
                    }
                }
            }
        }
        var fromGrid = this.puzzleGridFromCell(cellFrom);
        var toGrid = this.puzzleGridFromCell(cellTo);

        if (!(codeFrom & directionFrom) && !(codeTo & directionTo) && (attributeNameBase.startsWith("x-") || (!this.IsFullyLinked(codeFrom, maxLinks) && !this.IsFullyLinked(codeTo, maxLinks)))) {
            var otherAttributeName = (attributeNameBase.startsWith("x-") ? attributeName.replace(attributeNameBase, attributeNameBase.substring(2)) : attributeName.replace(attributeNameBase, "x-" + attributeNameBase));
            if ((otherAttributeName === "data-spoke-code") && (currentSpokeLevel > 1)) {
                otherAttributeName = otherAttributeName.replace("spoke", "spoke-" + currentSpokeLevel.toString());
            }
            var otherFrom = cellFrom.getAttribute(otherAttributeName);
            var otherTo = cellTo.getAttribute(otherAttributeName);
            if (!otherFrom) { otherFrom = 0; } else { otherFrom = parseInt(otherFrom); }
            if (!otherTo) { otherTo = 0; } else { otherTo = parseInt(otherTo); }

            this.undoManager.addUnit(fromGrid, cellFrom, attributeName, codeFrom, codeFrom | directionFrom);
            this.undoManager.addUnit(toGrid, cellTo, attributeName, codeTo, codeTo | directionTo);

            if (otherFrom) { this.undoManager.addUnit(fromGrid, cellFrom, otherAttributeName, parseInt(otherFrom), parseInt(otherFrom) & ~directionFrom); }
            if (otherTo) { this.undoManager.addUnit(toGrid, cellTo, otherAttributeName, parseInt(otherTo), parseInt(otherTo) & ~directionTo); }
            return true;
        }
        else if ((codeFrom & directionFrom) && (codeTo & directionTo)) {
            var givenAttributeName = "data-given-" + attributeNameBase + "-code";
            var recording = (this.recordingProperties[`data-${attributeNameBase}s`])
            var givenCodeFrom = cellFrom.getAttribute(givenAttributeName);
            var givenCodeTo = cellTo.getAttribute(givenAttributeName);
            if (!givenCodeFrom || recording) { givenCodeFrom = 0; } else { givenCodeFrom = parseInt(givenCodeFrom); }
            if (!givenCodeTo || recording) { givenCodeTo = 0; } else { givenCodeTo = parseInt(givenCodeTo); }
            if (!(givenCodeFrom & directionFrom) && !(givenCodeTo & directionTo)) {
                this.undoManager.addUnit(fromGrid, cellFrom, attributeName, codeFrom, codeFrom & ~directionFrom);
                this.undoManager.addUnit(toGrid, cellTo, attributeName, codeTo, codeTo & ~directionTo);

                if ((currentSpokeLevel > 0) && ((currentSpokeLevel + 1) < maxSpokeLevels) && attributeNameBase.includes("spoke")) {
                    var otherAttributeName = "data-spoke-" + (currentSpokeLevel + 1).toString() + "-code";
                    var otherFrom = cellFrom.getAttribute(otherAttributeName);
                    var otherTo = cellTo.getAttribute(otherAttributeName);
                    if (!otherFrom) { otherFrom = 0; } else { otherFrom = parseInt(otherFrom); }
                    if (!otherTo) { otherTo = 0; } else { otherTo = parseInt(otherTo); }
                    this.undoManager.addUnit(fromGrid, cellFrom, otherAttributeName, otherFrom, otherFrom | directionFrom);
                    this.undoManager.addUnit(toGrid, cellTo, otherAttributeName, otherTo, otherTo | directionTo);
                }

                if (this.activeGrid.options["data-drag-paint-fill"]) {
                    if ((codeFrom & ~directionFrom) == 0 && !attributeNameBase.startsWith("x-") && (!cellFrom.classList.contains("given-fill") || this.activeGrid.canChangeGivenFills)) {
                        this.setClassInCycle(cellFrom, "class-fill", this.activeGrid.fillClasses, this.activeGrid.fillClasses ? this.activeGrid.fillClasses[0] : null);
                    }
                    if ((codeTo & ~directionTo) == 0 && !attributeNameBase.startsWith("x-") && (!cellTo.classList.contains("given-fill") || this.activeGrid.canChangeGivenFills)) {
                        this.setClassInCycle(cellTo, "class-fill", this.activeGrid.fillClasses, this.activeGrid.fillClasses ? this.activeGrid.fillClasses[0] : null);
                    }
                }
                return true;
            }
        }

        return false;
    }

    this.LinkCellsPath = function(cellFrom, cellTo)
    {
        var maxDirections = this.activeGrid.options["data-path-max-directions"];

        if (this.puzzleGridFromCell(cellFrom) == this.puzzleGridFromCell(cellTo)) {
            var partsFrom = cellFrom.id.split("-");
            var rowFrom = parseInt(partsFrom[1]);
            var colFrom = parseInt(partsFrom[2]);
            var partsTo = cellTo.id.split("-");
            var rowTo = parseInt(partsTo[1]);
            var colTo = parseInt(partsTo[2]);

            if (colFrom === colTo) {
                if (rowFrom === rowTo - 1) { return this.LinkCellsDirectional("path", maxDirections, cellFrom, 2, cellTo, 1); }
                else if (rowFrom === rowTo + 1) { return this.LinkCellsDirectional("path", maxDirections, cellFrom, 1, cellTo, 2); }
            }
            else if (rowFrom === rowTo) {
                if (colFrom === colTo - 1) { return this.LinkCellsDirectional("path", maxDirections, cellFrom, 8, cellTo, 4); }
                else if (colFrom === colTo + 1) { return this.LinkCellsDirectional("path", maxDirections, cellFrom, 4, cellTo, 8); }
            }
        } else {
            var fromDir, toDir;
            const fromVals = [0, 1, 0, 4, 0, 8, 0, 2, 0];

            if (cellFrom.cellLinks) {
                for (const [key, value] of Object.entries(cellFrom.cellLinks)) {
                    if (value == cellTo) { fromDir = fromVals[key]; }
                }
            }
            if (cellTo.cellLinks) {
                for (const [key, value] of Object.entries(cellTo.cellLinks)) {
                    if (value == cellFrom) { toDir = fromVals[key]; }
                }
            }

            if (fromDir && toDir) { return this.LinkCellsDirectional("path", maxDirections, cellFrom, fromDir, cellTo, toDir); }
        }

        return false;
    }

    this.LinkCellsSpoke = function(cellFrom, cellTo, rightMouse) {
        var fromDir, toDir;

        const fromVals = [128, 1, 2, 64, 0, 4, 32, 16, 8];
    
        if (this.puzzleGridFromCell(cellFrom) == this.puzzleGridFromCell(cellTo)) {
            var partsFrom = cellFrom.id.split("-");
            var rowFrom = parseInt(partsFrom[1]);
            var colFrom = parseInt(partsFrom[2]);
            var partsTo = cellTo.id.split("-");
            var rowTo = parseInt(partsTo[1]);
            var colTo = parseInt(partsTo[2]);
    
            if ((colFrom === colTo && rowFrom === rowTo) || Math.abs(colFrom - colTo) > 1 || Math.abs(rowFrom - rowTo) > 1) return false;
            if (((this.activeGrid.options["data-spoke-allowed-directions"] === "x") || (this.activeGrid.options["data-spoke-allowed-directions"] === "X")) && ((colFrom === colTo) || (rowFrom === rowTo))) return false;
            if ((this.activeGrid.options["data-spoke-allowed-directions"] === "+") && (colFrom !== colTo) && (rowFrom !== rowTo)) return false;
    
            var index = (rowTo - rowFrom + 1) * 3 + (colTo - colFrom + 1);
            fromDir = fromVals[index];
            toDir = fromVals[8 - index];
        } else {
            if (cellFrom.cellLinks) {
                for (const [key, value] of Object.entries(cellFrom.cellLinks)) {
                    if (value == cellTo) { fromDir = fromVals[key]; }
                }
            }
            if (cellTo.cellLinks) {
                for (const [key, value] of Object.entries(cellTo.cellLinks)) {
                    if (value == cellFrom) { toDir = fromVals[key]; }
                }
            }

            if (!fromDir || !toDir) return false;
        }

        return this.LinkCellsDirectional((rightMouse ^ this.reticleXMode) ? "x-spoke" : "spoke", this.activeGrid.options["data-spoke-max-directions"], cellFrom, fromDir, cellTo, toDir);
    }

    this.setCornerFocusMode = function(notyet) {
        if (this.firstCenterFocus) { this.firstCenterFocus.tabIndex = -1; }

        if (this.cornerFocus == null) {
            this.cornerFocus = document.createElement("div");
            this.cornerFocus.classList.add("corner-focus");
            this.cornerFocus.addEventListener("keydown",  e => { this.keyDownCorner(e); });
            this.activeGrid.grid.appendChild(this.cornerFocus);

            this.cornerFocusX = 0;
            this.cornerFocusY = 0;
        }

        this.cornerFocus.tabIndex = 0;
        if (!notyet) { this.cornerFocus.focus(); }
        this.updateCornerFocus();
    }

    this.setCenterFocusMode = function(notyet) {
        if (this.cornerFocus) { this.cornerFocus.tabIndex = -1; }
        this.firstCenterFocus.tabIndex = 0;
        if (!notyet && this.currentCenterFocus) { this.currentCenterFocus.focus(); }
    }

    this.getCornerEdgeLabelData = function(row, col, dirName, dirCode) {
        const cell = this.activeGrid.lookup[`cell-${row}-${col}`];
        if (!cell) return "";

        const edgeCode = cell.getAttribute("data-edge-code");
        const givenEdgeCode = cell.getAttribute("data-given-edge-code");
        const xEdgeCode = cell.getAttribute("data-x-edge-code");
        const edgeEditable = this.activeGrid.canDrawEdges;
        if ((edgeCode & dirCode) || (xEdgeCode & dirCode)) { return `Corner has ${dirName} edge${(xEdgeCode & dirCode) ? " blocker" : ""}, which is ${(edgeEditable && (givenEdgeCode & dirCode) == 0) ? "editable" : "not editable"}. `; }
        return "";
    }

    this.getCornerCenterLabelData = function(row, col, dirName) {
        const cell = this.activeGrid.lookup[`cell-${row}-${col}`];
        if (!cell) return "";

        const text = cell.querySelector(".text").innerText;
        if (text) { return `Corner has a clue to the ${dirName}, which says ${text}. `; }
        return "";
    }

    this.updateCornerLabel = function() {
        var NSdir = "North";
        var EWdir = "west";
        var NScode = 1;
        var EWcode = 4;
        var backRow = 1;
        var backCol = 1;
        var row = this.cornerFocusY;
        var col = this.cornerFocusX;
        if (row == this.activeGrid.numRows) { row--; NSdir = "South"; NScode = 2; backRow = 0; }
        if (col == this.activeGrid.numCols) { col--; EWdir = "east"; EWcode = 8; backCol = 0; }

        var label = `Corner mode, drawing ${this.xKeyMode ? "edge blockers" : "edges"}. Cursor is at the ${NSdir}${EWdir} corner of the cell in row ${row} and column ${col}. `;
        if (row > 0) { label += this.getCornerEdgeLabelData(row - backRow, col, "a North", EWcode); }
        if (EWcode != 8) { label += this.getCornerEdgeLabelData(row, col, "an East", NScode); }
        if (NScode != 2) { label += this.getCornerEdgeLabelData(row, col, "a South", EWcode); }
        if (col > 0) { label += this.getCornerEdgeLabelData(row, col - backCol, "a West", NScode); }
        if (row > 0 && col > 0) { label += this.getCornerCenterLabelData(row - backRow, col - backCol, "Northwest"); }
        if (row > 0 && EWcode != 8) { label += this.getCornerCenterLabelData(row - backRow, col, "Northeast"); }
        if (NScode != 2 && col > 0) { label += this.getCornerCenterLabelData(row, col - backCol, "Southwest"); }
        if (NScode != 2 && EWcode != 8) { label += this.getCornerCenterLabelData(row, col, "Southeast"); }

        if (this.activeGrid.screenreaderSupported) { this.cornerFocus.ariaLabel = label; }
    }

    this.updateCornerFocus = function() {
        var topLeftTD = this.activeGrid.lookup["cell-0-0"];
        if (this.cornerFocus.parentElement != this.activeGrid.grid) { this.cornerFocus.ariaLabel = ""; this.cornerFocus.parentElement.removeChild(this.cornerFocus); this.activeGrid.grid.appendChild(this.cornerFocus); this.cornerFocus.focus(); }
        this.cornerFocus.style.left = (topLeftTD.offsetLeft + this.cornerFocusX * topLeftTD.offsetWidth) + "px";
        this.cornerFocus.style.top = (topLeftTD.offsetTop + this.cornerFocusY * topLeftTD.offsetHeight) + "px";
        this.updateCornerLabel();
    }

    this.updateCenterFocus = function(center) {
        var oldCenter = this.currentCenterFocus;

        this.currentCenterFocus = center;
        this.currentCenterFocus.focus();

        if (this.activeGrid.canDrawSpokes) {
            if (oldCenter) this.updateSvg(oldCenter);
            if (center) this.updateSvg(center);
        }
    }

    this.closeAbout = function() {
        this.container.querySelector(".puzzle-about-back").remove();
        this.container.querySelector(".puzzle-about").remove();

        if (this.oldFocus) { this.oldFocus.focus(); this.oldFocus = null; }
    }

    this.aboutPopup = function() {
        var lines = [];
        lines.push("<div class='puzzle-about-back no-copy'></div>");
        lines.push("<div class='puzzle-about no-copy'>");
        lines.push("<div class='puzzle-about-scroller'>");
        lines.push("<div class='puzzle-about-savedstate'>This puzzle will save its state when you leave/refresh the page.</div>");
        lines.push("<table>");
        lines.push("<tr><th>Function</th><th>Keyboard</th><th>Mouse/Touch</th></tr>");
        lines.push("<tr><td>Reset saved state</td><td>N/A</td><td>Reset Button</td></tr>");
        lines.push("<tr><td>Undo/Redo</td><td>Ctrl+Z/Y</td><td>Undo/Redo Buttons</td></tr>");
        if (this.activeGrid.canHaveText) {
            if (this.activeGrid.options["data-text-shift-lock"]) {
                lines.push("<tr><td>Multiple-character text entry</td><td>Type to append; Backspace to remove, Del to clear</td><td>N/A</td></tr>");
            } else {
                lines.push("<tr><td>Single-character text entry</td><td>Type to replace; Backspace/Del to clear</td><td>N/A</td></tr>");
                if (this.activeGrid.options["data-text-shift-key"] == "rebus") {
                    lines.push("<tr><td>Rebus clue text entry</td><td>Shift-Type to append; Shift-Backspace to remove</td><td>N/A</td></tr>");
                } else if (this.activeGrid.options["data-text-shift-key"] == "candidates") {
                    lines.push("<tr><td>Candidate-value text entry</td><td>Shift-Type to toggle a character</td><td>N/A</td></tr>");
                }
            }
        }
        if (this.canHaveCenterFocus) {
            if (this.activeGrid.canDrawSpokes) {
                lines.push("<tr><td>Navigate between cells (8 directions)</td><td>Arrow keys, plus / or \\ to toggle axis tilt</td><td>Click a cell</td></tr>");
            } else {
                lines.push("<tr><td>Navigate between cells (4 directions)</td><td>Arrow keys</td><td>Click a cell</td></tr>");
            }
        }
        if (this.activeGrid.fillClasses && this.activeGrid.fillClasses.length > 0 && this.activeGrid.options["data-fill-cycle"]) {
            lines.push("<tr><td>Change cell background (forwards or backwards)</td><td>Space or Shift-Space</td><td>Click/Left-Click or Right/Shift-Click</td></tr>");
        }
        if (this.activeGrid.canDrawPaths) {
            lines.push("<tr><td>Draw lines between cells (4 directions)</td><td>Shift-arrow keys</td><td>Click one cell, drag to others</td></tr>");
        }
        if (this.activeGrid.canDrawSpokes) {
            lines.push("<tr><td>Draw lines between cells (8 directions)</td><td>Shift-arrow keys, plus / or \\ to toggle axis tilt</td><td>Click one cell, drag to others</td></tr>");
        }
        if (this.activeGrid.canDrawEdges) {
            if (this.canHaveCenterFocus) {
                lines.push("<tr><td>Draw an edge between cells</td><td>'.' to enter/exit corner mode, then Shift-arrow keys</td><td>Click one corner or edge, drag to others</td></tr>");
            } else {
                lines.push("<tr><td>Draw an edge between cells</td><td>Shift-arrow keys</td><td>Click one corner or edge, drag to others</td></tr>");
            }
        }
        lines.push("<tr><td>Mark a cell as 'interesting'</td><td>Ctrl+Space</td><td>Ctrl+Click</td></tr>");
        if (this.activeGrid.leftClueDepth || this.activeGrid.rightClueDepth || this.activeGrid.topClueDepth || this.activeGrid.bottomClueDepth) {
            lines.push("<tr><td>Mark an external clue as 'satisfied'</td><td>N/A</td><td>Right+Click</td></tr>");
        }
        lines.push("</table></div>");
        lines.push("<div class='puzzle-about-credits'>Made with <a href='https://github.com/tabascq/PuzzleJS' target='_blank'>Puzzle.js</a></div>")
        lines.push("<button type='button' class='puzzle-about-close'>Close</button>")
        lines.push("</div>");
        this.container.insertAdjacentHTML("beforeend", lines.join(""));

        this.oldFocus = document.activeElement;

        this.container.querySelector(".puzzle-about-back").addEventListener("pointerdown", e => { this.closeAbout(); });
        this.container.querySelector(".puzzle-about-close").focus();
        this.container.querySelector(".puzzle-about-close").addEventListener("click", e => { this.closeAbout(); });
        this.container.querySelector(".puzzle-about-close").addEventListener("keyup", e => { if (e.keyCode == 27 || e.keyCode == 13) this.closeAbout(); });
    }

    this.prepareToReset = function() { this.puzzleGrids.forEach(g => { g.prepareToReset(); }); }

    this.rebuildContents = function() {
        if (this.commands) { this.commands.remove(); this.commands = null; }
        this.buildContents(true);
    }

    this.buildContents = function(rebuild) {
        this.options = {};
        this.setDataModeOptions(this.container, this.options, true);
        this.readLocalOptions(this.container, this.jsonOptions, this.options);
        this.puzzleId = this.options["data-puzzle-id"];
        if (!this.puzzleId) { this.puzzleId = (document.body.getAttribute("data-puzzle-page-id") ?? window.location.pathname) + "|" + index; }

        if (rebuild) { this.puzzleGrids.forEach((g) => { g.rebuildContents(); }); }
        else { this.puzzleGrids.forEach((g) => { g.buildContents(); }); }

        if (this.options["data-show-commands"]) {
            this.commands = document.createElement("div");
            this.commands.classList.add("puzzle-commands");
            this.commands.classList.add("no-copy");
            this.commands.innerHTML = "<button type='button' class='puzzle-about-button'>About</button><button type='button' class='puzzle-undo-button'>Undo</button><button type='button' class='puzzle-redo-button'>Redo</button><button type='button' class='puzzle-reset-button'>Reset</button>";
            this.commands.querySelector(".puzzle-about-button").addEventListener("click", e => { this.aboutPopup(); });
            this.commands.querySelector(".puzzle-undo-button").addEventListener("click", e => { this.undoManager.undo(); });
            this.commands.querySelector(".puzzle-redo-button").addEventListener("click", e => { this.undoManager.redo(); });
            // TODO shouldn't need a reload after reset
            this.commands.querySelector(".puzzle-reset-button").addEventListener("click", e => { var prompt = this.options["data-reset-prompt"]; if (!prompt || confirm(prompt)) { this.prepareToReset(); window.location.reload(); } });
            this.container.appendChild(this.commands);
        }
    }

    // --- Construct the interactive player. ---
    this.content = document.createElement("div");
    this.content.classList.add("puzzle-entry-content");
    while (this.container.childNodes.length > 0) { this.content.appendChild(this.container.childNodes[0]); }
    this.container.appendChild(this.content);

    this.puzzleGrids = [];
    this.usePrecisionHitTesting = false;

    this.cornerFocus = null;
    this.firstCenterFocus = null;

    // load all the subgrids
    this.container.querySelectorAll(".puzzle-grid").forEach((g, index) => {
        this.puzzleGrids.push(new PuzzleGrid(this, index, g, true, false));
    });
    
    // push a grid to manage toggles. Also, if there are no subgrids yet, this is the one true grid
    this.puzzleGrids.push(new PuzzleGrid(this, this.puzzleGrids.length, this.content, this.puzzleGrids.length == 0, true));

    this.buildContents();
    this.setActiveGrid(this.puzzleGrids[0]);

    if (this.keyboardFocusModel == "corner") {
        this.setCornerFocusMode(true);        
    }

    var allowInput = false;
    this.puzzleGrids.forEach(p => { if (!p.options["data-no-input"]) allowInput = true; });

    if (allowInput) {
        this.container.querySelectorAll(".crossword-clues li").forEach((clue) => {
            clue.addEventListener("pointerenter", e => { this.cluePointerEnter(e); });
            clue.addEventListener("pointerleave", e => { this.cluePointerLeave(e); });
            clue.addEventListener("click", e => { this.clueClick(e); });
            clue.addEventListener("contextmenu", e => { e.target.classList.toggle("strikethrough"); e.preventDefault(); });
        });

        window.addEventListener("pointerup", e => { this.endPointerIsDown(); });

        document.addEventListener("keyup", function(e) { this.fShift = e.shiftKey; });
        document.addEventListener("keydown", function(e) { this.fShift = e.shiftKey; });
    }

    this.container.classList.add("loaded");

    this.puzzleGrids.forEach(p => { p.afterLoaded(); });
}

function PuzzleDotZone(container, puzzleGrid, index) {
    this.container = container;
    this.puzzleGrid = puzzleGrid;
    this.inhibitSave = false;
    container.puzzleDotZone = this;
    this.anchorDot = null;
    this.provisionalLine = null;
    this.lineLayer = null;
    this.inDotDrag = false;

    this.getDotCenter = function(dot) {
        var dotRect = dot.getBoundingClientRect();
        var lineLayerRect = this.lineLayer.getBoundingClientRect();
        return { x: dotRect.x + (dotRect.width / 2) - lineLayerRect.x, y: dotRect.y + (dotRect.height / 2) - lineLayerRect.y };
    }

    this.createProvisionalLine = function(dot) {
        var c = this.getDotCenter(dot);
        this.lineLayer.insertAdjacentHTML("beforeend", `<line class="provisional" x1="${c.x}" y1="${c.y}" x2="${c.x}" y2="${c.y}"/>`);
        this.provisionalLine = this.lineLayer.lastChild;
        this.anchorDot = dot;
        dot.classList.add("anchor-dot");
    }

    this.updateProvisionalLineEndpoint = function(dot) {
        var center = this.getDotCenter(dot);
        this.provisionalLine.setAttributeNS(null, "x2", center.x);
        this.provisionalLine.setAttributeNS(null, "y2", center.y);
    }

    this.finishProvisionalLine = function(dot) {
        this.updateProvisionalLineEndpoint(dot);
        if (dot === this.anchorDot) { return; }
        this.provisionalLine.classList.remove("provisional");
        this.provisionalLine = null;

        var id0 = this.anchorDot.getAttribute("puzzle-dot-id");
        var id1 = dot.getAttribute("puzzle-dot-id");
        if (id0 < id1) { var t = id0; id0 = id1; id1 = t; }
        var lineId = `${id0}|${id1}`;
        var lineExists = !!this.lineData[lineId];

        this.puzzleGrid.puzzleEntry.undoManager.startAction(this);
        this.puzzleGrid.puzzleEntry.undoManager.addUnit(this, this.container, lineId, lineExists, !lineExists);
        var exclusive = this.container.getAttribute("data-dots-exclusive");
        if (exclusive && parseFalseStrings(exclusive)) {
            var parts = lineId.split("|");
            if (this.linesPerDot[parts[0]]) {
                for (const key of this.linesPerDot[parts[0]]) { this.puzzleGrid.puzzleEntry.undoManager.addUnit(this, this.container, key, true, false) }
            }
            if (this.linesPerDot[parts[1]]) {
                for (const key of this.linesPerDot[parts[1]]) { this.puzzleGrid.puzzleEntry.undoManager.addUnit(this, this.container, key, true, false) }
            }
        }
        this.puzzleGrid.puzzleEntry.undoManager.endAction();

        this.anchorDot.classList.remove("anchor-dot");
        this.anchorDot = null;
    }

    this.cancelProvisionalLine = function() {
        this.provisionalLine.remove();
        this.provisionalLine = null;
        this.anchorDot.classList.remove("anchor-dot");
        this.anchorDot = null;
    }

    this.handleLineClick = function(line) {
        this.puzzleGrid.puzzleEntry.undoManager.startAction(this);
        this.puzzleGrid.puzzleEntry.undoManager.addUnit(this, this.container, line.id, true, false);
        this.puzzleGrid.puzzleEntry.undoManager.endAction();
    }

    this.handleDotClick = function(dot) {
        if (this.inDotDrag) return;
        if (this.provisionalLine) { this.finishProvisionalLine(dot); } else { this.createProvisionalLine(dot); }
    }

    this.handleDotFocus = function(dot) {
        if (!this.provisionalLine) return;
        this.updateProvisionalLineEndpoint(dot);
    }

    this.handleZoneKey = function(e) {
        if (this.provisionalLine && e.key === "Escape") { this.cancelProvisionalLine(); return; }

        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || (e.key === "ArrowDown")) {
            var dot = document.activeElement;
            if (!dot.classList.contains("puzzle-dot")) return;
            var dotRect = dot.getBoundingClientRect();
            var bestDot = null;
            var bestDistanceSq = Infinity;

            this.dotZone.querySelectorAll(".puzzle-dot").forEach(d => {
                if (d === dot) return;

                var dRect = d.getBoundingClientRect();
                var dx = dRect.left - dotRect.left;
                var dy = dRect.top - dotRect.top;
                var distanceSq = dx * dx + dy * dy;
                var angle = Math.atan2(dy, dx) * 180 / Math.PI;

                if (e.key === "ArrowLeft" && Math.abs(angle) < 135) return;
                if (e.key === "ArrowRight" && Math.abs(angle) > 45) return;
                if (e.key === "ArrowUp" && (angle > -45 || angle < -135)) return;
                if (e.key === "ArrowDown" && (angle < 45 || angle > 135)) return;
                if (distanceSq >= bestDistanceSq) return;

                bestDistanceSq = distanceSq;
                bestDot = d;
            });

            if (bestDot) { bestDot.focus(); }
        }
    }

    this.handleZoneDown = function(e) {
        if (this.provisionalLine && !e.target.classList.contains("puzzle-dot")) { this.cancelProvisionalLine(); }
        else if (!this.provisionalLine && e.target.classList.contains("puzzle-dot")) {
            this.inDotDrag = true;
            this.createProvisionalLine(e.target);
        }
    }

    this.handleZoneUp = function(e) {
        if (this.inDotDrag && this.provisionalLine) {
            if (e.target.classList.contains("puzzle-dot")) { this.finishProvisionalLine(e.target); }
            else { this.cancelProvisionalLine(); }
        } 
        this.inDotDrag = false;
    }

    this.handleZoneMove = function(e) {
        if (!this.provisionalLine) return;

        if (e.target.classList.contains("puzzle-dot")) { this.updateProvisionalLineEndpoint(e.target); }
        else {
            this.provisionalLine.setAttributeNS(null, "x2", e.layerX);
            this.provisionalLine.setAttributeNS(null, "y2", e.layerY);
        }
    }

    this.addDotList = function(list, x) {
        if (!list || !list.classList.contains("puzzle-dot-list")) return;

        const listLength = list.children.length;
        for (var i = 0; i < listLength; i++) {
            this.dotZone.insertAdjacentHTML("beforeend", `<button class='puzzle-dot' tabindex='0' style='left: ${x}px; top: ${this.dotZone.offsetHeight * (listLength ? ((2 * i + 1) / (2 * listLength)): 0)}px'></button>`);
        }

        list.style.justifyItems = (x === 0) ? "end" : "begin";
    }

    this.changeWithoutUndo = function(changes) {
        changes.forEach(c => {
            if (c.value) { this.lineData[c.propertyKey] = c.value; } else { delete this.lineData[c.propertyKey]; }
        });

        if (!this.inhibitSave) { localStorage.setItem(this.puzzleId, JSON.stringify(this.lineData)); }
        this.rebuildLinesFromData();
    }

    this.prepareToReset = function() {
        localStorage.removeItem(this.puzzleId);
        this.inhibitSave = true;
        this.lineData = {};
        this.rebuildLinesFromData();
    }

    this.rebuildLinesFromData = function() {
        this.lineLayer.innerHTML = "";
        this.linesPerDot = {};

        for (const[key, value] of Object.entries(this.lineData)) {
            if (!value) continue;

            var parts = key.split("|");
            if (!this.linesPerDot[parts[0]]) { this.linesPerDot[parts[0]] = []; }
            this.linesPerDot[parts[0]].push(key);
            if (!this.linesPerDot[parts[1]]) { this.linesPerDot[parts[1]] = []; }
            this.linesPerDot[parts[1]].push(key);

            var c1 = this.getDotCenter(this.lookup[parts[0]]);
            var c2 = this.getDotCenter(this.lookup[parts[1]]);
            this.lineLayer.insertAdjacentHTML("beforeend", `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" id="${key}"/>`);
            this.lineLayer.lastChild.addEventListener("click", e => { this.handleLineClick(e.target); });
        }
    }

    this.afterLoaded = function() {
        this.puzzleId = `${this.puzzleGrid.puzzleId}-dot-zone-${this.index}`;
        this.dotZone.insertAdjacentHTML("beforeend", "<svg xmlns='http://www.w3.org/2000/svg' class='puzzle-dot-line-layer'></svg");
        this.lineLayer = this.dotZone.lastChild;
        this.lineLayer.setAttribute("viewBox", `0 0 ${this.dotZone.offsetWidth} ${this.dotZone.offsetHeight}`);
        this.dotZone.addEventListener("pointermove", e => { this.handleZoneMove(e); });
        this.dotZone.addEventListener("pointerdown", e => { this.handleZoneDown(e); });
        this.dotZone.addEventListener("pointerup", e => { this.handleZoneUp(e); });
        this.dotZone.addEventListener("keydown", e => { this.handleZoneKey(e); });
    
        this.lookup = {};
        this.lineData = {};
        this.linesPerDot = {};
    
        var xScale = 1;
        var yScale = 1;
        var viewBox = this.container.getAttribute("data-dots-view-box");
        if (viewBox) {
            viewBox = viewBox.split("|");
            xScale = this.dotZone.offsetWidth/Number(viewBox[0]);
            yScale = this.dotZone.offsetHeight/Number(viewBox[1]);
        }

        var dotsText = this.container.getAttribute("data-dots");
        if (dotsText) {
            dotsText.split(" ").forEach(part => {
                var coords = part.split("|");
                if (coords.length >= 2) {
                    this.dotZone.insertAdjacentHTML("beforeend", `<button class='puzzle-dot' tabindex='0' style='left: ${Number(coords[0]) * xScale}px; top: ${Number(coords[1]) * yScale}px'></button>`);
                    if (coords[2]) { this.dotZone.lastChild.setAttribute("data-dot-label", coords[2]); }
                }
            });
        }
    
        if (this.dotZone.classList.contains("puzzle-dot-list-center")) {
            this.addDotList(this.dotZone.previousElementSibling, 0);
            this.addDotList(this.dotZone.nextElementSibling, this.dotZone.offsetWidth);
        }
    
        this.dotZone.querySelectorAll(".puzzle-dot").forEach((d, index) => {
            d.setAttribute("tabindex", 0);
            d.addEventListener("click", e => { this.handleDotClick(d); });
            d.addEventListener("focus", e => { this.handleDotFocus(d); });
    
            if (!d.getAttribute("puzzle-dot-id")) { d.setAttribute("puzzle-dot-id", index); }
            this.lookup[d.getAttribute("puzzle-dot-id")] = d;
        });

        var savedState = localStorage.getItem(this.puzzleId);
        if (savedState) {
            try { this.lineData = JSON.parse(savedState); this.rebuildLinesFromData(); }
            catch {}
        }
    }

    this.dotZone = this.container.querySelector(".puzzle-dot-list-center") ?? this.container;
    this.index = index;
}

function PuzzleGrid(puzzleEntry, index, container, doGrid, isRootGrid) {
    this.puzzleEntry = puzzleEntry;
    this.index = index;
    this.container = container;
    this.container.puzzleGrid = this;
    this.tilt = 0;
    this.stateDirty = false;
    this.inhibitSave = false;
    this.tabstopGrid = null;
    this.doGrid = doGrid;
    this.isRootGrid = isRootGrid;
    this.jsonOptions = this.puzzleEntry.extractJsonOptions(this.container);
    this.dotZones = [];

    this.parseOuterClues = function(clues) {
        var clueDepth = 0;
        if (clues) { for (var i = 0; i < clues.length; i++) { clues[i] = clues[i].split(" "); clueDepth = Math.max(clues[i].length, clueDepth); } }
        return clueDepth;    
    }

    this.addEmptyOuterCell = function(tr, colIndex) {
        var td = document.createElement("td");
        if (this.screenreaderSupported) { td.role = "cell"; td.ariaColIndex = colIndex; td.ariaLabel = "An empty cell in the outer clue area"; }
        td.classList.add("cell");
        td.classList.add("outer-cell");
        td.classList.add("unselectable");
        tr.appendChild(td);
    }

    this.addOuterClue = function(tr, clues, clueIndex, colIndex, zone) {
        var td = document.createElement("td");
        if (this.screenreaderSupported) { td.role = "cell"; td.ariaColIndex = colIndex; }
        td.classList.add("cell");
        td.classList.add("outer-cell");
        if (clueIndex >= 0 && clueIndex < clues.length && clues[clueIndex]) {
            if (this.screenreaderSupported) { td.ariaLabel = clues[clueIndex] + ": A clue in the " + zone + " clue area"; }
            td.textContent = clues[clueIndex];
            td.classList.add(zone + "-clue");
            td.addEventListener("pointerdown", e => { if (e.ctrlKey) { e.target.classList.toggle("interesting"); e.preventDefault(); } else if (e.shiftKey) { e.target.classList.toggle("strikethrough"); e.preventDefault(); } });
            td.addEventListener("contextmenu", e => { e.target.classList.toggle("strikethrough"); e.preventDefault(); });
        } else { td.classList.add("unselectable"); if (this.screenreaderSupported) { td.ariaLabel = "An empty clue in the " + zone + " area"; } }

        tr.appendChild(td);
    }

    this.appendElementToLinkExtractSearch = function(elem, queries, result) {
        if (result.includes(elem)) return;
        result.push(elem);
        var extract = elem.getAttribute("data-extract-id");
        var link = elem.getAttribute("data-link-id");
        if (extract) { extract = `table:not(.copy-only) .extract[data-extract-id='${extract}']`; if (!queries.includes(extract)) queries.push(extract); }
        if (link) { link = `table:not(.copy-only) .link[data-link-id='${link}']`; if (!queries.includes(link)) queries.push(link); };
    }

    this.findLinkExtractCells = function(primary) {
        var result = [];
        var queries = [];

        this.appendElementToLinkExtractSearch(primary, queries, result);
        for (var i = 0; i < queries.length; i++) {
            document.querySelectorAll(queries[i]).forEach(elem => { this.appendElementToLinkExtractSearch(elem, queries, result); });
        }

        return result;
    }

    this.prepareToReset = function() {
        localStorage.removeItem(this.puzzleId);
        localStorage.removeItem(this.puzzleId + "-toggles");
        this.inhibitSave = true;

        var changedGrids = [];

        this.container.querySelectorAll(".inner-cell.extract, .inner-cell.link").forEach(s => {
            var elems = this.findLinkExtractCells(s);
            elems.forEach(elem => {
                var span = elem.querySelector(".text span");
                if (span) span.innerText = "";
                var grid = this.puzzleEntry.puzzleGridFromCell(elem);
                if (!changedGrids.includes(grid) && grid != this) { changedGrids.push(grid); }
            });
        });

        changedGrids.forEach(g => { g.stateDirty = true; g.saveState(); });
        this.dotZones.forEach(dz => { dz.prepareToReset(); });
    }

    this.saveState = function() {
        if (this.inhibitSave || !this.stateDirty) return;

        var stateArray = [];
        var hasState = false;

        this.container.querySelectorAll(".puzzle-grid-content .inner-cell").forEach(td => {
            var fillIndex = 0;
            if (this.fillClasses && !td.classList.contains("given-fill")) { fillIndex = this.fillClasses.indexOf(this.puzzleEntry.findClassInList(td, this.fillClasses)); }

            var edgeCode = td.getAttribute("data-edge-code");
            var givenEdgeCode = td.getAttribute("data-given-edge-code");
            if (!edgeCode) edgeCode = 0;
            if (!givenEdgeCode) givenEdgeCode = 0;
            var edgeCodeDelta = edgeCode ^ givenEdgeCode;

            var pathCode = td.getAttribute("data-path-code");
            var givenPathCode = td.getAttribute("data-given-path-code");
            if (!pathCode) pathCode = 0;
            if (!givenPathCode) givenPathCode = 0;
            var pathCodeDelta = pathCode ^ givenPathCode;

            var maxSpokeLevels = parseInt(this.options["data-spoke-levels"]) + 1;
            var spokeCodes = new Array(maxSpokeLevels);
            var spokeDelta = false;
            for (var l = 1; l < maxSpokeLevels; l++) {
                var code;
                var givenCode;
                if (l > 1) { code = td.getAttribute("data-spoke-" + l.toString() + "-code"); givenCode = td.getAttribute("data-given-spoke-" + l.toString() + "-code"); }
                else { code = td.getAttribute("data-spoke-code"); givenCode = td.getAttribute("data-given-spoke-code"); }
                if (!code) { code = 0; }
                if (!givenCode) { givenCode = 0; }
                spokeCodes[l] = code ^ givenCode;
                if (code ^ givenCode) { spokeDelta = true; }
            }

            var text = td.classList.contains("given-text") ? "" : td.querySelector(".text").innerText.trim();

            var interesting = td.classList.contains("interesting");

            var cellState = "";
            if (fillIndex || edgeCodeDelta || pathCodeDelta || spokeDelta || text || interesting) {
                hasState = true;
                cellState = fillIndex.toString(36) + edgeCodeDelta.toString(16) + pathCodeDelta.toString(16);
                for (var l = 1; l < maxSpokeLevels; l++) {
                    cellState += (spokeCodes[l] >> 4).toString(16);
                    cellState += (spokeCodes[l] % 16).toString(16);
                }
                if (interesting) { cellState += "!"; }
                if (text) { cellState += "," + text; }
            }

            stateArray.push(cellState);
        });

        if (hasState) { localStorage.setItem(this.puzzleId, stateArray.join("|")); }
        else { localStorage.removeItem(this.puzzleId); }

        if (this.toggleState) { localStorage.setItem(this.puzzleId + "-toggles", JSON.stringify(this.toggleState)); }

        this.stateDirty = false;
    }

    this.changeWithoutUndo = function(changes) {
        var changedElems = [];
        var svgChangedElems = [];
        var changedGrids = [];

        changes.forEach(c => {
            var primary = this.lookup[c.locationKey];
            var elems = this.findLinkExtractCells(primary);

            elems.forEach(elem => {
                if (!changedElems.includes(elem)) { changedElems.push(elem); }
                var grid = this.puzzleEntry.puzzleGridFromCell(elem);
                if (!changedGrids.includes(grid)) { changedGrids.push(grid); }

                if (c.playerId) { elem.setAttribute("data-coop-" + c.propertyKey.replace("data-", "") + "-playerId", c.playerId); }

                switch(c.propertyKey) {
                    case "text":
                        var textElement = elem.querySelector(".text span");
                        textElement.innerText = c.value;
                        break;
                    case "class-small-text":
                        if (c.value) { elem.classList.add("small-text"); }
                        else { elem.classList.remove("small-text"); }
                        break;
                    case "class-fill":
                        this.fillClasses.forEach(fc => elem.classList.remove(fc));
                        if (c.value) { elem.classList.add(c.value); }
                        break;
                    case "class-interesting":
                        if (c.value) { elem.classList.add("interesting"); }
                        else { elem.classList.remove("interesting"); }
                        break;
                    case "class-toggled":
                        if (c.value) { elem.classList.add("toggled"); grid.toggleState[elem.id] = true; }
                        else { elem.classList.remove("toggled"); delete grid.toggleState[elem.id]; }
                        break;
                    default:
                        if (c.propertyKey.endsWith("-code") && !svgChangedElems.includes(elem)) { svgChangedElems.push(elem); }
                        elem.setAttribute(c.propertyKey, c.value);
                        break;
                }
            });
        });

        svgChangedElems.forEach(el => { this.updateSvg(el); });
        changedElems.forEach(el => { if (el.classList.contains("cell")) { this.processTdForCopyjack(el); this.updateLabel(el); } });

        changedGrids.forEach(g => { g.stateDirty = true; });
        if (!this.puzzleEntry.pointerIsDown) { changedGrids.forEach(g => { g.saveState(); }) }
    }

    this.addEdgeToSvg = function(svg, edgeName) {
        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.classList.add(edgeName);
        var edgePath = this.options["data-edge-style"];
        if (!edgePath.endsWith(".svg")) { edgePath = puzzleJsFolderPath + "edge-" + edgePath + ".svg"; }
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", edgePath + "#" + edgeName);
        svg.appendChild(use);
    }

    this.addSpokesToSvg = function(svg, spokeCode, spokePrefix, spokeSuffix) {
        for (var i = 0; i < 8; i++) {
            if (!(spokeCode & (1 << i))) continue;

            var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.classList.add(spokePrefix + "spoke" + spokeSuffix);
            var spokePath = this.options["data-spoke-style"];
            if (!spokePath.endsWith(".svg")) { spokePath = puzzleJsFolderPath + "spoke-" + spokePath + ".svg"; }
            use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", spokePath + "#" + spokePrefix + "spoke-n" + ((i & 1) ? "e" : "") + spokeSuffix);
            if (i > 1) { use.setAttributeNS(null, "transform", "rotate(" + ((i >> 1) * 90) + ")"); }
            svg.appendChild(use);
        }
    }

    this.addReticleLayer = function(svg, cls) {
        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.classList.add(cls);
        var spokePath = this.options["data-spoke-style"];
        if (!spokePath.endsWith(".svg")) { spokePath = puzzleJsFolderPath + "spoke-" + spokePath + ".svg"; }
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", spokePath + "#" + (this.reticleXMode ? "x-" : "") + "reticle");
        if (this.puzzleEntry.tilt + this.tilt != 0) { use.setAttributeNS(null, "transform", "rotate(" + ((this.puzzleEntry.tilt + this.tilt) * 45) + ")"); }
        svg.appendChild(use);
    }

    this.pathTranslate = ["o0", "i2", "i0", "l0", "i1", "r2", "r1", "t1", "i3", "r3", "r0", "t3", "l1", "t2", "t0", "x0"];
    this.updateSvg = function(td) {
        var svg = td.querySelector("svg");
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("aria-hidden", true);
            svg.setAttribute("viewBox", "-15 -15 30 30");
            if (!this.canDrawEdges) { svg.classList.add("nopointer"); }
            td.appendChild(svg);
        }

        var pathCode = td.getAttribute("data-path-code");
        if (pathCode) { pathCode = parseInt(pathCode); } else { pathCode = 0; }
        var translatedData = this.pathTranslate[pathCode];

        svg.innerHTML = "";

        if (pathCode) {
            var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.classList.add("path");
            var pathPath = this.options["data-path-style"];
            if (!pathPath.endsWith(".svg")) { pathPath = puzzleJsFolderPath + "path-" + pathPath + ".svg"; }
            use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", pathPath + "#path-" + translatedData[0]);
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

        this.addSpokesToSvg(svg, td.getAttribute("data-spoke-code"), "", "");
        this.addSpokesToSvg(svg, td.getAttribute("data-x-spoke-code"), "x-", "");
        var maxSpokeLevels = parseInt(this.options["data-spoke-levels"]) + 1;
        for (var l = 2; l < maxSpokeLevels; l++) {
            this.addSpokesToSvg(svg, td.getAttribute("data-spoke-" + l.toString() + "-code"), "", "-" + l.toString());
        }
        if (this.canDrawSpokes && td === this.puzzleEntry.currentCenterFocus) {
            this.addReticleLayer(svg, "reticle-back");
            this.addReticleLayer(svg, "reticle-front");
        }
    }

    this.getEdgeLabelData = function(cell, dirName, dirCode) {
        if (dirCode == 2 || dirCode == 8) {
            var parts = cell.id.split("-");
            var row = parseInt(parts[1]);
            var col = parseInt(parts[2]);

            if (dirCode == 2 && row < this.numRows - 1) { cell = this.lookup[`cell-${row + 1}-${col}`]; dirCode = 1; }
            if (dirCode == 8 && col < this.numCols - 1) { cell = this.lookup[`cell-${row}-${col + 1}`]; dirCode = 4; }
        }

        if (!cell) return "";

        const edgeCode = cell.getAttribute("data-edge-code");
        const givenEdgeCode = cell.getAttribute("data-given-edge-code");
        const xEdgeCode = cell.getAttribute("data-x-edge-code");
        const edgeEditable = this.canDrawEdges;
        if ((edgeCode & dirCode) || (xEdgeCode & dirCode)) { return `Cell has a ${dirName} edge${(xEdgeCode & dirCode) ? " blocker" : ""}, which is ${(edgeEditable && (givenEdgeCode & dirCode) == 0) ? "editable" : "not editable"}. `; }
        return "";
    }

    this.updateLabel = function(td) {
        var label = "";

        // content
        var cellContent = "blank";
        const text = td.querySelector('.text span');
        const editable = !td.classList.contains("given-text") && this.canHaveText;
        if (text && text.innerText && text.innerText != " ") { cellContent = text.innerText; }
        label += `Cell text is ${cellContent} and is ${editable ? "editable" : "not editable"}. `;

        // extract
        if (td.classList.contains("extract")) {
            const extractId = td.getAttribute("data-extract-id");
            label += `Cell is highlighted for answer extraction${extractId ? (", with index " + extractId) : ""}. `;
        }

        // clue
        if (td.classList.contains("clue")) {
            const clueId = td.getAttribute("data-clue-id");
            if (clueId) label += `Cell clue indicator is ${clueId}. `;
        }
        if (this.options["data-clue-locations"] == "crossword") {
            const acrossNumber = td.getAttribute("data-across-cluenumber");
            if (acrossNumber) { label += `Cell is part of ${acrossNumber} Across. `}
            const downNumber = td.getAttribute("data-down-cluenumber");
            if (downNumber) { label += `Cell is part of ${downNumber} Down. `}
        }

        // link
        if (td.classList.contains("link")) {
            const linkId = td.getAttribute("data-link-id");
            if (linkId) { label += `Cell is linked with id ${linkId}. `}
        }

        // fill
        if (this.fillClasses) {
            let fill = this.puzzleEntry.findClassInList(td, this.fillClasses);
            const editable = this.options["data-fill-cycle"] && !td.classList.contains("given-fill");
            label += `Cell fill is ${fill} and is ${editable ? "editable" : "not editable"}. `;
        }

        // extra styles
        if (this.extraStyleClasses) {
            let extraStyle = this.puzzleEntry.findClassInList(td, this.extraStyleClasses);
            if (extraStyle) label += `Cell also has ${extraStyle}. `;
        }

        // edge
        label += this.getEdgeLabelData(td, "North", 1);
        label += this.getEdgeLabelData(td, "East", 8);
        label += this.getEdgeLabelData(td, "South", 2);
        label += this.getEdgeLabelData(td, "West", 4);

        // path
        const pathCode = td.getAttribute("data-path-code");
        const givenPathCode = td.getAttribute("data-given-path-code");
        const pathEditable = this.canDrawPaths;
        if (pathCode & 1) { label += `Cell has a North path, which is ${(pathEditable && ((givenPathCode & 1) == 0)) ? "editable" : "not editable"}. `}
        if (pathCode & 2) { label += `Cell has a South path, which is ${(pathEditable && ((givenPathCode & 2) == 0)) ? "editable" : "not editable"}. `}
        if (pathCode & 4) { label += `Cell has a West path, which is ${(pathEditable && ((givenPathCode & 4) == 0)) ? "editable" : "not editable"}. `}
        if (pathCode & 8) { label += `Cell has a East path, which is ${(pathEditable && ((givenPathCode & 8) == 0)) ? "editable" : "not editable"}. `}

        // spoke
        const spokeEditable = this.canDrawSpokes;
        var maxSpokeLevels = parseInt(this.options["data-spoke-levels"]);
        for (var spokeLevel = 1; spokeLevel <= maxSpokeLevels; spokeLevel++) {
            const spokeCode = td.getAttribute(`data-spoke${spokeLevel == 1 ? "" : ("-" + spokeLevel)}-code`);
            const givenSpokeCode = td.getAttribute(`data-given-spoke${spokeLevel == 1 ? "" : ("-" + spokeLevel)}-code`);
            const xSpokeCode = td.getAttribute(`data-x-spoke${spokeLevel == 1 ? "" : ("-" + spokeLevel)}-code`);
            const aLevel = maxSpokeLevels == 1 ? "a" : ("a level " + spokeLevel);
            const anLevel = maxSpokeLevels == 1 ? "an" : ("a level " + spokeLevel);
            if ((spokeCode & 1) || (xSpokeCode & 1)) { label += `Cell has ${aLevel} North spoke${(xSpokeCode & 1) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 1) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 2) || (xSpokeCode & 2)) { label += `Cell has ${aLevel} Northeast spoke${(xSpokeCode & 2) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 2) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 4) || (xSpokeCode & 4)) { label += `Cell has ${anLevel} East spoke${(xSpokeCode & 4) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 4) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 8) || (xSpokeCode & 8)) { label += `Cell has ${aLevel} Southeast spoke${(xSpokeCode & 8) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 8) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 16) || (xSpokeCode & 16)) { label += `Cell has ${aLevel} South spoke${(xSpokeCode & 16) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 16) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 32) || (xSpokeCode & 32)) { label += `Cell has ${aLevel} Southwest spoke${(xSpokeCode & 32) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 32) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 64) || (xSpokeCode & 64)) { label += `Cell has ${aLevel} West spoke${(xSpokeCode & 64) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 64) == 0) ? "editable" : "not editable"}. `}
            if ((spokeCode & 128) || (xSpokeCode & 128)) { label += `Cell has ${aLevel} Northwest spoke${(xSpokeCode & 128) ? " blocker" : ""}, which is ${(spokeEditable && (givenSpokeCode & 128) == 0) ? "editable" : "not editable"}. `}
        }

        if (this.screenreaderSupported) { td.ariaLabel = label; }
    }

    this.translate = function(ch, replacements) {
        if (!replacements || !replacements[ch]) return ch;
        return replacements[ch];
    }

    this.createLabels = function(cell, labelIdType, labelData, labelPos) {
        var labelId = null;

        if (labelData) {
            var labelDataParts = String(labelData).split("|");
            if (labelIdType) {
                labelId = String(labelDataParts[0]).trim();
                if (labelId) {
                    cell.setAttribute(`data-${labelIdType}-id`, labelId);
                    cell.classList.add(labelIdType);
                }
            }
            labelDataParts.forEach((labelDataPart, i) => {
                if (labelDataPart && labelPos.length > i && labelPos[i]) {
                    var label = document.createElement("div");
                    label.setAttribute("aria-hidden", true);
                    label.contentEditable = false;
                    label.classList.add(`${labelIdType}-label`);
                    label.classList.add(labelPos[i]);
                    label.innerText = labelDataPart;
                    cell.appendChild(label);
                }
            });
        }

        return labelId;
    }

    // Copyjack support.
    //
    // Reads from inputTd, a td that's part of an interactive puzzle element.
    // Expects that inputTd.dataset.copyjack is copyTd, a td that's part of this.copyjackVersion.
    // Styles copyTd such that clipboard copies it correctly.
    this.pathCopyjack = [" ", "╵", "╷", "│", "╴", "┘", "┐", "┤", "╶", "└", "┌", "├", "─", "┴", "┬", "┼"];
    this.processTdForCopyjack = function(inputTd) {
        if (!this.puzzleEntry.isUsingCopyjack) return;
        const [i, j] = inputTd.dataset.coord.split(",")
        const copyTd = this.copyjackVersion.getElementsByTagName('tr')[i].getElementsByTagName('td')[j];
        // Set class names.
        // Remove "transient" class names such as 'marked'.
        copyTd.className = inputTd.className.replace(/marked/g, '');
        // Reset the font size to avoid row overflow.
        copyTd.style.fontSize = '1em';
        // Copy any text inside the td. This includes text inside divs within the td.
        copyTd.innerHTML = inputTd.innerHTML;
        // If the td has a "value", overwrite the innertext.
        const text = inputTd.querySelector('.text span');
        if (text && text.innerText) {
            copyTd.innerText = text.innerText;
        }

        // Do edges.
        const edgeCode = inputTd.dataset.edgeCode;
        copyTd.style.borderTop = (edgeCode & 1) ? '3px solid black' : '';
        copyTd.style.borderBottom = (edgeCode & 2) ? '3px solid black' : '';
        copyTd.style.borderLeft = (edgeCode & 4) ? '3px solid black' : '';
        copyTd.style.borderRight = (edgeCode & 8) ? '3px solid black' : '';

        // Do paths.
        const pathCode = inputTd.dataset.pathCode;
        if (!copyTd.innerText && pathCode) {
            // If the cell has content, don't overwrite it.
            copyTd.innerText = this.pathCopyjack[pathCode];
        }
    }

    this.afterLoaded = function() {
        this.dotZones.forEach(dz => { dz.afterLoaded(); });
    }

    this.rebuildContents = function() {
        if (this.grid) {
            this.container.removeChild(this.container.firstChild);
            if (this.isUsingCopyjack) { this.container.removeChild(this.container.firstChild); }
            this.grid = null;
        }
        this.buildContents();
    }

    this.buildContents = function() {
        if (this.isRootGrid) {
            this.options = this.puzzleEntry.options;
            this.puzzleId = this.puzzleEntry.puzzleId;
        }
        else {
            // start with a copy of the global options and then add local modifications
            this.options = {};
            for (const [key, value] of Object.entries(this.puzzleEntry.options)) { this.options[key] = value; }
            this.puzzleEntry.setDataModeOptions(this.container, this.options, false);
            this.puzzleEntry.readLocalOptions(this.container, this.jsonOptions, this.options);
            this.puzzleId = this.options["data-puzzle-id"];
            if (this.puzzleId == this.puzzleEntry.options["data-puzzle-id"]) { this.puzzleId = this.puzzleEntry.puzzleId + "|" + this.index; }
        }

        this.canHaveText = this.puzzleEntry.recordingProperties["data-text"] || this.puzzleEntry.recordingProperties["data-text-solution"] || this.options["data-text-characters"];
        this.canHaveAllChars = this.puzzleEntry.recordingProperties["data-text"] || this.puzzleEntry.recordingProperties["data-text-solution"];
        this.canChangeGivenFills = this.puzzleEntry.recordingProperties["data-fills"] || this.puzzleEntry.recordingProperties["data-extra-styles"];
        this.canDrawEdges = this.puzzleEntry.recordingProperties["data-edges"] || (this.options["data-drag-draw-edge"] && !this.options["data-no-input"]);
        this.canDrawPaths = this.puzzleEntry.recordingProperties["data-paths"] || (this.options["data-drag-draw-path"] && !this.options["data-no-input"]);
        this.canDrawSpokes = this.puzzleEntry.recordingProperties["data-spokes"] || (this.options["data-drag-draw-spoke"] && !this.options["data-no-input"]);

        this.lookup = {};

        if (this.isRootGrid) {
            this.toggleState = localStorage.getItem(this.puzzleId + "-toggles");
            this.toggleState = this.toggleState ? JSON.parse(this.toggleState) : {};
        
            this.container.querySelectorAll(".puzzle-toggle-item").forEach((ti) => {
                this.lookup[ti.id] = ti;
                if (this.toggleState[ti.id]) { ti.classList.add("toggled"); }
                else { ti.classList.remove("toggled"); }
            });
        }

        if (!this.doGrid) return;

        this.fillClasses = puzzleEntry.getOptionArray(this.options, "data-fill-classes", " ");
        this.extraStyleClasses = puzzleEntry.getOptionArray(this.options, "data-extra-style-classes", " ");
    
        var textLines = puzzleEntry.getOptionArray(this.options, "data-text", "|");
        var textReplacements = puzzleEntry.getOptionDict(this.options, "data-text-replacements");
        var fills = puzzleEntry.getOptionArray(this.options, "data-fills", "|");
        var extraStyles = puzzleEntry.getOptionArray(this.options, "data-extra-styles", "|");
        var solution = puzzleEntry.getOptionArray(this.options, "data-text-solution", "|");
        var edges = puzzleEntry.getOptionArray(this.options, "data-edges", "|");
        var paths = puzzleEntry.getOptionArray(this.options, "data-paths", "|");
        var maxSpokeLevels = parseInt(this.options["data-spoke-levels"]) + 1;
        var spokes = new Array(maxSpokeLevels);
        for (var l = 1; l < maxSpokeLevels; l++) {
            var spoke;
            if (l > 1) { spoke = puzzleEntry.getOptionArray(this.options, "data-spokes-" + l.toString(), "|"); }
            else { spoke = puzzleEntry.getOptionArray(this.options, "data-spokes", "|"); }
            if (!spoke) { spoke = ""; }
            spokes[l] = spoke;
        }
        var clueIndicators = puzzleEntry.getOptionArray(this.options, "data-clue-indicators", " ", "auto");
        var cluepos = puzzleEntry.getOptionPosArray(this.options, "data-clue-position", "|");
        var extracts = puzzleEntry.getOptionArray(this.options, "data-extracts", " ");
        var extractpos = puzzleEntry.getOptionPosArray(this.options, "data-extract-position", "|");
        var links = puzzleEntry.getOptionArray(this.options, "data-links", " ");
        var linkpos = puzzleEntry.getOptionPosArray(this.options, "data-link-position", "|");
        var topClues = puzzleEntry.getOptionArray(this.options, "data-top-clues", "|");
        var bottomClues = puzzleEntry.getOptionArray(this.options, "data-bottom-clues", "|");
        var leftClues = puzzleEntry.getOptionArray(this.options, "data-left-clues", "|");
        var rightClues = puzzleEntry.getOptionArray(this.options, "data-right-clues", "|");
    
        var unselectableGivens = this.options["data-unselectable-givens"];
    
        this.topClueDepth = this.parseOuterClues(topClues);
        this.bottomClueDepth = this.parseOuterClues(bottomClues);
        this.leftClueDepth = this.parseOuterClues(leftClues);
        this.rightClueDepth = this.parseOuterClues(rightClues);
    
        var acrossClues = puzzleEntry.container.querySelectorAll(".crossword-clues.across li");
        var acrossClueIndex = 0;
        var downClues = puzzleEntry.container.querySelectorAll(".crossword-clues.down li");
        var downClueIndex = 0;
    
        if (!textLines) { textLines = solution; }
    
        this.screenreaderSupported = !this.options["data-no-screenreader"];
        if (this.topClueDepth > 0 || this.bottomClueDepth > 0 || this.leftClueDepth > 0 || this.rightClueDepth > 0) { this.screenreaderSupported = false; }
        if (this.puzzleEntry.container.classList.contains("puzzle-box")) { this.screenreaderSupported = false; }
    
        var allowInput = !this.options["data-no-input"];
        if (!allowInput) {
            this.container.classList.add("no-input");
        }
    
        if (!textLines) return;
    
        var table = document.createElement("table");
        table.classList.add("puzzle-grid-content");
        table.puzzleGrid = this;
        var clueNum = 0;
        var extractNum = 0;
        var linkNum = 0;
    
        var regularRowBorder = 0;
        var regularColBorder = 0;
    
        var savedState = localStorage.getItem(this.puzzleId);
        if (savedState) { savedState = savedState.split("|"); }
    
        if (textLines.length == 1 && /^\d+x\d+$/.test(textLines[0])) {
            var dim = textLines[0].split("x");
            textLines = [];
            for (r = 0; r < dim[1]; r++) {
                textLines[r] = [];
                for (c = 0; c < dim[0]; c++) { textLines[r][c] = "."; }
            }
        }
    
        if (edges && edges.length == 1 && /^\d+x\d+$/.test(edges[0])) {
            var dim = edges[0].split("x");
            edges = null;
            regularColBorder = dim[0];
            regularRowBorder = dim[1];
        }

        var edgesAreHex = (edges && edges.length > 0 && /^[0-9a-fA-F|.]+$/.test(edges[0]));
        var pathsAreHex = (paths && paths.length > 0 && /^[0-9a-fA-F|.]+$/.test(paths[0]));
    
        for (var i = 0; i < this.topClueDepth; i++) {
            var tr = document.createElement("tr");
            if (this.screenreaderSupported) { tr.role="row"; tr.ariaRowIndex = i + 1; }
            for (var j = 0; j < this.leftClueDepth; j++) { this.addEmptyOuterCell(tr, j + 1); }
            for (var j = 0; j < topClues.length; j++) { this.addOuterClue(tr, topClues[j], i - this.topClueDepth + topClues[j].length, this.leftClueDepth + j + 1, "top"); }
            for (var j = 0; j < this.rightClueDepth; j++) { this.addEmptyOuterCell(tr, this.leftClueDepth + topClues.length + j + 1); }
    
            table.appendChild(tr);
        }
    
        this.numRows = textLines.length;
        this.numCols = 0;
    
        var stateIndex = 0;
    
        for (var r = 0; r < textLines.length; r++) {
            var tr = document.createElement("tr");
            tr.classList.add("row");
            if (this.screenreaderSupported) { tr.role = "row"; tr.ariaRowIndex = this.topClueDepth + r + 1; }
    
            for (var j = 0; j < this.leftClueDepth; j++) { this.addOuterClue(tr, leftClues[r], j - this.leftClueDepth + (leftClues[r] ? leftClues[r].length : 0), j + 1, "left"); }
    
            this.numCols = Math.max(this.numCols, textLines[r].length);
            for (var c = 0; c < textLines[r].length; c++) {
                var cellSavedState = null;
                if (savedState) { cellSavedState = savedState[stateIndex++]; }
    
                var td = document.createElement("td");
                if (this.screenreaderSupported) { td.role = "cell"; td.ariaColIndex = this.leftClueDepth + c + 1; }
                td.classList.add("cell");
                td.classList.add("inner-cell");
                let avoid = this.options["data-text-avoid-position"];
                if (avoid) { td.classList.add("pos-avoid-" + avoid); }
                td.id = "cell-" + r + "-" + c;
                this.lookup[td.id] = td;
                var ch = textLines[r][c];
                
                var textwrapper = document.createElement("div");
                textwrapper.setAttribute("aria-hidden", true);
                textwrapper.classList.add("text");
    
                var text = document.createElement("span");
                textwrapper.appendChild(text);
    
                if (this.canHaveAllChars) {
                    if (this.puzzleEntry.recordingProperties["data-text-solution"]) {
                        var chSolution = (solution && solution.length > r && solution[r] && solution[r].length > c) ? solution[r][c] : " ";
                        if (ch == '.') { text.innerText = chSolution; td.contentEditable = true; td.autocapitalize="off"; }
                        else if (ch == '#') {
                            td.classList.add("extract");

                            text.innerText = chSolution; td.contentEditable = true; td.autocapitalize="off"; 
            
                            if (extracts) {
                                this.createLabels(td, "extract", extracts[extractNum++], extractpos);
                            }
                        }
                        else if (ch == '@') {
                            td.classList.add("black-cell");
                            td.classList.add("unselectable");
                        }
                        else {
                            text.innerText = this.translate(ch, textReplacements);
                            td.classList.add("given-text");
                            if (unselectableGivens) { td.classList.add("unselectable"); }
                        }
                    }
                    else { text.innerText = ch; td.contentEditable = true; td.autocapitalize="off"; }
                }
                else if (ch == '.') {
                    if (solution && solution.length > r && solution[r] && solution[r].length > c) { text.innerText = this.translate(solution[r][c], textReplacements); }
                    else if (allowInput && this.canHaveText) { td.contentEditable = true; td.autocapitalize="off"; }
                }
                else if (ch == '#') {
                    td.classList.add("extract");
                    if (solution && solution.length > r && solution[r] && solution[r].length > c) { text.innerText = this.translate(solution[r][c], textReplacements); }
                    else if (allowInput && this.canHaveText) { td.contentEditable = true; td.autocapitalize="off"; }
    
                    if (extracts) {
                        this.createLabels(td, "extract", extracts[extractNum++], extractpos);
                    }
                }
                else if (ch == '@') {
                    td.classList.add("black-cell");
                    td.classList.add("unselectable");
                }
                else {
                    text.innerText = this.translate(ch, textReplacements);
                    td.classList.add("given-text");
                    if (unselectableGivens) { td.classList.add("unselectable"); }
                }
    
                if (cellSavedState && cellSavedState.indexOf(",") >= 0) {
                    if ((cellSavedState.indexOf("!") >= 0) && (cellSavedState.indexOf("!") < cellSavedState.indexOf(","))) { td.classList.add("interesting"); }
                    var savedText = cellSavedState.substring(cellSavedState.indexOf(",") + 1).trim();
                    text.innerText = savedText;
                    if (savedText && savedText.length > 1) { td.classList.add("small-text"); }
                }
                else if (cellSavedState && cellSavedState.indexOf("!") >= 0) { td.classList.add("interesting"); }
    
                if (!td.classList.contains("unselectable")) {
                    if (allowInput) {
                        td.tabIndex = (this.puzzleEntry.firstCenterFocus && this.tabstopGrid) ? -1 : 0;
                        if (!this.puzzleEntry.firstCenterFocus) { this.puzzleEntry.firstCenterFocus = td; }
                        if (!this.tabstopGrid) { this.tabstopGrid = td; }
                        td.addEventListener("keydown",  e => { this.puzzleEntry.keyDown(e); });
                        td.addEventListener("beforeinput", e => { this.puzzleEntry.beforeInput(e); });
                        td.addEventListener("input", e => { this.puzzleEntry.input(e); });
                        td.addEventListener("pointerdown",  e => { this.puzzleEntry.pointerDown(e); });
                        td.addEventListener("pointermove",  e => { this.puzzleEntry.pointerMove(e); });
                        td.addEventListener("pointercancel",  e => { this.puzzleEntry.pointerCancel(e); });
                        td.addEventListener("contextmenu",  e => { e.preventDefault(); });
                        td.addEventListener("focus",  e => { this.puzzleEntry.setActiveGrid(this); });
                        if (this.options["data-clue-locations"] === "crossword") {
                            td.addEventListener("focus",  e => { this.puzzleEntry.mark(e.target); });
                            td.addEventListener("blur",  e => { this.puzzleEntry.unmark(e.target); });
                        }
                    }
                }
    
                td.appendChild(textwrapper);
    
                var edgeCode = 0;
                if (edges || regularRowBorder || regularColBorder) {
                    if (regularRowBorder) {
                        if ((r % regularRowBorder) == 0) { edgeCode |= 1; }
                        if (r == textLines.length - 1) { edgeCode |= 2; }
                    }
                    if (regularColBorder) {
                        if ((c % regularColBorder) == 0) { edgeCode |= 4; }
                        if (c == textLines[r].length - 1) { edgeCode |= 8; }
                    }
        
                    if (edges) {
                        if (edgesAreHex) {
                            edgeCode |=  (r < edges.length) ? parseInt(edges[r][c], 16) : 0;
                        }
                        else {
                            var topRow = edges[r * 2] ?? [];
                            var midRow = edges[r * 2 + 1] ?? [];
                            var botRow = edges[r * 2 + 2] ?? [];
                            var chTop = topRow[c * 2 + 1];
                            var chLeft = midRow[c * 2];
                            var chRight = midRow[c * 2 + 2];
                            var chBottom = botRow[c * 2 + 1];
                            if (chTop && chTop != " " && chTop != ".") { edgeCode |= 1; }
                            if (chBottom && chBottom != " " && chBottom != ".") { edgeCode |= 2; }
                            if (chLeft && chLeft != " " && chLeft != ".") { edgeCode |= 4; }
                            if (chRight && chRight != " " && chRight != ".") { edgeCode |= 8; }
                        }
                    }
        
                    if (edgeCode) { td.setAttribute("data-given-edge-code", edgeCode); }
                }
                if (cellSavedState) { edgeCode ^= parseInt(cellSavedState[1], 16); }
                if (edgeCode) { td.setAttribute("data-edge-code", edgeCode); }
    
                var pathCode = 0;
                if (paths) {
                    if (pathsAreHex) {
                        pathCode |= (r < paths.length) ? parseInt(paths[r][c], 16) : 0;
                    }
                    else {
                        var topRow = paths[r * 2] ?? [];
                        var midRow = paths[r * 2 + 1] ?? [];
                        var botRow = paths[r * 2 + 2] ?? [];
                        var chTop = (topRow.length == textLines[r].length) ? topRow[c] : topRow[c * 2 + 1];
                        var chLeft = (midRow.length == textLines[r].length + 1) ? midRow[c] : midRow[c * 2];
                        var chRight = (midRow.length == textLines[r].length + 1) ? midRow[c + 1] : midRow[c * 2 + 2];
                        var chBottom = (botRow.length == textLines[r].length) ? botRow[c] : botRow[c * 2 + 1];
                        if (chTop && chTop != " " && chTop != ".") { pathCode |= 1; }
                        if (chBottom && chBottom != " " && chBottom != ".") { pathCode |= 2; }
                        if (chLeft && chLeft != " " && chLeft != ".") { pathCode |= 4; }
                        if (chRight && chRight != " " && chRight != ".") { pathCode |= 8; }
                    }
    
                    if (pathCode) { td.setAttribute("data-path-code", pathCode); td.setAttribute("data-given-path-code", pathCode); }
                }
                if (cellSavedState) { pathCode ^= parseInt(cellSavedState[2], 16); }
                if (pathCode) { td.setAttribute("data-path-code", pathCode); }
    
                for (var l = 1; l < maxSpokeLevels; l++) {
                    var spokeCode = 0;
                    if (spokes[l]) {
                        var spoke = spokes[l];
                        var topRow = spoke[r * 2] ?? [];
                        var midRow = spoke[r * 2 + 1] ?? [];
                        var botRow = spoke[r * 2 + 2] ?? [];
                        var chN = topRow[c * 2 + 1];
                        var chNE = topRow[c * 2 + 2];
                        var chE = midRow[c * 2 + 2];
                        var chSE = botRow[c * 2 + 2];
                        var chS = botRow[c * 2 + 1];
                        var chSW = botRow[c * 2];
                        var chW = midRow[c * 2];
                        var chNW = topRow[c * 2];
                        if (chN && chN != " " && chN != ".") { spokeCode |= 1; }
                        if (chNE && chNE == "/" || chNE == "'" || chNE == "X" || chNE == "x") { spokeCode |= 2; }
                        if (chE && chE != " " && chE != ".") { spokeCode |= 4; }
                        if (chSE && chSE == "\\" || chSE == "`" || chSE == "X" || chSE == "x") { spokeCode |= 8; }
                        if (chS && chS != " " && chS != ".") { spokeCode |= 16; }
                        if (chSW && chSW == "/" || chSW == "'" || chSW == "X" || chSW == "x") { spokeCode |= 32; }
                        if (chW && chW != " " && chW != ".") { spokeCode |= 64; }
                        if (chNW && chNW == "\\" || chNW == "`" || chNW == "X" || chNW == "x") { spokeCode |= 128; }
    
                        if (spokeCode) { 
                            if (l > 1) { td.setAttribute("data-spoke-" + l.toString() + "-code", spokeCode); td.setAttribute("data-given-spoke-" + l.toString() + "-code", spokeCode); }
                            else { td.setAttribute("data-spoke-code", spokeCode); td.setAttribute("data-given-spoke-code", spokeCode); }
                         }
                    }
                    if (cellSavedState) { spokeCode ^= (parseInt(cellSavedState[l * 2 + 1], 16) * 16 + parseInt(cellSavedState[l * 2 + 2], 16)); }
                    if (spokeCode) { 
                        if (l > 1) { td.setAttribute("data-spoke-" + l.toString() + "-code", spokeCode); }
                        else { td.setAttribute("data-spoke-code", spokeCode); }
                    }
                }
    
                if (this.options["data-clue-locations"] && textLines[r][c] != '@') {
                    var acrossClue = (c == 0 || textLines[r][c-1] == '@' || (edgeCode & 4)) && c < textLines[r].length - 1 && textLines[r][c+1] != '@' && !(edgeCode & 8); // block/edge left, letter right
                    var downClue = (r == 0 || textLines[r-1][c] == '@' || (edgeCode & 1)) && r < textLines.length - 1 && textLines[r+1][c] != '@' && !(edgeCode & 2); // block/edge above, letter below
                    
                    if (acrossClue || downClue || this.options["data-clue-locations"] == "all") {
                        var clueIndicator = (!clueIndicators) ? ++clueNum : clueIndicators[clueNum++];
                        const clueId = this.createLabels(td, "clue", clueIndicator, cluepos);
    
                        if (this.options["data-clue-locations"] == "crossword" && clueId) {
                            if (acrossClue) { td.setAttribute("data-across-cluenumber", clueId); }
                            if (downClue) { td.setAttribute("data-down-cluenumber", clueId); }
                            if (acrossClue && acrossClues[acrossClueIndex]) {
                              acrossClues[acrossClueIndex].setAttribute("data-across-cluenumber", clueId);
                              acrossClues[acrossClueIndex].setAttribute("value", clueId);
                              acrossClueIndex++;
                            }
                            if (downClue && downClues[downClueIndex]) {
                              downClues[downClueIndex].setAttribute("data-down-cluenumber", clueId);
                              downClues[downClueIndex].setAttribute("value", clueId);
                              downClueIndex++;
                            }
                        }
                    }
    
                    if (this.options["data-clue-locations"] == "crossword") {
                        if (!acrossClue && c > 0 && textLines[r][c-1] != '@' && !(edgeCode & 4)) { td.setAttribute("data-across-cluenumber", tr.children[c-1].getAttribute("data-across-cluenumber")); }
                        if (!downClue && r > 0 && textLines[r-1][c] != '@' && !(edgeCode & 1)) { td.setAttribute("data-down-cluenumber", table.children[r-1].children[c].getAttribute("data-down-cluenumber")); }
                    }
                }
    
                if (this.options["data-links"] && textLines[r][c] != '@') {
                    var link = links[linkNum++];
                    this.createLabels(td, "link", link, linkpos);
                }
    
                if (this.fillClasses) {
                    var fillIndex = 0;
                    if (fills && r < fills.length && fills[r] && c < fills[r].length && fills[r][c] != '.') {
                        fillIndex = parseInt(fills[r][c], 36);
                        td.classList.add("given-fill");
                    } else {
                        fillIndex = cellSavedState ? parseInt(cellSavedState[0], 36) : 0;
                    }
                    td.classList.add(this.fillClasses[fillIndex]);
                }
    
                if (this.extraStyleClasses && extraStyles && r < extraStyles.length && extraStyles[r] && c < extraStyles[r].length && extraStyles[r][c] != '.') {
                    td.classList.add(this.extraStyleClasses[parseInt(extraStyles[r][c], 36)]);
                }
    
                this.updateSvg(td);
                tr.appendChild(td);
            }
    
            for (var j = 0; j < this.rightClueDepth; j++) { this.addOuterClue(tr, rightClues[r], j, this.leftClueDepth + textLines[r].length + j + 1, "right"); }
    
            table.appendChild(tr);
        }
    
        for (var i = 0; i < this.bottomClueDepth; i++) {
            var tr = document.createElement("tr");
            if (this.screenreaderSupported) { tr.role = "row"; tr.ariaRowIndex = this.topClueDepth + textLines.length + i + 1; }
            for (var j = 0; j < this.leftClueDepth; j++) { this.addEmptyOuterCell(tr, j + 1); }
            for (var j = 0; j < bottomClues.length; j++) { this.addOuterClue(tr, bottomClues[j], i, this.leftClueDepth + j + 1, "bottom"); }
            for (var j = 0; j < this.rightClueDepth; j++) { this.addEmptyOuterCell(tr, this.leftClueDepth + bottomClues.length + j + 1); }
    
            table.appendChild(tr);
        }
    
        table.querySelectorAll(".cell.inner-cell").forEach(c => { this.updateLabel(c); });
    
        if (!this.puzzleEntry.container.classList.contains("puzzle-box")) {
            var label = `A ${this.numRows} row by ${this.numCols} column puzzle grid`;
            if (this.screenreaderSupported) {
                table.role = "grid";
                table.ariaRowCount = this.topClueDepth + this.bottomClueDepth + this.numRows;
                table.ariaColCount = this.leftClueDepth + this.rightClueDepth + this.numCols;
        
                label += `${this.options["data-no-input"] ? "" : ", with interactive elements. For a better interactive experience using a screenreader, turn off scan mode"}.`
            }
            else { label += ". Unfortunately, this specific puzzle is not compatible with a screen reader."}
            table.ariaLabel = label;
        }
    
        this.container.insertBefore(table, this.container.firstChild);
        this.grid = table;

        if (this.puzzleEntry.recordingProperties["data-extra-styles"]) {
            var swap = this.fillClasses;
            this.fillClasses = this.extraStyleClasses;
            this.extraStyleClasses = swap;
        }
    
        // Copyjack support: initialize a copyjack version of the table.
        // This table will be modified as the user takes actions.
    
        // Put the table inside this.container to ensure that styling works.
        if (this.puzzleEntry.isUsingCopyjack) {
            // Set no-copy on this table.
            table.classList.add('no-copy');
            // Create a copy-only table and insert it.
            this.copyjackVersion = document.createElement('table');
            this.copyjackVersion.setAttribute("aria-hidden", true);
            this.copyjackVersion.classList.add('copy-only');
            this.copyjackVersion.style.userSelect = 'auto'; // Needed for Firefox compatibility.
            this.container.insertBefore(this.copyjackVersion, table);
            // Populate the copy-only table.
            for (const [i, tr] of Array.from(table.getElementsByTagName('tr')).entries()) {
                if (tr.classList.contains('no-copy')) continue;
                const copyTr = document.createElement('tr');
                copyTr.style.userSelect = 'auto';
                this.copyjackVersion.appendChild(copyTr);
                for (const [j, td] of Array.from(tr.getElementsByTagName('td')).entries()) {
                    if (td.classList.contains('no-copy')) continue;
                    td.dataset.coord = [i, j];
                    const copyTd = document.createElement('td');
                    copyTd.style.userSelect = 'auto';
                    copyTr.appendChild(copyTd);
                    this.processTdForCopyjack(td);
                }
            }
        }
    }

    if (this.isRootGrid) {
        this.wireToggleInteractivity = function(toggleItem, id) {
            toggleItem.id = id;
            toggleItem.addEventListener("pointerdown", e => { this.puzzleEntry.toggleClass(e.target, "toggled"); });
        }
    
        this.container.querySelectorAll(".puzzle-toggle-item").forEach((ti, index) => {
            this.wireToggleInteractivity(ti, ti.getAttribute("data-toggle-id") ?? ("item-" + index));
        });
    
        this.container.querySelectorAll(".puzzle-toggle-list").forEach((tl, index) => {
            var tlBase = tl.getAttribute("data-toggle-id") ?? ("list-" + index);
            for (var i = 0; i < tl.children.length; i++) {
                var ti = tl.children[i];
                ti.classList.add("puzzle-toggle-item");
                this.wireToggleInteractivity(ti, ti.getAttribute("data-toggle-id") ?? (tlBase + "-" + i));
            }
        });

        this.container.querySelectorAll(".puzzle-dot-zone").forEach((dz, index) => { this.dotZones.push(new PuzzleDotZone(dz, this, index)); });
    }
}

document.addEventListener("keydown", e => {
    if (!e.shiftKey || !e.ctrlKey || !e.altKey || e.key != "F12") return;

    var designercss = document.createElement("link");
    designercss.setAttribute("rel", "stylesheet");
    designercss.setAttribute("type", "text/css");
    designercss.setAttribute("href", `${puzzleJsFolderPath}designer/puzzle-designer.css`);
    document.head.appendChild(designercss);
    
    var designerjs = document.createElement('script');
    designerjs.setAttribute("type", "text/javascript");
    designerjs.setAttribute("src", `${puzzleJsFolderPath}designer/puzzle-designer.js`);
    document.head.appendChild(designerjs);

    e.preventDefault();
});