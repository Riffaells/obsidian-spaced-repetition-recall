/**
 * Rule-based inline flashcard parser
 * 
 * Parses inline flashcards based on FlashcardTagRule configuration
 * 
 * @module parser/inline
 */

import { CardType } from "../../Question";
import { FlashcardTagRule } from "../header-based/types";
import { hasInlineMarker } from "../utils";

export class RuleBasedInlineParser {
    private rules: FlashcardTagRule[];
    private sortedRules: FlashcardTagRule[];

    constructor(rules: FlashcardTagRule[]) {
        this.rules = rules.filter(r => r.enabled && r.inlineRules);
        
        // Sort rules by separator length (longest first) to handle overlaps (e.g. ::: vs ::)
        this.sortedRules = [...this.rules].sort((a, b) => {
            const sepA = a.inlineRules!.separator || "";
            const revSepA = a.inlineRules!.reversedSeparator || "";
            const lenA = Math.max(sepA.length, revSepA.length);

            const sepB = b.inlineRules!.separator || "";
            const revSepB = b.inlineRules!.reversedSeparator || "";
            const lenB = Math.max(sepB.length, revSepB.length);
            
            return lenB - lenA;
        });
    }

    /**
     * Checks if a line contains an inline flashcard marker based on active rules
     * @param line - The line to check
     * @returns The card type and the rule that matched, or null
     */
    detectCardType(line: string): { type: CardType, rule: FlashcardTagRule } | null {
        for (const rule of this.sortedRules) {
            const config = rule.inlineRules!;
            const sep = config.separator || "";
            const revSep = config.reversedSeparator || "";
            
            if (revSep && hasInlineMarker(line, revSep)) {
                return { type: CardType.SingleLineReversed, rule };
            }
            if (sep && hasInlineMarker(line, sep)) {
                return { type: CardType.SingleLineBasic, rule };
            }
        }
        return null;
    }
}
