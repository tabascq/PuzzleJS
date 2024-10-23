/* (c) 2024 Kenny Young
 * This code is licensed under the MIT License.
 * https://github.com/tabascq/PuzzleJS
 */

function PuzzleDesigner() {
    this.createCategory = function(catName) {
        this.pane.insertAdjacentHTML("beforeEnd", `<div class="category-header">${catName}</div>`);
        this.pane.lastElementChild.addEventListener("click", function() {
            this.classList.toggle("open");
            var content = this.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
        
        this.pane.insertAdjacentHTML("beforeEnd", `<div class="category-contents"></div>`);
        return this.pane.lastElementChild;
    }

    this.updateProperty = function(property) {
        if (!this.puzzleGrid) return;
        if (this.puzzleGrid.isRootGrid) {
            this.puzzleGrid.puzzleEntry.container.setAttribute(property, this.properties[property].value);
            delete this.puzzleGrid.puzzleEntry.jsonOptions[property];
            this.puzzleGrid.puzzleEntry.rebuildContents();
        }
        else {
            this.puzzleGrid.container.setAttribute(property, this.properties[property].value);
            delete this.puzzleGrid.jsonOptions[property];
            this.puzzleGrid.rebuildContents();
        }
        this.updateExport();
    }
    
    this.createProperty = function(category, property) {
        category.insertAdjacentHTML("beforeEnd", `<div><a href="../reference/reference-options.html#${property}" target="_blank">${property}</a></div>`);
        category.insertAdjacentHTML("beforeEnd", `<input/>`);
        var input = category.lastElementChild;
        this.properties[property] = input;

        input.addEventListener("change", e => { this.updateProperty(property); });
        input.addEventListener("keyup", e => { this.updateProperty(property); });
        input.addEventListener("paste", e => { this.updateProperty(property); });
    }

    this.updateAllProperties = function() {
        Object.keys(this.properties).forEach(k => {
            var value = puzzleGrid.options[k];
            if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
            if (value === null || value === undefined) value = "";
            this.properties[k].value = value;
        });

        if (this.puzzleGrid.isRootGrid) {
            this.properties["data-mode"].value = this.puzzleGrid.puzzleEntry.container.getAttribute("data-mode");
        }
        else {
            this.properties["data-mode"].value = this.puzzleGrid.container.getAttribute("data-mode");
        }

        const commandDisplay = (this.puzzleGrid.isRootGrid) ? "block" : "none";
        this.properties["data-show-commands"].style.display = commandDisplay;
        this.properties["data-show-commands"].previousSibling.style.display = commandDisplay;
    }

    this.selectPuzzle = function(puzzle) {
        this.pane.classList.add("has-selection");
        this.puzzle = puzzle;
        this.puzzleGrid = this.puzzle.puzzleGrid;

        this.updateAllProperties();
        this.updateExport();
    }

    this.deselectPuzzle = function(puzzle) {
        if (this.puzzle !== puzzle) return;
        this.pane.classList.remove("has-selection");
        this.puzzle = null;
    }

    this.updateExport = function() {
        var element = this.puzzleGrid.isRootGrid ? this.puzzleGrid.puzzleEntry.container : this.puzzleGrid.container;
        var result = `<div class="${element.className.replace(" loaded", "")}"`;

        for (const [key, value] of Object.entries(this.properties)) {
            if (element.hasAttribute(key)) { result += ` ${key}="${element.getAttribute(key)}"`; }
        }

        result += `></div>`;
        this.importExportText.value = result;
    }

    this.parse = function(text) {
        try {
            this.importWrapper.innerHTML = text;
            var imported = this.importWrapper.firstChild;
            var element = this.puzzleGrid.isRootGrid ? this.puzzleGrid.puzzleEntry.container : this.puzzleGrid.container;

            element.className = imported.className + " loaded";
            for (const [key, value] of Object.entries(this.properties)) {
                if (imported.hasAttribute(key)) { element.setAttribute(key, imported.getAttribute(key)); }
            }

            if (this.puzzleGrid.isRootGrid) {
                this.puzzleGrid.puzzleEntry.rebuildContents();
            }
            else {
                this.puzzleGrid.rebuildContents();
            }
            this.updateAllProperties();
        }
        catch {}
    }

    document.body.classList.add("designer-mode");
    document.body.insertAdjacentHTML("beforeEnd", "<div class='puzzle-designer'><div class='no-selection-message'>Select a puzzle (by clicking on it) to see puzzle properties.</div></div>");

    this.pane = document.body.lastElementChild;
    this.properties = {};

    var generalCategory = createCategory("General");
    var textCategory = createCategory("Text");
    var clueCategory = createCategory("Clue");
    var linkCategory = createCategory("Link/Extract");
    var fillCategory = createCategory("Fill");
    var edgeCategory = createCategory("Edge");
    var pathCategory = createCategory("Path");
    var spokeCategory = createCategory("Spoke");

    createProperty(generalCategory, "data-mode", null);

    for (const [key, value] of Object.entries(puzzleModes["default"])) {
        if (key == "data-player-id" || key == "data-team-id") continue;

        var category = generalCategory;

        if (key.includes("text") || key.includes("unselectable")) category = textCategory;
        else if (key.includes("clue")) category = clueCategory;
        else if (key.includes("link") || key.includes("extract")) category = linkCategory;
        else if (key.includes("fill") || key.includes("extra")) category = fillCategory;
        else if (key.includes("edge")) category = edgeCategory;
        else if (key.includes("path")) category = pathCategory;
        else if (key.includes("spoke")) category = spokeCategory;
        createProperty(category, key);
    }

    var importExportCategory = createCategory("Import/Export");
    importExportCategory.insertAdjacentHTML("beforeEnd", "<div><span>Copy to export, paste to import</span><textarea rows='5'></textarea></div>");
    this.importExportText = importExportCategory.lastElementChild.lastElementChild;

    this.importExportText.addEventListener("change", e => { this.parse(this.importExportText.value); });
    this.importExportText.addEventListener("keyup", e => { this.parse(this.importExportText.value); });
    this.importExportText.addEventListener("paste", e => { this.parse(this.importExportText.value); });

    this.importWrapper = document.createElement("div");

    this.pane.insertAdjacentHTML("beforeEnd", "<hr/>");

    var cssCategory = createCategory("Simulated Page CSS");

    var userStyles = new CSSStyleSheet();
    document.adoptedStyleSheets.push(userStyles);

    cssCategory.previousSibling.classList.add("always-visible");
    cssCategory.insertAdjacentHTML("beforeEnd", "<textarea rows='5' placeholder='Simulate your page styles within the designer by pasting the CSS here.'></textarea>");
    var cssText = cssCategory.lastElementChild;

    cssText.addEventListener("change", e => { userStyles.replaceSync(cssText.value); });
    cssText.addEventListener("keyup", e => { userStyles.replaceSync(cssText.value); });
    cssText.addEventListener("paste", e => { userStyles.replaceSync(cssText.value); });

    const urlParams = new URLSearchParams(window.location.search);
    const puzzleParam = urlParams.get('puzzle');
    const cssParam = urlParams.get('css');

    if (cssParam) {
        cssText.value = cssParam;
        userStyles.replaceSync(cssText.value);
    }

    if (puzzleParam) {
        document.querySelector(".puzzle-designer-site").innerHTML = puzzleParam;
        document.querySelectorAll(".puzzle-entry").forEach((p, index) => { new PuzzleEntry(p, index).prepareToReset(); });
        document.querySelectorAll(".puzzle-entry.puzzle-box").forEach((pb) => { new PuzzleBox(pb); });
    }

    document.querySelectorAll(".puzzle-grid").forEach(p => { p.addEventListener("focusin", e => { this.selectPuzzle(p); }) });
    document.querySelectorAll(".puzzle-entry").forEach(p => {
        p.addEventListener("focusin", e => {
            var ancestor = e.target;

            while (ancestor && ancestor != p) {
                if (ancestor.classList.contains("puzzle-grid")) return;
                ancestor = ancestor.parentElement;
            }
            this.selectPuzzle(p.puzzleEntry.puzzleGrids[p.puzzleEntry.puzzleGrids.length - 1].container);
        });
    });
    //document.querySelectorAll(".puzzle-entry").forEach(p => { p.addEventListener("focusout", e => { this.deselectPuzzle(p); }) });
}

function showPuzzleDesigner() {
    PuzzleDesigner();
}

document.addEventListener('DOMContentLoaded', function() { showPuzzleDesigner(); });