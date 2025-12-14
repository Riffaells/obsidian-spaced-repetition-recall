/**
 * Utility functions for parser integration
 *
 * This module provides helper functions for converting between the new rule-based parser
 * (ParsedFlashcard) and the legacy Question model.
 *
 * @module parser/ParserUtils
 */

import { CardType } from "src/core/models/Question";
import { ParsedFlashcard } from "./rule-based/types/flashcard";
import { FlashcardRule, InlineRule, MultilineRule } from "./rule-based/types/rules";
import { InlineConfig, MultilineConfig } from "./rule-based/types/configs";
import { DocumentStructureParser } from "./rule-based/DocumentStructureParser";

/**
 * Derives the CardType from a ParsedFlashcard and its associated rule.
 *
 * The CardType determines how the flashcard is displayed and reviewed:
 * - SingleLineBasic: One-way card (front -> back)
 * - SingleLineReversed: Two-way card (front <-> back)
 * - MultiLineBasic: Multi-line one-way card
 * - MultiLineReversed: Multi-line two-way card
 * - Cloze: Cloze deletion card
 *
 * @param flashcard - The parsed flashcard
 * @param rule - The rule that generated this flashcard
 * @returns The appropriate CardType for this flashcard
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export function deriveCardType(flashcard: ParsedFlashcard, rule: FlashcardRule): CardType {
    // Check if it's a cloze card (has cloze metadata)
    if (flashcard.metadata?.clozeIndex !== undefined) {
        return CardType.Cloze;
    }

    // Determine based on rule type
    switch (rule.type) {
        case "header":
            // Header-based cards are always MultiLineBasic
            return CardType.MultiLineBasic;

        case "inline": {
            const inlineConfig = (rule as InlineRule).config;
            // If separatorReverse is defined, it's a reversed card
            return inlineConfig.separatorReverse
                ? CardType.SingleLineReversed
                : CardType.SingleLineBasic;
        }

        case "multiline": {
            // For multiline cards, check if there's a reverse separator in the config
            // Currently MultilineConfig doesn't have a reverse option, so always basic
            return CardType.MultiLineBasic;
        }

        default:
            // Default to SingleLineBasic for unknown types
            return CardType.SingleLineBasic;
    }
}

/**
 * Reconstructs the original question text from a ParsedFlashcard.
 *
 * This is used when writing questions back to the note file, ensuring the
 * original format is preserved.
 *
 * @param flashcard - The parsed flashcard
 * @param rule - The rule that generated this flashcard
 * @returns The reconstructed question text
 *
 * Requirements: 8.1, 8.2, 8.3
 */
export function reconstructQuestionText(flashcard: ParsedFlashcard, rule: FlashcardRule): string {
    switch (rule.type) {
        case "inline": {
            const inlineConfig = (rule as InlineRule).config;
            return `${flashcard.front}${inlineConfig.separator}${flashcard.back}`;
        }

        case "multiline": {
            const multilineConfig = (rule as MultilineRule).config;
            // Extract the question marker from the pattern
            const marker = extractMarkerFromPattern(multilineConfig.questionLinePattern);
            return `${marker}${flashcard.front}\n${flashcard.back}`;
        }

        case "header": {
            // For headers, the front is the heading text
            // The back is the content under the heading
            // Reconstruct as a heading with content
            const level = flashcard.metadata?.headingLevel || 2;
            const hashes = "#".repeat(level as number);
            return `${hashes} ${flashcard.front}\n${flashcard.back}`;
        }

        default:
            // Fallback to default separator
            return `${flashcard.front}::${flashcard.back}`;
    }
}

/**
 * Extracts the question marker from a multiline pattern regex.
 *
 * For example:
 * - Pattern: "^\?\s*(.+)" -> Marker: "? "
 * - Pattern: "^Q:\s*(.+)" -> Marker: "Q: "
 *
 * @param pattern - The regex pattern string
 * @returns The extracted marker, or "? " as default
 */
function extractMarkerFromPattern(pattern: string): string {
    // Remove regex anchors and capture groups to get the literal marker
    // Common patterns:
    // - "^\?\s*(.+)" -> "? "
    // - "^Q:\s*(.+)" -> "Q: "
    // - "^\*\*Q:\*\*\s*(.+)" -> "**Q:** "

    let marker = pattern;

    // Remove start anchor
    marker = marker.replace(/^\^/, "");

    // Remove capture group and everything after it
    marker = marker.replace(/\(.+\).*$/, "");

    // Replace \s* with a single space
    marker = marker.replace(/\\s\*/, " ");

    // Unescape common regex characters
    marker = marker.replace(/\\/g, "");

    // If we couldn't extract a marker, use default
    if (!marker || marker.length === 0) {
        marker = "? ";
    }

    return marker;
}

/**
 * Extracts tags from note text.
 *
 * @deprecated Prefer using Obsidian's metadataCache.getFileCache() and getAllTags()
 * for more reliable tag extraction. This regex-based approach may miss tags in frontmatter.
 *
 * Uses the DocumentStructureParser to extract Obsidian tags in the format
 * #tag or #tag/subtag.
 *
 * @param text - The note text
 * @returns Array of tags in format ["#tag1", "#tag2/subtag"]
 *
 * Requirements: 3.4
 */
export function extractTagsFromNote(text: string): string[] {
    const structure = DocumentStructureParser.parse(text);
    return structure.tags;
}
