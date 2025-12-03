/**
 * Rule-based multiline flashcard parser
 * 
 * Parses multiline flashcards based on FlashcardTagRule configuration
 * 
 * @module parser/multiline
 */

import { CardType } from "../../Question";
import { FlashcardTagRule } from "../header-based/types";

export class RuleBasedMultilineParser {
    private rules: FlashcardTagRule[];

    constructor(rules: FlashcardTagRule[]) {
        this.rules = rules.filter(r => r.enabled && r.multilineRules);
        // Sort by priority (descending)
        this.rules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Checks if a line is a multiline card separator based on active rules
     * @param trimmedLine - The trimmed line to check
     * @returns The card type and the rule that matched, or null
     */
    detectSeparator(trimmedLine: string): { type: CardType, rule: FlashcardTagRule } | null {
        for (const rule of this.rules) {
            const config = rule.multilineRules!;
            
            if (trimmedLine === config.reversedSeparator) {
                return { type: CardType.MultiLineReversed, rule };
            }
            if (trimmedLine === config.separator) {
                return { type: CardType.MultiLineBasic, rule };
            }
        }
        return null;
    }

    /**
     * Checks if a line is the end marker for a specific rule
     * @param trimmedLine - The trimmed line to check
     * @param rule - The rule to check against
     * @returns true if it's an end marker
     */
    isEndMarker(trimmedLine: string, rule: FlashcardTagRule): boolean {
        const config = rule.multilineRules!;
        return !!(config.endMarker && trimmedLine === config.endMarker);
    }
}
