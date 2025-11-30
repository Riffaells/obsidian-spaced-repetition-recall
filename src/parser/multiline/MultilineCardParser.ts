/**
 * Multiline flashcard parser
 * 
 * Parses multiline flashcards with separators like ? and ??
 * 
 * @module parser/multiline
 */

import { CardType } from "../../Question";
import { ParserOptions } from "../types";

/**
 * Parses multiline flashcards from text.
 * 
 * Multiline cards use separators like ? for basic cards and ?? for reversed cards.
 * The question is the text before the separator, and the answer is the text after.
 * 
 * @example
 * // Basic multiline card
 * "Question text\n?\nAnswer text" -> CardType.MultiLineBasic
 * 
 * // Reversed multiline card
 * "Question text\n??\nAnswer text" -> CardType.MultiLineReversed
 */
export class MultilineCardParser {
    private options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Checks if a line is a multiline card separator
     * @param trimmedLine - The trimmed line to check
     * @returns The card type if it's a separator, null otherwise
     */
    detectSeparator(trimmedLine: string): CardType | null {
        if (trimmedLine === this.options.multilineReversedCardSeparator) {
            return CardType.MultiLineReversed;
        }
        if (trimmedLine === this.options.multilineCardSeparator) {
            return CardType.MultiLineBasic;
        }
        return null;
    }

    /**
     * Checks if a line is the end marker for multiline cards
     * @param trimmedLine - The trimmed line to check
     * @returns true if it's an end marker, false otherwise
     */
    isEndMarker(trimmedLine: string): boolean {
        return !!(this.options.multilineCardEndMarker && 
                  trimmedLine === this.options.multilineCardEndMarker);
    }

    /**
     * Checks if a line is empty (potential card boundary)
     * @param trimmedLine - The trimmed line to check
     * @returns true if the line is empty
     */
    isEmptyLine(trimmedLine: string): boolean {
        return trimmedLine.length === 0;
    }

    /**
     * Determines if we've reached the end of a card
     * @param trimmedLine - The trimmed line to check
     * @param hasCardType - Whether we're currently building a card
     * @returns true if this marks the end of a card
     */
    isCardEnd(trimmedLine: string, hasCardType: boolean): boolean {
        const isEmptyLine = this.isEmptyLine(trimmedLine);
        const hasEndMarker = this.isEndMarker(trimmedLine);
        
        // We've probably reached the end of a card
        if (isEmptyLine && !this.options.multilineCardEndMarker) {
            return true;
        }
        
        // Empty line & we're not picking up any card
        if (isEmptyLine && !hasCardType) {
            return true;
        }
        
        // We've reached the end of a multi line card & we're using custom end markers
        if (hasEndMarker) {
            return true;
        }
        
        return false;
    }
}
