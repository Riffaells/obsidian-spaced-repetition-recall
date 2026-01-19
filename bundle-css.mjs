import fs from "fs";
import path from "path";

const SRC_DIR = "src";
const OUT_DIR = "build";
const OUT_FILE = path.join(OUT_DIR, "styles.css");

// Ensure build directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

function getAllCssFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllCssFiles(filePath, fileList);
        } else {
            if (path.extname(file) === ".css") {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

console.log(`Scanning for CSS files in ${SRC_DIR}...`);
const cssFiles = getAllCssFiles(SRC_DIR);

// Sort files to ensure deterministic output
// Prioritize base.css if it exists to be first (optional, but good practice)
cssFiles.sort((a, b) => {
    // specific check: src/styles/base.css comes first
    if (a.includes("base.css")) return -1;
    if (b.includes("base.css")) return 1;
    return a.localeCompare(b);
});

console.log(`Found ${cssFiles.length} CSS files:`);
cssFiles.forEach((f) => console.log(` - ${f}`));

let bundleContent = "";

cssFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    bundleContent += `/* Source: ${filePath} */\n`;
    bundleContent += content + "\n\n";
});

fs.writeFileSync(OUT_FILE, bundleContent);
console.log(`Successfully bundled CSS to ${OUT_FILE} (${bundleContent.length} bytes)`);
