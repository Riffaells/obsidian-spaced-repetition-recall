/**
 * ClozeProcessor
 *
 * Processes cloze deletions in extracted flashcard content.
 * Supports pattern matching with named capture groups, priority-based
 * pattern selection, and fallback to global patterns.
 *
 * @module parser/rule-based/ClozeProcessor
 */

import { ClozeSettings, ClozePattern } from "./types";

/**
 * Represents a single cloze deletion within text
 */
export interface ClozeDeletion {
    /** Unique identifier for this deletion (auto-generated or from pattern) */
    id: string;
    /** The text to be hidden/revealed */
    answer: string;
    /** Optional hint to display when answer is hidden */
    hint?: string;
    /** Character position in the original text */
    position: number;
}

/**
 * Represents a cloze card with multiple deletions
 */
export interface ClozeCard {
    /** The full text with cloze deletions */
    text: string;
    /** Array of all deletions found in the text */
    deletions: ClozeDeletion[];
}

/**
 * Processes cloze deletions in text based on configured patterns
 */
export class ClozeProcessor {
    /**
     * Process cloze deletions in text
     *
     * @param text - The text to process for cloze deletions
     * @param config - Cloze configuration from the rule
     * @param globalPatterns - Global default patterns to use as fallback
     * @returns Array of cloze cards (one per deletion), or empty array if no deletions found
     */
    process(text: string, config: ClozeSettings, globalPatterns: ClozePattern[]): ClozeCard[] {
        // If cloze processing is not enabled, return empty array
        if (!config.enabled) {
            return [];
        }

        // Determine which patterns to use
        const patterns = this.selectPatterns(config, globalPatterns);

        // If no patterns available, return empty array
        if (patterns.length === 0) {
            return [];
        }

        // Sort patterns by priority (highest first)
        const sortedPatterns = this.sortPatternsByPriority(patterns);

        // Find all deletions in the text
        const deletions = this.findDeletions(text, sortedPatterns);

        // If no deletions found, return empty array
        if (deletions.length === 0) {
            return [];
        }

        // Create a cloze card for each deletion
        return this.createClozeCards(text, deletions);
    }

    /**
     * Select which patterns to use based on configuration
     *
     * @param config - Cloze configuration
     * @param globalPatterns - Global default patterns
     * @returns Array of patterns to use
     */
    private selectPatterns(config: ClozeSettings, globalPatterns: ClozePattern[]): ClozePattern[] {
        // If rule has specific patterns, use those
        if (config.patterns && config.patterns.length > 0) {
            return config.patterns;
        }

        // Otherwise, fall back to global patterns
        return globalPatterns;
    }

    /**
     * Sort patterns by priority (highest first)
     * Patterns without priority are treated as priority 0
     *
     * @param patterns - Patterns to sort
     * @returns Sorted patterns
     */
    private sortPatternsByPriority(patterns: ClozePattern[]): ClozePattern[] {
        return [...patterns].sort((a, b) => {
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            return priorityB - priorityA; // Descending order
        });
    }

    /**
     * Find all cloze deletions in text using the provided patterns
     *
     * @param text - Text to search
     * @param patterns - Sorted patterns to try (highest priority first)
     * @returns Array of deletions found
     */
    private findDeletions(text: string, patterns: ClozePattern[]): ClozeDeletion[] {
        const deletions: ClozeDeletion[] = [];
        const usedPositions = new Set<number>();

        // Try each pattern in priority order
        for (const pattern of patterns) {
            try {
                const regex = new RegExp(pattern.pattern, "g");
                let match: RegExpExecArray | null;

                while ((match = regex.exec(text)) !== null) {
                    const position = match.index;

                    // Skip if this position was already matched by a higher priority pattern
                    if (usedPositions.has(position)) {
                        continue;
                    }

                    // Extract deletion information from named capture groups
                    const deletion = this.extractDeletion(match, position, deletions.length);

                    if (deletion) {
                        deletions.push(deletion);
                        usedPositions.add(position);
                    }
                }
            } catch (error) {
                // Invalid regex pattern - skip it
                console.warn(`Invalid cloze pattern: ${pattern.pattern}`, error);
            }
        }

        return deletions;
    }

    /**
     * Extract deletion information from a regex match
     *
     * @param match - Regex match result
     * @param position - Position in text
     * @param index - Index for auto-generated ID
     * @returns ClozeDeletion or null if extraction failed
     */
    private extractDeletion(
        match: RegExpExecArray,
        position: number,
        index: number,
    ): ClozeDeletion | null {
        const groups = match.groups;

        // Extract answer from named capture group or full match
        const answer = groups?.answer ?? match[1] ?? match[0];

        // If no answer found, skip this match
        if (!answer || answer.trim().length === 0) {
            return null;
        }

        // Extract optional hint
        const hint = groups?.hint;

        // Extract or generate ID
        const id = groups?.id ?? `c${index + 1}`;

        return {
            id,
            answer: answer.trim(),
            hint: hint?.trim(),
            position,
        };
    }

    /**
     * Create cloze cards from text and deletions
     *
     * In Anki-style cloze, each deletion becomes a separate card.
     * For each card, one deletion is revealed while others remain hidden.
     *
     * @param text - Original text
     * @param deletions - All deletions found
     * @returns Array of cloze cards
     */
    private createClozeCards(text: string, deletions: ClozeDeletion[]): ClozeCard[] {
        // Group deletions by ID (same ID = same card)
        const deletionsByCard = new Map<string, ClozeDeletion[]>();

        for (const deletion of deletions) {
            const cardDeletions = deletionsByCard.get(deletion.id) || [];
            cardDeletions.push(deletion);
            deletionsByCard.set(deletion.id, cardDeletions);
        }

        // Create a card for each unique ID
        const cards: ClozeCard[] = [];

        for (const [id, cardDeletions] of deletionsByCard) {
            cards.push({
                text,
                deletions: cardDeletions,
            });
        }

        return cards;
    }
}
