/* (c) 2025 Kenny Young
 * This code is licensed under the MIT License.
 * https://github.com/tabascq/PuzzleJS
 */

function PuzzleDesigner() {
    this.updateCategoryContentHeight = function(content) {
        content.style.maxHeight = content.previousSibling.classList.contains("open") ? content.scrollHeight + "px" : null;
    }

    this.createCategory = function(catName) {
        this.pane.insertAdjacentHTML("beforeEnd", `<div class="category-header">${catName}</div>`);
        this.pane.lastElementChild.addEventListener("click", e => {
            e.target.classList.toggle("open");
            var content = e.target.nextElementSibling;
            this.updateCategoryContentHeight(content);
        });
        
        this.pane.insertAdjacentHTML("beforeEnd", `<div class="category-contents"></div>`);
        return this.pane.lastElementChild;
    }

    this.getPropertyValueFromDesigner = function(property) {
        if (this.properties[property].classList.contains("multi-select")) {
            var parts = [];
            for (const child of this.properties[property].children) {
                if (child.value) { parts.push(child.value); }
            }
            return parts.join(this.getSeparatorCharacter(property));
        }
        return this.properties[property].value;
    }

    this.updatePropertyOnEdit = function(property) {
        if (!this.puzzleGrid) return;

        var value = this.getPropertyValueFromDesigner(property);
        if (this.puzzleGrid.isRootGrid) {
            this.puzzleGrid.puzzleEntry.container.setAttribute(property, value);
            delete this.puzzleGrid.puzzleEntry.jsonOptions[property];
            this.puzzleGrid.puzzleEntry.rebuildContents();
        }
        else {
            this.puzzleGrid.container.setAttribute(property, value);
            delete this.puzzleGrid.jsonOptions[property];
            this.puzzleGrid.rebuildContents();
        }

        if (this.properties[property].classList.contains("multi-select")) {
            this.updateProperty(property);
        }

        this.updateExport();
        this.updateHashIcons();
    }

    this.updateHashIcon = function(property, hash) {
        var header = this.properties[property].previousSibling;
        var existingHashes = this.properties[property].value ? this.properties[property].value.split(" "): [];
        if (existingHashes.includes(hash)) { header.classList.add("match"); } else { header.classList.remove("match"); }
    }

    this.updateHashIcons = async function() {
        this.updateHashIcon("data-text-hashes", this.properties["data-text-hashes"].value ? await this.puzzleGrid.getTextHash() : null);
        this.updateHashIcon("data-fill-hashes", this.properties["data-fill-hashes"].value ? await this.puzzleGrid.getFillHash() : null);
        this.updateHashIcon("data-edge-hashes", this.properties["data-edge-hashes"].value ? await this.puzzleGrid.getEdgeHash() : null);
        this.updateHashIcon("data-path-hashes", this.properties["data-path-hashes"].value ? await this.puzzleGrid.getPathHash() : null);
        this.updateHashIcon("data-spoke-hashes", this.properties["data-spoke-hashes"].value ? await this.puzzleGrid.getSpokeHash() : null);
    }

    this.toggleHashOnProperty = async function(property) {
        var hash;
        switch (property) {
            case "data-text-hashes": hash = await this.puzzleGrid.getTextHash(); break;
            case "data-fill-hashes": if (this.puzzleGrid.fillClasses) { hash = await this.puzzleGrid.getFillHash(); } break;
            case "data-edge-hashes": hash = await this.puzzleGrid.getEdgeHash(); break;
            case "data-path-hashes": hash = await this.puzzleGrid.getPathHash(); break;
            case "data-spoke-hashes": hash = await this.puzzleGrid.getSpokeHash(); break;
        }

        var existingHashes = this.properties[property].value ? this.properties[property].value.split(" "): [];
        if (existingHashes.includes(hash)) { delete existingHashes[existingHashes.indexOf(hash)]; } else { existingHashes.push(hash); }
        this.properties[property].value = existingHashes.join(" ");
        this.updatePropertyOnEdit(property);
    }
    
    this.createProperty = function(category, property, type) {
        category.insertAdjacentHTML("beforeEnd", `<div class="property-header"><a href="${puzzleJsFolderPath}reference/reference-options.html#${property}" target="_blank">${property}</a></div>`);

        if (property == "data-text" || property == "data-text-solution" || property == "data-fills" || property == "data-extra-styles" || property == "data-edges" || property == "data-paths" || property == "data-spokes") {
            category.lastElementChild.classList.add("recordable");
            category.lastElementChild.title = "not recording";
            category.lastElementChild.addEventListener("click", e => {
                e.target.classList.toggle("recording");
                e.target.title = (e.target.classList.contains("recording") ? "recording" : "not recording");
                this.puzzleGrid.puzzleEntry.recordingProperties[property] = e.target.classList.contains("recording");

                if (!e.target.classList.contains("recording")) {
                    switch (property) {
                        case "data-text": this.recordTextProperty(property); break;
                        case "data-text-solution": this.recordTextProperty(property); break;
                        case "data-fills": this.recordClassProperty(property, this.puzzleGrid.fillClasses); break;
                        case "data-extra-styles": this.recordClassProperty(property, this.puzzleGrid.fillClasses); break; // puzzle swaps arrays, so this is right
                        case "data-edges": this.record4DirProperty(property, "data-edge-code"); break;
                        case "data-paths": this.record4DirProperty(property, "data-path-code"); break;
                        case "data-spokes": this.record8DirProperty(property, "data-spoke-code"); break;
                    }
                    this.puzzleGrid.prepareToReset();
                }

                if (this.puzzleGrid.isRootGrid) { this.puzzleGrid.puzzleEntry.rebuildContents(); } else { this.puzzleGrid.rebuildContents(); }

                if (!e.target.classList.contains("recording")) { this.puzzleGrid.inhibitSave = false; }
            });
        }

        if (property.endsWith("hashes")) {
            category.lastElementChild.classList.add("hash");
            category.lastElementChild.addEventListener("click", e => {
                this.toggleHashOnProperty(property);
            });
        }

        switch(type) {
            default:
                category.insertAdjacentHTML("beforeEnd", `<input/>`);
                break;
            case "bool":
                //category.insertAdjacentHTML("beforeEnd", `<input type="checkbox"/>`);
                //break;
            case "select":
            case "datalist":
                category.insertAdjacentHTML("beforeEnd", type === "datalist" ? `<input list="${property}-defined-options"/><datalist id="${property}-defined-options"></datalist>` : `<select></select>`);
                this.propertyValues[property].sort();
                this.propertyValues[property].forEach(v => {
                    category.lastElementChild.insertAdjacentHTML("beforeEnd", `<option value="${v}">${v}</option>`);
                });
                break;
            case "multi-select":
                category.insertAdjacentHTML("beforeEnd", `<div class="multi-select"></div>`);
                break;
        }
        var input = category.lastElementChild;
        if (type === "datalist") { input = input.previousSibling; }

        this.properties[property] = input;

        input.addEventListener("change", e => { this.updatePropertyOnEdit(property); });
        input.addEventListener("keyup", e => { this.updatePropertyOnEdit(property); });
        input.addEventListener("paste", e => { this.updatePropertyOnEdit(property); });
    }

    this.insertOptionList = function(property, parent, value) {
        parent.insertAdjacentHTML("beforeEnd", `<select></select>`);
        this.propertyValues[property].sort();
        this.propertyValues[property].forEach(v => {
            parent.lastElementChild.insertAdjacentHTML("beforeEnd", `<option value="${v}">${v}</option>`);
        });
        parent.lastElementChild.value = value;
    }

    this.getPropertyValue = function(property) {
        if (property === "data-mode") {
            if (this.puzzleGrid.isRootGrid) {
                return this.puzzleGrid.puzzleEntry.container.getAttribute("data-mode");
            }
            else {
                return this.puzzleGrid.container.getAttribute("data-mode");
            }        
        }

        return this.puzzleGrid.options[property];
    }

    this.getSeparatorCharacter = function(property) {
        return (property === "data-mode") ? " " : "|";
    }

    this.recordTextProperty = function(property) {
        var lines = [];
        this.puzzleGrid.container.querySelectorAll(".puzzle-grid-content .row").forEach(r => {
            var line = "";
            r.querySelectorAll(".inner-cell").forEach(c => {
                var cellText = c.querySelector(".text").innerText;
                if (!cellText) { cellText = c.classList.contains("given-text") ? " " : "."; }
                if (property === "data-text-solution" && (cellText == "." || cellText == "#" || cellText == "@")) { cellText = " "; }
                line += cellText;
            });
            lines.push(line);
        });
        this.properties[property].value = lines.join("|");
        this.updatePropertyOnEdit(property);
    }

    this.recordClassProperty = function(property, classes) {
        var codes = [];
        this.puzzleGrid.container.querySelectorAll(".puzzle-grid-content .row").forEach(r => {
            var codeRow = "";
            r.querySelectorAll(".inner-cell").forEach(c => {
                var cls = this.puzzleGrid.puzzleEntry.findClassInList(c, classes);
                var index = cls ? classes.indexOf(cls).toString(36) : 0;
                codeRow += (index != 0 ? index.toString(36) : ".");
            });
            codes.push(codeRow);
        });
        this.properties[property].value = codes.join("|");
        this.updatePropertyOnEdit(property);
    }

    this.record4DirProperty = function(property, codeName) {
        var codes = [];
        this.puzzleGrid.container.querySelectorAll(".puzzle-grid-content .row").forEach(r => {
            var codeRow = "";
            r.querySelectorAll(".inner-cell").forEach(c => {
                var code = c.getAttribute(codeName);
                codeRow += (code ? parseInt(code).toString(16) : "0");
            });
            codes.push(codeRow);
        });
        this.properties[property].value = codes.join("|");
        this.updatePropertyOnEdit(property);
    }

    this.record8DirProperty = function(property, codeName) {
        var codes = [];
        this.puzzleGrid.container.querySelectorAll(".puzzle-grid-content .row").forEach((r, rIndex) => {
            var topCodeRow = "";
            var middleCodeRow = "";
            var bottomCodeRow = "";
            var prevCode = 0;
            r.querySelectorAll(".inner-cell").forEach(c => {
                var code = c.getAttribute(codeName);
                code = (code ? parseInt(code) : "0");

                if (code & 128) { topCodeRow += (prevCode & 2) ? "X" : "\\"; } else { topCodeRow += (prevCode & 2) ? "/" : " "; }
                topCodeRow += (code & 1) ? "I" : " ";
                middleCodeRow += (code & 64) ? "- " : " .";
                if (code & 32) { bottomCodeRow += (prevCode & 8) ? "X" : "/"; } else { bottomCodeRow += (prevCode & 8) ? "\\" : " "; }
                bottomCodeRow += (code & 16) ? "I" : " ";
                prevCode = code;
            });
            topCodeRow += (prevCode & 2) ? "/" : " ";
            middleCodeRow += (prevCode & 4) ? "-" : " ";
            bottomCodeRow += (prevCode & 8) ? "\\" : " ";

            if (rIndex == 0) { codes.push(topCodeRow); }
            codes.push(middleCodeRow);
            codes.push(bottomCodeRow);
        });
        this.properties[property].value = codes.join("|");
        this.updatePropertyOnEdit(property);
    }

    this.updateProperty = function(property) {
        var value = this.getPropertyValue(property);

        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
        if (value === null || value === undefined) value = "";

        if (this.properties[property].classList.contains("multi-select")) {
            this.properties[property].innerHTML = "";
            var parts = value.split(this.getSeparatorCharacter(property));
            parts.forEach(p => {
                if (p) { this.insertOptionList(property, this.properties[property], p); }
            });
            this.insertOptionList(property, this.properties[property], "");
            this.updateCategoryContentHeight(this.properties[property].parentElement);
        } else {
            this.properties[property].value = value;
        }
    }

    this.updateAllProperties = function() {
        Object.keys(this.properties).forEach(property => {
            this.updateProperty(property);
        });

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
        this.updateHashIcons();
    }

    this.deselectPuzzle = function(puzzle) {
        if (this.puzzle !== puzzle) return;
        this.pane.classList.remove("has-selection");
        this.puzzle = null;
    }

    this.updateExport = function() {
        var element = this.puzzleGrid.isRootGrid ? this.puzzleGrid.puzzleEntry.container : this.puzzleGrid.container;
        var result = `<div class="${element.className.replace(" loaded", "").replace(" advance-horizontal", "").replace(" advance-vertical", "").replace(" validated", "")}"`;

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

    this.registerValue = function(property, value) {
        if (value === false) value = "false";
        if (value === true) value = "true";
        if (value === null) value = "";
        if (value && !/^[a-zA-Z]/.test(value)) {
            delete this.propertyValues[property];
        }
        if (this.propertyValues[property] && !this.propertyValues[property].includes(value)) {
            this.propertyValues[property].push(value);
        }

        if (value === "false" && !this.propertyValues[property].includes("true")) { this.registerValue(property, "true"); }
        if (value === "true" && !this.propertyValues[property].includes("false")) { this.registerValue(property, "false"); }
    }

    this.registerLabelPositions = function(property) {
        this.propertyValues[property] = [];
        this.registerValue(property, "");
        this.registerValue(property, "top-left");
        this.registerValue(property, "top-right");
        this.registerValue(property, "bottom-left");
        this.registerValue(property, "bottom-right");
        this.registerValue(property, "top");
        this.registerValue(property, "bottom");
        this.registerValue(property, "none");
    }

    document.body.classList.add("designer-mode");
    document.body.insertAdjacentHTML("beforeEnd", "<div class='puzzle-designer'><div class='no-selection-message'>Select a puzzle (by clicking on it) to see puzzle properties.</div></div>");

    this.pane = document.body.lastElementChild;
    this.properties = {};
    this.propertyValues = {};

    var generalCategory = this.createCategory("General");
    var textCategory = this.createCategory("Text");
    var clueCategory = this.createCategory("Clue");
    var linkCategory = this.createCategory("Link/Extract");
    var fillCategory = this.createCategory("Fill");
    var edgeCategory = this.createCategory("Edge");
    var pathCategory = this.createCategory("Path");
    var spokeCategory = this.createCategory("Spoke");
    var validationCategory = this.createCategory("Validation");

    this.createProperty(generalCategory, "data-mode", "multi-select");

    for (const [key, value] of Object.entries(puzzleModes["default"])) {
        this.propertyValues[key] = [];
    }

    this.propertyValues["data-mode"] = [""];
    for (const [modeName, mode] of Object.entries(puzzleModes)) {
        if (modeName !== "default") { this.registerValue("data-mode", modeName); }
        for (const [key, value] of Object.entries(mode)) {
            this.registerValue(key, value);
        }
    }

    // register a few extras that modes don't catch
    this.registerValue("data-reset-prompt", null);
    this.registerValue("data-text-avoid-position", "bottom");
    this.registerValue("data-clue-locations", "all");
    this.registerLabelPositions("data-clue-position");
    this.registerLabelPositions("data-link-position");
    this.registerLabelPositions("data-extract-position");
    this.registerValue("data-edge-style", "dash");
    this.registerValue("data-edge-style", "none");
    this.registerValue("data-spoke-style", "dash");

    for (const [key, value] of Object.entries(puzzleModes["default"])) {
        if (key == "data-player-id" || key == "data-team-id") continue;

        var type = "text";
        var values = this.propertyValues[key];
        if (values && values.length > 1 && key != "data-reset-prompt" && !values.some(v => { return v.includes(" "); })) {
            if (values.includes("true") || values.includes("false")) { type = "bool"; }
            else if (key == "data-link-position" || key == "data-extract-position" || key == "data-clue-position") { type = "multi-select"; }
            else if (key == "data-edge-style" || key == "data-path-style" || key == "data-spoke-style") { type = "select"; } // TODO - use datalist here if there's a good way to show all options instead of filtering
            else { type = "select"; }
        }
    
        var category = generalCategory;

        if (key.includes("validator") || key.includes("check") || key.includes("hash")) category = validationCategory;
        else if (key.includes("text") || key.includes("unselectable")) category = textCategory;
        else if (key.includes("clue")) category = clueCategory;
        else if (key.includes("link") || key.includes("extract")) category = linkCategory;
        else if (key.includes("fill") || key.includes("extra")) category = fillCategory;
        else if (key.includes("edge")) category = edgeCategory;
        else if (key.includes("path")) category = pathCategory;
        else if (key.includes("spoke")) category = spokeCategory;
        this.createProperty(category, key, type);
    }

    var importExportCategory = this.createCategory("Import/Export");
    importExportCategory.insertAdjacentHTML("beforeEnd", "<div><span>Copy to export, paste to import</span><textarea rows='5'></textarea></div>");
    this.importExportText = importExportCategory.lastElementChild.lastElementChild;

    this.importExportText.addEventListener("change", e => { this.parse(this.importExportText.value); });
    this.importExportText.addEventListener("keyup", e => { this.parse(this.importExportText.value); });
    this.importExportText.addEventListener("paste", e => { this.parse(this.importExportText.value); });

    this.importWrapper = document.createElement("div");

    this.pane.insertAdjacentHTML("beforeEnd", "<hr/>");

    var cssCategory = this.createCategory("Simulated Page CSS");

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

    document.querySelectorAll(".puzzle-grid-content").forEach(p => {
        if (p.contains(document.activeElement)) { this.selectPuzzle(p); }
    });
    document.querySelectorAll(".puzzle-grid").forEach(p => {
        p.addEventListener("focusin", e => { this.selectPuzzle(p); })
    });
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

    document.addEventListener("puzzlechanged", e => {
        if (e.target.puzzleGrid == this.puzzleGrid) {
            this.updateHashIcons();
        }
    });

}

var puzzleDesigner = null;

function showPuzzleDesigner() {
    if (!puzzleDesigner) { puzzleDesigner = new PuzzleDesigner(); }
}

if (document.readyState === "complete") { showPuzzleDesigner(); }
document.addEventListener('DOMContentLoaded', function() { showPuzzleDesigner(); });