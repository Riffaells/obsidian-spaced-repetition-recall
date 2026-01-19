/**
 * Extracted card data structure
 *
 * Represents a flashcard extracted by a type-specific extractor
 * before being built into a ParsedFlashcard
 *
 * @module parser/rule-based/types/extracted-card
 */

/**
 * Represents a flashcard extracted from content
 * This is an intermediate format before building ParsedFlashcard
 */
export interface ExtractedCard {
    /** Front side content (Markdown) */
    front: string;

    /** Back side content (Markdown) */
    back: string;

    /** Line number where this card starts (0-indexed) */
    lineNumber: number;

    /** Hierarchical path of parent headings */
    headersPath: string[];

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
