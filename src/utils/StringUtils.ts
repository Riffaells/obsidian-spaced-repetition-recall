/**
 * String utility functions for common text operations.
 */

/**
 * Truncates string to specified length and adds ellipsis.
 * 
 * @example
 * ```typescript
 * truncate('Hello World', 8) // 'Hello...'
 * truncate('Hello World', 8, '…') // 'Hello…'
 * ```
 */
export function truncate(str: string, maxLength: number, ellipsis: string = "..."): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitalizes first letter of string.
 */
export function capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes first letter of each word.
 */
export function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Converts string to camelCase.
 */
export function toCamelCase(str: string): string {
    return str
        .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
        .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Converts string to PascalCase.
 */
export function toPascalCase(str: string): string {
    const camel = toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Converts string to kebab-case.
 */
export function toKebabCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
}

/**
 * Converts string to snake_case.
 */
export function toSnakeCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}

/**
 * Removes all whitespace from string.
 */
export function removeWhitespace(str: string): string {
    return str.replace(/\s+/g, "");
}

/**
 * Normalizes whitespace (replaces multiple spaces with single space).
 */
export function normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, " ").trim();
}

/**
 * Pads string to specified length with character.
 */
export function pad(str: string, length: number, char: string = " "): string {
    const padLength = Math.max(0, length - str.length);
    const padLeft = Math.floor(padLength / 2);
    const padRight = padLength - padLeft;
    return char.repeat(padLeft) + str + char.repeat(padRight);
}

/**
 * Pads string on the left.
 */
export function padLeft(str: string, length: number, char: string = " "): string {
    const padLength = Math.max(0, length - str.length);
    return char.repeat(padLength) + str;
}

/**
 * Pads string on the right.
 */
export function padRight(str: string, length: number, char: string = " "): string {
    const padLength = Math.max(0, length - str.length);
    return str + char.repeat(padLength);
}

/**
 * Reverses string.
 */
export function reverse(str: string): string {
    return str.split("").reverse().join("");
}

/**
 * Counts occurrences of substring.
 */
export function countOccurrences(str: string, search: string): number {
    if (!search) return 0;
    let count = 0;
    let pos = 0;
    while ((pos = str.indexOf(search, pos)) !== -1) {
        count++;
        pos += search.length;
    }
    return count;
}

/**
 * Checks if string contains any of the search strings.
 */
export function containsAny(str: string, searches: string[]): boolean {
    return searches.some((search) => str.includes(search));
}

/**
 * Checks if string contains all of the search strings.
 */
export function containsAll(str: string, searches: string[]): boolean {
    return searches.every((search) => str.includes(search));
}

/**
 * Removes prefix from string if present.
 */
export function removePrefix(str: string, prefix: string): string {
    if (str.startsWith(prefix)) {
        return str.slice(prefix.length);
    }
    return str;
}

/**
 * Removes suffix from string if present.
 */
export function removeSuffix(str: string, suffix: string): string {
    if (str.endsWith(suffix)) {
        return str.slice(0, -suffix.length);
    }
    return str;
}

/**
 * Ensures string starts with prefix.
 */
export function ensurePrefix(str: string, prefix: string): string {
    return str.startsWith(prefix) ? str : prefix + str;
}

/**
 * Ensures string ends with suffix.
 */
export function ensureSuffix(str: string, suffix: string): string {
    return str.endsWith(suffix) ? str : str + suffix;
}

/**
 * Splits string into lines.
 */
export function lines(str: string): string[] {
    return str.split(/\r?\n/);
}

/**
 * Joins lines with newline character.
 */
export function joinLines(lines: string[], newline: string = "\n"): string {
    return lines.join(newline);
}

/**
 * Indents each line by specified amount.
 */
export function indent(str: string, spaces: number = 2): string {
    const indentation = " ".repeat(spaces);
    return lines(str)
        .map((line) => (line.trim() ? indentation + line : line))
        .join("\n");
}

/**
 * Removes common leading whitespace from each line.
 */
export function dedent(str: string): string {
    const lineArray = lines(str);
    const nonEmptyLines = lineArray.filter((line) => line.trim());

    if (nonEmptyLines.length === 0) return str;

    const minIndent = Math.min(
        ...nonEmptyLines.map((line) => {
            const match = line.match(/^(\s*)/);
            return match ? match[1].length : 0;
        }),
    );

    return lineArray.map((line) => line.slice(minIndent)).join("\n");
}

/**
 * Wraps text to specified width.
 */
export function wordWrap(str: string, width: number): string {
    const words = str.split(/\s+/);
    const result: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if (currentLine.length + word.length + 1 <= width) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            if (currentLine) result.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) result.push(currentLine);
    return result.join("\n");
}

/**
 * Extracts numbers from string.
 */
export function extractNumbers(str: string): number[] {
    const matches = str.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
}

/**
 * Checks if string is empty or contains only whitespace.
 */
export function isBlank(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
}

/**
 * Checks if string is not empty and contains non-whitespace characters.
 */
export function isNotBlank(str: string | null | undefined): boolean {
    return !isBlank(str);
}

/**
 * Converts string to boolean.
 * Recognizes: true, false, yes, no, 1, 0, on, off (case-insensitive).
 */
export function toBoolean(str: string): boolean {
    const normalized = str.toLowerCase().trim();
    return ["true", "yes", "1", "on"].includes(normalized);
}

/**
 * Generates a random string of specified length.
 */
export function randomString(length: number, chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generates a UUID v4.
 */
export function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Escapes HTML special characters.
 */
export function escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Unescapes HTML entities.
 */
export function unescapeHtml(str: string): string {
    const htmlUnescapes: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
    };
    return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapes[entity]);
}

/**
 * Computes Levenshtein distance between two strings.
 * Useful for fuzzy matching.
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1,
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Computes similarity ratio between two strings (0-1).
 */
export function similarity(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
}
