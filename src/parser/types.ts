/**
 * Common types for all flashcard parsers
 * 
 * @module parser/types
 */

import { CardType } from "../Question";

/**
 * Configuration options for the flashcard parser
 */
export interface ParserOptions {
    /** Separator for single-line basic cards (e.g., "::") */
    singleLineCardSeparator: string;
    /** Separator for single-line reversed cards (e.g., ":::") */
    singleLineReversedCardSeparator: string;
    /** Separator for multiline basic cards (e.g., "?") */
    multilineCardSeparator: string;
    /** Separator for multiline reversed cards (e.g., "??") */
    multilineReversedCardSeparator: string;
    /** Optional end marker for multiline cards (e.g., "---") */
    multilineCardEndMarker: string;
    /** Patterns for cloze deletions (e.g., ["==[123;;]answer[;;hint]=="]) */
    clozePatterns: string[];
}

/**
 * Represents a parsed flashcard question with its metadata
 */
export class ParsedQuestionInfo {
    /** The type of flashcard (SingleLineBasic, MultiLineBasic, Cloze, etc.) */
    cardType: CardType;
    /** The raw text content of the flashcard */
    text: string;

    /** First line number of the flashcard (0-indexed) */
    firstLineNum: number;
    /** Last line number of the flashcard (0-indexed) */
    lastLineNum: number;

    /** Heading context path for header-based flashcards (optional) */
    headingContext?: string[];
    /** Flag indicating if this is a header-based flashcard */
    isHeaderBased?: boolean;
    /** Flag indicating if this is a QA format flashcard (question under heading) */
    isQAFormat?: boolean;

    /**
     * Creates a new ParsedQuestionInfo instance
     * @param cardType - The type of flashcard
     * @param text - The raw text content
     * @param firstLineNum - First line number (0-indexed)
     * @param lastLineNum - Last line number (0-indexed)
     */
    constructor(cardType: CardType, text: string, firstLineNum: number, lastLineNum: number) {
        this.cardType = cardType;
        this.text = text;
        this.firstLineNum = firstLineNum;
        this.lastLineNum = lastLineNum;
    }

    /**
     * Checks if a given line number is part of this flashcard
     * @param lineNum - The line number to check (0-indexed)
     * @returns true if the line is part of this flashcard, false otherwise
     */
    isQuestionLineNum(lineNum: number): boolean {
        return lineNum >= this.firstLineNum && lineNum <= this.lastLineNum;
    }
}
