/* (c) 2024 Kenny Young
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

        if (classes) classes += "\n";
        
        let code = document.createElement("pre");
        code.innerText = classes + example.innerHTML.replace(/&amp;/g,'&').trim();
        example.insertBefore(code, example.firstChild);
    });
});