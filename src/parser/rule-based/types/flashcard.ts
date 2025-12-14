/**
 * ParsedFlashcard type definition
 *
 * @module parser/rule-based/types/flashcard
 */

import { RuleId } from "./primitives";

/**
 * Result of the parsing process.
 * This object represents a single generated flashcard ready for storage/sync.
 */
export interface ParsedFlashcard {
    /** Unique ID of the card (hash or block-id) */
    id: string;

    /** ID of the rule that generated this card */
    ruleId: RuleId;

    /** Front side content (Markdown) */
    front: string;

    /** Back side content (Markdown) */
    back: string;

    /** Location context within the file */
    context: {
        filePath: string;
        fileName: string;
        lineNumber: number;
        /** Hierarchical path to the content, e.g., ["History", "Rome"] */
        headersPath: string[];
    };

    /**
     * Original tags from the note.
     * Used for filtering in the review UI.
     */
    tags: string[];

    /**
     * Additional metadata.
     * Typed as 'unknown' instead of 'any' to enforce type checking before usage.
     */
    metadata?: Record<string, unknown>;
}
