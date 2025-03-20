/* (c) 2025 Kenny Young
 * This code is licensed under the MIT License.
 * https://github.com/tabascq/PuzzleJS
 */
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".example").forEach((example) => {
        let classes = "";
        example.firstElementChild.classList.forEach(c => {
            if (!c.endsWith("example")) return;

            for (let s = 0; s < document.styleSheets.length; s++) {
                let rules = document.styleSheets[s].cssRules;
                for (let r = 0; r < rules.length; r++) {
                    if (rules[r].selectorText != null && rules[r].selectorText.includes(c)) { classes += rules[r].cssText + "\n"; }
                }
            };
        });

        let source = example.innerHTML.replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();

        let code = document.createElement("div");
        code.classList.add("example-title-and-code");
        code.insertAdjacentHTML("afterbegin", "<div class='example-title'><button type='button' class='designer-button'>Open in designer</button></div>");
        code.querySelector(".designer-button").addEventListener("click", e => {
            window.open(`${puzzleJsFolderPath}designer/puzzle-designer.html?puzzle=${encodeURIComponent(source)}&css=${encodeURIComponent(classes)}`);
        });
        let pre = document.createElement("pre");
        pre.innerText = classes ? `${classes}\n${source}` : source;
        code.appendChild(pre);
        example.insertBefore(code, example.firstChild);
    });
});