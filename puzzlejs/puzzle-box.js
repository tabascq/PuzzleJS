document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".puzzle-entry.puzzle-box").forEach((pb) => { new PuzzleBox(pb); });
});

function PuzzleBox(puzzleBox) {
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this.container = puzzleBox;
    this.puzzleEntry = puzzleBox.puzzleEntry;
    this.puzzleEntry.usePrecisionHitTesting = true;
    this.puzzleContent = puzzleBox.querySelector(".puzzle-entry-content");
    puzzleBox.puzzleBox = this;

    this.perspective = document.createElement("div");
    this.perspective.classList.add("puzzle-box-perspective");
    this.animator = document.createElement("div");
    this.animator.classList.add("puzzle-box-animator");
    this.rotator = document.createElement("div");
    this.rotator.classList.add("puzzle-box-rotator");
    while (this.puzzleContent.childNodes.length > 0) { this.rotator.appendChild(this.puzzleContent.childNodes[0]); }
    this.animator.appendChild(this.rotator);
    this.perspective.appendChild(this.animator);
    this.puzzleContent.appendChild(this.perspective);
    this.rotator.style.transform = new DOMMatrix();

    this.setTilt = function(face, upneighbor) {
        var faceLetter = this.faceLocations[face].origFaceLetter;
        var upNeighborLetter = this.faceLocations[upneighbor].origFaceLetter;
        this.faceLocations[face].tilt = -2 * this.cycles[faceLetter].indexOf(upNeighborLetter);
    }

    this.rotate = function(dir) {
        // determine rotation axis/angle from the turning face
        var axis, angle;
        switch(dir)
        {
            case "R": axis = "X"; angle = 90; break;
            case "L": axis = "X"; angle = -90; break;
            case "D": axis = "Y"; angle = 90; break;
            case "U": axis = "Y"; angle = -90; break;
            case "F": axis = "Z"; angle = 90; break;
            case "B": axis = "Z"; angle = -90; break;
        }

        // Premultiply this rotation on the rotator - rotator now points to new orientation
        var turn = new DOMMatrix(`rotate${axis}(${angle}deg)`);
        var totalRot = new DOMMatrix(this.rotator.style.transform);
        totalRot.preMultiplySelf(turn);
        this.rotator.style.transform = totalRot;

        // now animate outer shell *backwards* to 0; visually, the composite start point
        // is the old matrix, and the end point is the new matrix. No end-of-animation cleanup needed.
        this.animator.animate([{ transform: `rotate${axis}(${-angle}deg)` },
                               { transform: `rotate${axis}(0deg)` }],
                              { duration: 500, easing: "ease-in-out" });

        // Now keep track of which face is really where
        // faceLocations["R"] is the original face currently displayed on R, etc.
        var cycle = this.cycles[dir];
        var t = this.faceLocations[cycle[0]];
        this.faceLocations[cycle[0]] = this.faceLocations[cycle[1]];
        this.faceLocations[cycle[1]] = this.faceLocations[cycle[2]];
        this.faceLocations[cycle[2]] = this.faceLocations[cycle[3]];
        this.faceLocations[cycle[3]] = t;

        this.setTilt("F", "U");
        this.setTilt("R", "U");
        this.setTilt("U", "B");

        if (this.puzzleEntry.currentCenterFocus) { this.puzzleEntry.updateSvg(this.puzzleEntry.currentCenterFocus); }
    }

    this.linkSides = function(puzzleGrid1, side1, puzzleGrid2, side2) {
        var g1EndCol = puzzleGrid1.numCols - 1;
        var g1EndRow = puzzleGrid1.numRows - 1;
        var x1S, y1S, dir1Back, dir1, dir1Ahead, dx1=0, dy1=0;

        // go CCW for side 1
        switch(side1) {
            case "top": x1S = g1EndCol; y1S = 0; dx1 = -1; dir1Back = 2; dir1 = 1; dir1Ahead = 0; break;
            case "bottom": x1S = 0; y1S = g1EndRow; dx1 = 1; dir1Back = 6; dir1 = 7; dir1Ahead = 8; break;
            case "right": x1S = g1EndCol; y1S = g1EndRow; dy1 = -1; dir1Back = 8; dir1 = 5; dir1Ahead = 2; break;
            case "left": x1S = 0; y1S = 0; dy1 = 1; dir1Back = 0; dir1 = 3; dir1Ahead = 6; break;
        }

        var g2EndCol = puzzleGrid2.numCols - 1;
        var g2EndRow = puzzleGrid2.numRows - 1;
        var x2S, y2S, dir2Back, dir2, dir2Ahead, dx2=0, dy2=0;

        // go CW for side 2
        switch(side2) {
            case "top": x2S = 0; y2S = 0; dx2 = 1; dir2Back = 0; dir2 = 1; dir2Ahead = 2; break;
            case "bottom": x2S = g2EndCol; y2S = g2EndRow; dx2 = -1; dir2Back = 8; dir2 = 7; dir2Ahead = 6; break;
            case "right": x2S = g2EndCol; y2S = 0; dy2 = 1; dir2Back = 2; dir2 = 5; dir2Ahead = 8; break;
            case "left": x2S = 0; y2S = g2EndRow; dy2 = -1; dir2Back = 6; dir2 = 3; dir2Ahead = 0; break;
        }

        var steps = (side1 == "top" || side1 == "bottom") ? (g1EndCol + 1) : (g1EndRow + 1);

        var cells1 = [], cells2 = [];
        for (var step = 0; step < steps; step++) {
            cells1.push(puzzleGrid1.lookup["cell-" + (y1S + step * dy1) + "-" + (x1S + step * dx1)]);
            cells2.push(puzzleGrid2.lookup["cell-" + (y2S + step * dy2) + "-" + (x2S + step * dx2)]);
        }

        for (var step = 0; step < steps; step++) {
            if (!cells1[step].cellLinks) cells1[step].cellLinks = {};
            if (!cells2[step].cellLinks) cells2[step].cellLinks = {};

            if (step > 0) {
                cells1[step].cellLinks[dir1Back] = cells2[step - 1];
                cells2[step].cellLinks[dir2Back] = cells1[step - 1];
            }

            cells1[step].cellLinks[dir1] = cells2[step];
            cells2[step].cellLinks[dir2] = cells1[step];

            if (step < steps - 1) {
                cells1[step].cellLinks[dir1Ahead] = cells2[step + 1];
                cells2[step].cellLinks[dir2Ahead] = cells1[step + 1];
            }
        }

        var align = (dx1 + dy1) == (dx2 + dy2);
        if (!puzzleGrid1.sideLinks) { puzzleGrid1.sideLinks = {}; }
        if (!puzzleGrid2.sideLinks) { puzzleGrid2.sideLinks = {}; }
        puzzleGrid1.sideLinks[dir1] = { puzzleGrid: puzzleGrid2, align: align };
        puzzleGrid2.sideLinks[dir2] = { puzzleGrid: puzzleGrid1, align: align };
    }

    this.toggleFlipDirection = function() {
        this.flip = !this.flip;
        localStorage.setItem("puzzle-box-rotation-flip", this.flip);
        document.querySelectorAll(".puzzle-box").forEach((b) => {
            b.puzzleBox.updateFlipText();
        });
    }

    this.updateFlipText = function() {
        this.flip = localStorage.getItem("puzzle-box-rotation-flip");

        if (!this.flip) { this.flip = false; }
        else { this.flip = (this.flip === true || this.flip.toLowerCase() === "true"); }

        this.container.querySelector(".puzzle-box-rotate-direction a").innerText = this.flip ? "against" : "along";
    }

    this.perspective.insertAdjacentHTML("beforebegin", "<div class='puzzle-rotation-pair rotation-pair-ud'><div class='puzzle-rotation-button rotate-back'></div><div class='puzzle-rotation-button rotate-forward'></div></div>");
    this.perspective.insertAdjacentHTML("beforebegin", "<div class='puzzle-rotation-pair rotation-pair-lr'><div class='puzzle-rotation-button rotate-back'></div><div class='puzzle-rotation-button rotate-forward'></div></div>");
    this.perspective.insertAdjacentHTML("beforebegin", "<div class='puzzle-rotation-pair rotation-pair-fb'><div class='puzzle-rotation-button rotate-back'></div><div class='puzzle-rotation-button rotate-forward'></div></div>");
    this.puzzleContent.insertAdjacentHTML("beforebegin", "<div class='puzzle-box-instructions'>Print for a constructible version</div>");
    this.puzzleContent.insertAdjacentHTML("afterend", "<div class='puzzle-box-rotate-direction'>Rotate <a>along</a> clicked arrows</div>");
    this.container.querySelector(".rotation-pair-ud .rotate-back").addEventListener("click", e => { this.rotate(this.flip ? "D" : "U"); })
    this.container.querySelector(".rotation-pair-ud .rotate-forward").addEventListener("click", e => { this.rotate(this.flip ? "U" : "D"); })
    this.container.querySelector(".rotation-pair-lr .rotate-back").addEventListener("click", e => { this.rotate(this.flip ? "R" : "L"); })
    this.container.querySelector(".rotation-pair-lr .rotate-forward").addEventListener("click", e => { this.rotate(this.flip ? "L" : "R"); })
    this.container.querySelector(".rotation-pair-fb .rotate-back").addEventListener("click", e => { this.rotate(this.flip ? "F" : "B"); })
    this.container.querySelector(".rotation-pair-fb .rotate-forward").addEventListener("click", e => { this.rotate(this.flip ? "B" : "F"); })

    this.updateFlipText();
    this.container.querySelector(".puzzle-box-rotate-direction a").addEventListener("click", e => { this.toggleFlipDirection(); });

    var up = this.perspective.querySelector(".side-up").puzzleGrid; up.origFaceLetter = "U";
    var left = this.perspective.querySelector(".side-left").puzzleGrid; left.origFaceLetter= "L";
    var front = this.perspective.querySelector(".side-front").puzzleGrid; front.origFaceLetter = "F";
    var right = this.perspective.querySelector(".side-right").puzzleGrid; right.origFaceLetter= "R";
    var back = this.perspective.querySelector(".side-back").puzzleGrid; back.origFaceLetter = "B";
    var down = this.perspective.querySelector(".side-down").puzzleGrid; down.origFaceLetter = "D";

    this.linkSides(up, "left", left, "top");
    this.linkSides(up, "bottom", front, "top");
    this.linkSides(up, "right", right, "top");
    this.linkSides(up, "top", back, "bottom");
    this.linkSides(left, "right", front, "left");
    this.linkSides(front, "right", right, "left");
    this.linkSides(right, "right", back, "right");
    this.linkSides(back, "left", left, "left");
    this.linkSides(down, "top", front, "bottom");
    this.linkSides(down, "right", right, "bottom");
    this.linkSides(down, "bottom", back, "top");
    this.linkSides(down, "left", left, "bottom");
    
    var FtoB = up.numRows;
    var LtoR = up.numCols;
    var UtoD = left.numRows;
    var max = Math.max(FtoB, LtoR, UtoD);
    this.container.style.setProperty("--puzzle-grid-size-FtoB", FtoB);
    this.container.style.setProperty("--puzzle-grid-size-LtoR", LtoR);
    this.container.style.setProperty("--puzzle-grid-size-UtoD", UtoD);
    this.container.style.setProperty("--puzzle-grid-size", max);

    this.faceLocations = { R: right, L: left, U: up, D: down, F: front, B: back };
    this.cycles = { R: "UFDB", L: "UBDF", U: "BLFR", D: "FLBR", F: "ULDR", B: "DLUR"};

    this.container.addEventListener("puzzlegridnavigate", e => {
        let navData = e.detail;
        if (navData.oldGridId == this.faceLocations["U"].puzzleId) {
            if (navData.newGridId == this.faceLocations["B"].puzzleId) { this.rotate("L"); }
            else if (navData.newGridId == this.faceLocations["L"].puzzleId) { this.rotate("F"); }
        }
        else if (navData.oldGridId == this.faceLocations["F"].puzzleId) {
            if (navData.newGridId == this.faceLocations["L"].puzzleId) { this.rotate("D"); }
            else if (navData.newGridId == this.faceLocations["D"].puzzleId) { this.rotate("R"); }
        }
        else if (navData.oldGridId == this.faceLocations["R"].puzzleId) {
            if (navData.newGridId == this.faceLocations["B"].puzzleId) { this.rotate("U"); }
            else if (navData.newGridId == this.faceLocations["D"].puzzleId) { this.rotate("B"); }
        }
    });
}