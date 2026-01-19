/**
 * ParsedFlashcardBuilder
 *
 * Constructs standardized ParsedFlashcard objects from extracted card content.
 * Responsibilities:
 * - Generate deterministic IDs based on content hash
 * - Populate context information (file path, line number, headers path)
 * - Propagate tags from note to flashcard
 * - Include metadata (ruleId, extracted variables)
 *
 * @module parser/rule-based/ParsedFlashcardBuilder
 */

import { ParsedFlashcard, RuleId, TagVarValue } from "./types";
import { cyrb53 } from "../../utils/utils";

/**
 * Input data for building a ParsedFlashcard
 */
export interface FlashcardBuildInput {
    /** Front side content (Markdown) */
    front: string;

    /** Back side content (Markdown) */
    back: string;

    /** ID of the rule that generated this card */
    ruleId: RuleId;

    /** File path of the note */
    filePath: string;

    /** File name of the note */
    fileName: string;

    /** Line number where the flashcard starts */
    lineNumber: number;

    /** Hierarchical path of parent headings */
    headersPath: string[];

    /** Tags from the note */
    tags: string[];

    /** Variables extracted from tag patterns */
    vars?: Record<string, TagVarValue>;

    /** Optional Obsidian block ID (if present, use instead of hash) */
    blockId?: string;

    /** Additional metadata to include in the flashcard */
    metadata?: Record<string, unknown>;
}

/**
 * Builds ParsedFlashcard objects with deterministic IDs and complete metadata
 */
export class ParsedFlashcardBuilder {
    /**
     * Build a ParsedFlashcard from the provided input
     *
     * @param input - The flashcard build input data
     * @returns A complete ParsedFlashcard object
     */
    build(input: FlashcardBuildInput): ParsedFlashcard {
        // Generate deterministic ID
        const id = this.generateId(input);

        // Build metadata object
        const metadata: Record<string, unknown> = {
            ruleId: input.ruleId,
            ...(input.metadata || {}), // Include extra metadata
        };

        // Include extracted variables in metadata if present
        if (input.vars && Object.keys(input.vars).length > 0) {
            metadata.vars = input.vars;
        }

        // Construct the ParsedFlashcard
        return {
            id,
            ruleId: input.ruleId,
            front: input.front,
            back: input.back,
            context: {
                filePath: input.filePath,
                fileName: input.fileName,
                lineNumber: input.lineNumber,
                headersPath: [...input.headersPath], // Create a copy to avoid mutations
            },
            tags: [...input.tags], // Create a copy to avoid mutations
            metadata,
        };
    }

    /**
     * Generate a deterministic ID for the flashcard
     *
     * Uses block ID if available, otherwise generates a hash from the content.
     * The hash is based on front + back content to ensure uniqueness.
     *
     * @param input - The flashcard build input data
     * @returns A deterministic ID string
     */
    private generateId(input: FlashcardBuildInput): string {
        // If a block ID is provided, use it
        if (input.blockId) {
            return input.blockId;
        }

        // Otherwise, generate a hash from the content
        // Combine front and back to create a unique content string
        const contentForHash = `${input.front}\n---\n${input.back}`;

        // Generate hash and take first 14 characters for reasonable length
        const fullHash = cyrb53(contentForHash);
        return fullHash.substring(0, 14);
    }
}
