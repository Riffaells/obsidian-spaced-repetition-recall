/**
 * InlineExtractor
 *
 * Extracts flashcards from inline text based on InlineConfig rules.
 * Implements separator detection, bidirectional card creation,
 * and position-based matching constraints.
 *
 * Supports context-aware extraction for lists and callouts.
 *
 * @module parser/rule-based/InlineExtractor
 */

import { InlineConfig, ExtractedCard, ExtractionContext, Range } from "./types";
import { ContextCleaner } from "./ContextCleaner";

/**
 * Extracts flashcards from inline text using separator patterns
 */
export class InlineExtractor {
    /**
     * Extract flashcards from text based on inline configuration
     *
     * @param text - The markdown text to parse
     * @param config - Inline extraction configuration
     * @param context - Extraction context with metadata
     * @param codeBlocks - Code block ranges to skip
     * @returns Array of extracted flashcards
     */
    extract(
        text: string,
        config: InlineConfig,
        context: ExtractionContext,
        codeBlocks: Range[],
    ): ExtractedCard[] {
        const lines = text.split("\n");
        const cards: ExtractedCard[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const absoluteLineNumber = context.lineOffset + i;

            // Skip if line is inside a code block
            if (context.skipCodeBlocks && this.isLineInCodeBlock(absoluteLineNumber, codeBlocks)) {
                continue;
            }

            // Try to extract cards from this line
            const lineCards = this.extractCardsFromLine(line, absoluteLineNumber, config, context);

            cards.push(...lineCards);
        }

        return cards;
    }

    /**
     * Extract flashcards from a single line
     *
     * @param line - The line to parse
     * @param lineNumber - Absolute line number
     * @param config - Inline extraction configuration
     * @param context - Extraction context
     * @returns Array of extracted flashcards from this line
     */
    private extractCardsFromLine(
        line: string,
        lineNumber: number,
        config: InlineConfig,
        context: ExtractionContext,
    ): ExtractedCard[] {
        const cards: ExtractedCard[] = [];

        // Detect if this is a context-aware line (list, callout)
        const lineContext = ContextCleaner.detectContext(line);
        const hasContext = lineContext.type !== "normal";

        // Build list of separators to try
        const separatorsToTry: Array<{ separator: string; bidirectional: boolean }> = [];

        // Add reverse separator first (higher priority)
        if (config.separatorReverse) {
            separatorsToTry.push({ separator: config.separatorReverse, bidirectional: true });
        }

        // Add main separator
        separatorsToTry.push({ separator: config.separator, bidirectional: false });

        // Add context-aware separators if this is a context line
        if (hasContext && config.contextAwareSeparators) {
            for (const sep of config.contextAwareSeparators) {
                separatorsToTry.push({ separator: sep, bidirectional: false });
            }
        }

        // Try each separator in order
        for (const { separator, bidirectional } of separatorsToTry) {
            const result = this.extractCardWithSeparator(
                line,
                lineNumber,
                separator,
                config.startOfLineOnly,
                context,
                bidirectional,
            );

            if (result) {
                cards.push(...result);
                return cards; // Only use first matching separator
            }
        }

        return cards;
    }

    /**
     * Extract card(s) from a line using a specific separator
     *
     * @param line - The line to parse
     * @param lineNumber - Absolute line number
     * @param separator - The separator string to look for
     * @param startOfLineOnly - Whether separator must be at line start
     * @param context - Extraction context
     * @param bidirectional - Whether to create reverse card as well
     * @returns Array of extracted cards (1 or 2 cards), or null if no match
     */
    private extractCardWithSeparator(
        line: string,
        lineNumber: number,
        separator: string,
        startOfLineOnly: boolean,
        context: ExtractionContext,
        bidirectional: boolean,
    ): ExtractedCard[] | null {
        // Detect line context (list, callout, etc.)
        const lineContext = ContextCleaner.detectContext(line);

        // For context-aware lines, we need to work with the cleaned version
        // to find the separator, but preserve the original for proper splitting
        const workingLine = lineContext.type !== "normal" 
            ? line.substring(lineContext.prefix.length)
            : line;

        // Find separator position in the working line
        const separatorIndex = this.findSeparatorIndex(workingLine, separator, startOfLineOnly);

        if (separatorIndex === -1) {
            return null;
        }

        // Split at separator
        let front = workingLine.substring(0, separatorIndex).trim();
        let back = workingLine.substring(separatorIndex + separator.length).trim();

        // Skip if either side is empty
        if (!front || !back) {
            return null;
        }

        // Clean context prefixes while preserving rich markdown
        const cleaned = ContextCleaner.cleanFlashcard(front, back, line);
        front = cleaned.front;
        back = cleaned.back;

        const cards: ExtractedCard[] = [];

        // Create forward card
        cards.push({
            front,
            back,
            lineNumber,
            headersPath: context.headersPath,
        });

        // Create reverse card if bidirectional
        if (bidirectional) {
            cards.push({
                front: back,
                back: front,
                lineNumber,
                headersPath: context.headersPath,
            });
        }

        return cards;
    }

    /**
     * Find the index of the separator in the line
     *
     * @param line - The line to search
     * @param separator - The separator string
     * @param startOfLineOnly - Whether separator must be at line start
     * @returns Index of separator, or -1 if not found
     */
    private findSeparatorIndex(line: string, separator: string, startOfLineOnly: boolean): number {
        if (startOfLineOnly) {
            // Check if line starts with separator (after optional whitespace)
            const trimmedLine = line.trimStart();
            const whitespaceLength = line.length - trimmedLine.length;

            if (trimmedLine.startsWith(separator)) {
                // Return the index in the original line (accounting for leading whitespace)
                return whitespaceLength;
            }
            return -1;
        } else {
            // Find first occurrence anywhere in the line
            return line.indexOf(separator);
        }
    }

    /**
     * Check if a line number falls within any code block
     *
     * @param lineNumber - The line number to check
     * @param codeBlocks - Array of code block ranges
     * @returns True if the line is within a code block
     */
    private isLineInCodeBlock(lineNumber: number, codeBlocks: Range[]): boolean {
        return codeBlocks.some((block) => lineNumber >= block.start && lineNumber <= block.end);
    }
}
