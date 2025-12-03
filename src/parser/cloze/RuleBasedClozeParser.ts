/**
 * Rule-based cloze flashcard parser
 * 
 * Parses cloze flashcards based on FlashcardTagRule configuration
 * 
 * @module parser/cloze
 */

import { ClozeCrafter } from "clozecraft";
import { CardType } from "../../Question";
import { FlashcardTagRule } from "../header-based/types";

export class RuleBasedClozeParser {
    private rules: FlashcardTagRule[];
    private clozecrafters: Map<string, ClozeCrafter>;

    constructor(rules: FlashcardTagRule[]) {
        this.rules = rules.filter(r => r.enabled && r.clozeRules);
        this.clozecrafters = new Map();

        for (const rule of this.rules) {
            if (rule.clozeRules && rule.clozeRules.patterns && rule.clozeRules.patterns.length > 0) {
                this.clozecrafters.set(rule.id, new ClozeCrafter(rule.clozeRules.patterns));
            }
        }
    }

    /**
     * Checks if a line contains a cloze deletion based on active rules
     * @param line - The line to check
     * @returns The rule that matched, or null
     */
    isClozeNote(line: string): { type: CardType, rule: FlashcardTagRule } | null {
        for (const rule of this.rules) {
            const crafter = this.clozecrafters.get(rule.id);
            if (crafter && crafter.isClozeNote(line)) {
                return { type: CardType.Cloze, rule };
            }
        }
        return null;
    }
}
