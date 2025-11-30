/**
 * Cloze flashcard parser
 * 
 * Parses cloze deletion flashcards using patterns like ==answer==, **answer**, {{answer}}
 * 
 * @module parser/cloze
 */

import { ClozeCrafter } from "clozecraft";
import { CardType } from "../../Question";
import { ParserOptions } from "../types";

/**
 * Parses cloze deletion flashcards from text.
 * 
 * Cloze cards use patterns to mark deletions that become fill-in-the-blank questions.
 * 
 * @example
 * // Highlight cloze
 * "The capital of France is ==Paris==" -> CardType.Cloze
 * 
 * // Bold cloze
 * "The capital of France is **Paris**" -> CardType.Cloze
 * 
 * // Curly brace cloze
 * "The capital of France is {{Paris}}" -> CardType.Cloze
 */
export class ClozeCardParser {
    private clozecrafter: ClozeCrafter;

    constructor(options: ParserOptions) {
        this.clozecrafter = new ClozeCrafter(options.clozePatterns);
    }

    /**
     * Checks if a line contains a cloze deletion
     * @param line - The line to check
     * @returns true if the line contains a cloze deletion
     */
    isClozeNote(line: string): boolean {
        return this.clozecrafter.isClozeNote(line);
    }

    /**
     * Gets the card type for cloze cards
     * @returns CardType.Cloze
     */
    getCardType(): CardType {
        return CardType.Cloze;
    }
}
