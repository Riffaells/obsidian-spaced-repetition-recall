import fs from "fs";
import path from "path";

const SRC_DIR = "src";
const OUT_DIR = "build";
const OUT_FILE = path.join(OUT_DIR, "styles.css");

// Check for --quiet flag
const isQuiet = process.argv.includes("--quiet");

// Ensure build directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

function resolveImports(filePath, processedFiles = new Set()) {
    // Prevent circular imports
    if (processedFiles.has(filePath)) {
        return "";
    }
    processedFiles.add(filePath);

    const content = fs.readFileSync(filePath, "utf8");
    const dir = path.dirname(filePath);
    
    // Process @import statements
    const importRegex = /@import\s+['"]([^'"]+)['"]\s*;/g;
    let result = content;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = path.resolve(dir, importPath);
        
        if (fs.existsSync(resolvedPath)) {
            const importedContent = resolveImports(resolvedPath, processedFiles);
            result = result.replace(match[0], `/* Imported from: ${importPath} */\n${importedContent}`);
        } else {
            if (!isQuiet) {
                console.warn(`Warning: Could not resolve import: ${importPath} from ${filePath}`);
            }
        }
    }
    
    return result;
}

if (!isQuiet) {
    console.log(`Building CSS bundle from ${SRC_DIR}/styles/base.css...`);
}

const baseFile = path.join(SRC_DIR, "styles", "base.css");

if (!fs.existsSync(baseFile)) {
    console.error(`Error: base.css not found at ${baseFile}`);
    process.exit(1);
}

let bundleContent = `/* Obsidian Spaced Repetition Flow - Bundled Styles */\n\n`;
bundleContent += resolveImports(baseFile);

fs.writeFileSync(OUT_FILE, bundleContent);

if (!isQuiet) {
    console.log(`Successfully bundled CSS to ${OUT_FILE} (${bundleContent.length} bytes)`);
}
