/**
 * ContextCleaner
 *
 * Cleans markdown context prefixes (list markers, callout markers, etc.)
 * from extracted flashcard text while preserving rich markdown formatting.
 *
 * @module parser/rule-based/ContextCleaner
 */

/**
 * Represents the context type of a line
 */
export enum LineContext {
    Normal = "normal",
    List = "list",
    Callout = "callout",
    Quote = "quote",
}

/**
 * Information about a line's context
 */
export interface LineContextInfo {
    type: LineContext;
    /** The prefix to remove (e.g., "- ", "> ", "  - ") */
    prefix: string;
    /** Indentation level for lists */
    indentLevel: number;
}

/**
 * Cleans context-specific prefixes from flashcard text
 */
export class ContextCleaner {
    /**
     * Detect the context of a line
     *
     * @param line - The line to analyze
     * @returns Context information about the line
     */
    static detectContext(line: string): LineContextInfo {
        // Check for callout/quote (> prefix)
        const calloutMatch = line.match(/^(\s*)(>+)\s*/);
        if (calloutMatch) {
            return {
                type: calloutMatch[2].length > 1 ? LineContext.Quote : LineContext.Callout,
                prefix: calloutMatch[0],
                indentLevel: 0,
            };
        }

        // Check for list (-, *, +, or numbered)
        const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+/);
        if (listMatch) {
            const indentLevel = Math.floor(listMatch[1].length / 2); // 2 spaces = 1 indent level
            return {
                type: LineContext.List,
                prefix: listMatch[0],
                indentLevel,
            };
        }

        // Normal line
        return {
            type: LineContext.Normal,
            prefix: "",
            indentLevel: 0,
        };
    }

    /**
     * Clean a line by removing context prefixes while preserving rich markdown
     *
     * @param line - The line to clean
     * @param contextInfo - Optional pre-detected context info (for performance)
     * @returns Cleaned line with rich markdown preserved
     */
    static cleanLine(line: string, contextInfo?: LineContextInfo): string {
        const context = contextInfo || ContextCleaner.detectContext(line);

        if (context.type === LineContext.Normal) {
            return line.trim();
        }

        // Remove the prefix
        const cleaned = line.substring(context.prefix.length);

        // Trim but preserve rich markdown
        return cleaned.trim();
    }

    /**
     * Clean both front and back of a flashcard
     *
     * @param front - Front text
     * @param back - Back text
     * @param line - Original line (for context detection)
     * @returns Cleaned front and back
     */
    static cleanFlashcard(
        front: string,
        back: string,
        line: string,
    ): { front: string; back: string } {
        const context = ContextCleaner.detectContext(line);

        // If it's a normal line, just trim
        if (context.type === LineContext.Normal) {
            return {
                front: front.trim(),
                back: back.trim(),
            };
        }

        // For lists and callouts, we need to be more careful
        // The front and back are already split, so we just need to clean them
        // But we need to preserve any rich markdown

        return {
            front: ContextCleaner.cleanRichText(front),
            back: ContextCleaner.cleanRichText(back),
        };
    }

    /**
     * Clean text while preserving rich markdown formatting
     *
     * @param text - Text to clean
     * @returns Cleaned text with rich markdown preserved
     */
    private static cleanRichText(text: string): string {
        // Just trim - rich markdown (**, *, ==, etc.) is already in the text
        // and doesn't need special handling
        return text.trim();
    }

    /**
     * Check if a line is inside a list or callout context
     *
     * @param line - The line to check
     * @returns True if the line has list or callout context
     */
    static hasContext(line: string): boolean {
        const context = ContextCleaner.detectContext(line);
        return context.type !== LineContext.Normal;
    }
}
