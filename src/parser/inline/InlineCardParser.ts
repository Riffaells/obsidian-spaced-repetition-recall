/**
 * Inline flashcard parser
 * 
 * Parses single-line flashcards with separators like :: and :::
 * 
 * @module parser/inline
 */

import { CardType } from "../../Question";
import { ParsedQuestionInfo, ParserOptions } from "../types";
import { hasInlineMarker } from "../utils";

/**
 * Parses inline flashcards from a single line of text.
 * 
 * Inline cards use separators like :: for basic cards and ::: for reversed cards.
 * 
 * @example
 * // Basic inline card
 * "Question::Answer" -> CardType.SingleLineBasic
 * 
 * // Reversed inline card
 * "Question:::Answer" -> CardType.SingleLineReversed
 */
export class InlineCardParser {
    private options: ParserOptions;
    private inlineSeparators: Array<{ separator: string; type: CardType }>;

    constructor(options: ParserOptions) {
        this.options = options;
        
        // Sort inline separators by length, longest first
        // This ensures ::: is checked before ::
        this.inlineSeparators = [
            { separator: options.singleLineCardSeparator, type: CardType.SingleLineBasic },
            { separator: options.singleLineReversedCardSeparator, type: CardType.SingleLineReversed },
        ];
        this.inlineSeparators.sort((a, b) => b.separator.length - a.separator.length);
    }

    /**
     * Checks if a line contains an inline flashcard marker
     * @param line - The line to check
     * @returns The card type if found, null otherwise
     */
    detectCardType(line: string): CardType | null {
        for (const { separator, type } of this.inlineSeparators) {
            if (hasInlineMarker(line, separator)) {
                return type;
            }
        }
        return null;
    }

    /**
     * Parses an inline card from a line
     * @param line - The line containing the inline card
     * @param lineNumber - The line number (0-indexed)
     * @param nextLine - The next line (for scheduling info)
     * @returns ParsedQuestionInfo or null if not a valid inline card
     */
    parseCard(
        line: string,
        lineNumber: number,
        nextLine?: string
    ): { card: ParsedQuestionInfo; linesConsumed: number } | null {
        const cardType = this.detectCardType(line);
        
        if (cardType !== CardType.SingleLineBasic && cardType !== CardType.SingleLineReversed) {
            return null;
        }

        let cardText = line;
        let linesConsumed = 1;

        // Pick up scheduling information if present on next line
        if (nextLine && nextLine.startsWith("<!--SR:")) {
            cardText += "\n" + nextLine;
            linesConsumed = 2;
        }

        const card = new ParsedQuestionInfo(
            cardType,
            cardText,
            lineNumber,
            lineNumber + linesConsumed - 1
        );

        return { card, linesConsumed };
    }
}
