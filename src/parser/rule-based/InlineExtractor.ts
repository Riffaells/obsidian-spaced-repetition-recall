/**
 * InlineExtractor
 *
 * Extracts flashcards from inline text based on InlineConfig rules.
 * Implements separator detection, bidirectional card creation,
 * and position-based matching constraints.
 *
 * @module parser/rule-based/InlineExtractor
 */

import { InlineConfig, ExtractedCard, ExtractionContext, Range } from "./types";

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

        // Check for reverse separator first (if defined)
        if (config.separatorReverse) {
            const reverseCard = this.extractCardWithSeparator(
                line,
                lineNumber,
                config.separatorReverse,
                config.startOfLineOnly,
                context,
                true, // bidirectional
            );

            if (reverseCard) {
                cards.push(...reverseCard);
                return cards; // Only use first separator occurrence
            }
        }

        // Check for regular separator
        const regularCard = this.extractCardWithSeparator(
            line,
            lineNumber,
            config.separator,
            config.startOfLineOnly,
            context,
            false, // unidirectional
        );

        if (regularCard) {
            cards.push(...regularCard);
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
        // Find separator position
        const separatorIndex = this.findSeparatorIndex(line, separator, startOfLineOnly);

        if (separatorIndex === -1) {
            return null;
        }

        // Split line at separator
        const front = line.substring(0, separatorIndex).trim();
        const back = line.substring(separatorIndex + separator.length).trim();

        // Skip if either side is empty
        if (!front || !back) {
            return null;
        }

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
