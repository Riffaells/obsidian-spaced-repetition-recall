/**
 * HeadingExtractor - Extracts markdown headings from note content
 * 
 * This module handles:
 * - Parsing markdown headings (h1-h6)
 * - Building heading hierarchy for context paths
 * - Ignoring headings inside code blocks
 * - Ignoring headings inside quotes
 * 
 * @module parser/header-based/HeadingExtractor
 */

import { HeadingInfo } from "./types";

/**
 * Result of checking if a line is a heading
 */
interface HeadingCheckResult {
    isHeading: boolean;
    level: number;
    text: string;
}

/**
 * HeadingExtractor extracts and processes markdown headings from note content.
 * 
 * It supports:
 * - Extracting h1-h6 headings with their text and line numbers
 * - Building context paths from heading hierarchy
 * - Ignoring headings inside code blocks (``` or ~~~)
 * - Ignoring headings inside block quotes (>)
 */
export class HeadingExtractor {
    /**
     * Extracts all headings from the note lines
     * 
     * @param noteLines Array of lines from the note
     * @param ignoreCodeBlocks Whether to ignore headings inside code blocks (default: true)
     * @param ignoreQuotes Whether to ignore headings inside quotes (default: true)
     * @returns Array of HeadingInfo objects with context paths built
     */
    extractHeadings(
        noteLines: string[],
        ignoreCodeBlocks: boolean = true,
        ignoreQuotes: boolean = true,
    ): HeadingInfo[] {
        const headings: HeadingInfo[] = [];
        const codeBlockState = { inCodeBlock: false, delimiter: "" };
        
        const levelIndices: Map<number, number> = new Map();
        let globalIndex: number = 0; // Global index for all headings
        
        for (let lineNumber = 0; lineNumber < noteLines.length; lineNumber++) {
            const line = noteLines[lineNumber];

            // Track code block state
            if (ignoreCodeBlocks) {
                this.updateCodeBlockState(line, codeBlockState);
                if (codeBlockState.inCodeBlock) {
                    continue;
                }
            }
            
            // Skip lines in quotes
            if (ignoreQuotes && this.isInQuote(line)) {
                continue;
            }
            
            // Check if line is a heading
            const headingCheck = this.isHeading(line);
            if (headingCheck.isHeading) {
                // Skip empty headings or headings with only whitespace
                if (headingCheck.text.trim().length === 0) {
                    continue;
                }
                
                const currentLevelIndex = levelIndices.get(headingCheck.level) ?? 0;
                
                headings.push({
                    level: headingCheck.level,
                    text: headingCheck.text,
                    lineNumber,
                    isQuestion: false, // Heading itself is not a question, content below is the answer
                    context: [], // Will be filled by buildHeadingHierarchy
                    index: globalIndex, // Assign global index
                    indexInLevel: currentLevelIndex, // Assign index within its level
                });

                // Increment counters
                levelIndices.set(headingCheck.level, currentLevelIndex + 1);
                globalIndex++; // Increment global index
            }
        }
        
        // Build hierarchy context for all headings
        return this.buildHeadingHierarchy(headings);
    }

    /**
     * Checks if a line is a markdown heading
     * 
     * @param line The line to check
     * @returns Object with isHeading flag, level (1-6), and text content
     */
    isHeading(line: string): HeadingCheckResult {
        // Match markdown heading pattern: # to ###### followed by optional space and text
        // Must have exactly 1-6 # symbols, followed by either:
        // - a space and then text, OR
        // - text directly (no space), OR
        // - end of line (empty heading)
        // More than 6 # symbols is not a valid heading
        const match = line.match(/^(#{1,6})(?:$|\s(.*)$|([^#\s].*)$)/);
        
        if (match) {
            // match[2] is text after space, match[3] is text without space
            const text = match[2] ?? match[3] ?? "";
            
            return {
                isHeading: true,
                level: match[1].length,
                text: text,
            };
        }
        
        return {
            isHeading: false,
            level: 0,
            text: "",
        };
    }

    /**
     * Builds the heading hierarchy by populating context paths
     * 
     * Context is built from parent headings. For example:
     * - # Chapter 1 -> context: []
     * - ## Section A -> context: ["Chapter 1"]
     * - ### Subsection 1 -> context: ["Chapter 1", "Section A"]
     * 
     * @param headings Array of headings to process
     * @returns Same array with context paths populated
     */
    buildHeadingHierarchy(headings: HeadingInfo[]): HeadingInfo[] {
        // Stack to track current heading hierarchy
        // Each entry is [level, text]
        const hierarchyStack: Array<{ level: number; text: string }> = [];
        
        for (const heading of headings) {
            // Pop all headings from stack that are at same level or lower
            // (lower level = higher number, e.g., h3 is lower than h2)
            while (
                hierarchyStack.length > 0 &&
                hierarchyStack[hierarchyStack.length - 1].level >= heading.level
            ) {
                hierarchyStack.pop();
            }
            
            // Build context from remaining stack
            heading.context = hierarchyStack.map(h => h.text);
            
            // Push current heading to stack
            hierarchyStack.push({ level: heading.level, text: heading.text });
        }
        
        return headings;
    }

    /**
     * Updates the code block state based on the current line
     * 
     * @param line Current line being processed
     * @param state Code block state object to update
     */
    private updateCodeBlockState(
        line: string,
        state: { inCodeBlock: boolean; delimiter: string },
    ): void {
        const trimmedLine = line.trim();
        
        // Check for code block delimiters (``` or ~~~)
        if (trimmedLine.startsWith("```") || trimmedLine.startsWith("~~~")) {
            const delimiter = trimmedLine.substring(0, 3);
            
            if (!state.inCodeBlock) {
                // Entering code block
                state.inCodeBlock = true;
                state.delimiter = delimiter;
            } else if (trimmedLine === state.delimiter || trimmedLine.startsWith(state.delimiter)) {
                // Exiting code block (must match the opening delimiter)
                // Allow closing with just the delimiter or delimiter followed by anything
                if (trimmedLine === state.delimiter) {
                    state.inCodeBlock = false;
                    state.delimiter = "";
                }
            }
        }
    }

    /**
     * Checks if a line is inside a block quote
     * 
     * @param line The line to check
     * @returns true if the line starts with > (block quote)
     */
    isInQuote(line: string): boolean {
        // Check if line starts with > (possibly with leading whitespace)
        // BUT: Ignore callout blocks like > [!info], > [!note], etc.
        // These are Obsidian callouts, not regular quotes
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
            // Check if it's a callout (> [!type])
            if (/^>\s*\[!/.test(trimmed)) {
                return false; // It's a callout, not a quote
            }
            return true; // It's a regular quote
        }
        return false;
    }

    /**
     * Checks if a specific line number is inside a code block
     * This is a utility method for external use when you need to check
     * a specific line without processing the entire document
     * 
     * @param lineNumber The line number to check (0-based)
     * @param noteLines All lines in the note
     * @returns true if the line is inside a code block
     */
    isInCodeBlock(lineNumber: number, noteLines: string[]): boolean {
        const state = { inCodeBlock: false, delimiter: "" };
        
        for (let i = 0; i <= lineNumber && i < noteLines.length; i++) {
            this.updateCodeBlockState(noteLines[i], state);
        }
        
        return state.inCodeBlock;
    }
}
