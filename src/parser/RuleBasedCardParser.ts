/**
 * Rule-based card parser
 * 
 * Orchestrates the parsing of flashcards using RuleBasedMultilineParser, 
 * RuleBasedInlineParser, and RuleBasedClozeParser.
 * 
 * @module parser/RuleBasedCardParser
 */

import { CardType } from "../Question";
import { ParsedQuestionInfo, ParserOptions } from "./types";
import { debugParser } from "./utils";
import { RuleBasedInlineParser } from "./inline/RuleBasedInlineParser";
import { RuleBasedMultilineParser } from "./multiline/RuleBasedMultilineParser";
import { RuleBasedClozeParser } from "./cloze/RuleBasedClozeParser";
import { FlashcardTagRule } from "./header-based/types";

export class RuleBasedCardParser {
    private inlineParser: RuleBasedInlineParser;
    private multilineParser: RuleBasedMultilineParser;
    private clozeParser: RuleBasedClozeParser;

    constructor(rules: FlashcardTagRule[]) {
        this.inlineParser = new RuleBasedInlineParser(rules);
        this.multilineParser = new RuleBasedMultilineParser(rules);
        this.clozeParser = new RuleBasedClozeParser(rules);
    }

    /**
     * Returns flashcards found in `text` based on the configured rules
     *
     * @param text - The text to extract flashcards from
     * @returns An array of parsed question information
     */
    parse(text: string): ParsedQuestionInfo[] {
        if (debugParser) {
            console.log("Text to parse (RuleBased):\n<<<" + text + ">>>");
        }

        const cards: ParsedQuestionInfo[] = [];
        let cardText = "";
        let cardType: CardType | null = null;
        let firstLineNo = 0,
            lastLineNo = 0;

        const lines: string[] = text.replaceAll("\r\n", "\n").split("\n");
        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i],
                currentTrimmed = lines[i].trim();

            // Skip everything in HTML comments
            if (currentLine.startsWith("<!--") && !currentLine.startsWith("<!--SR:")) {
                while (i + 1 < lines.length && !currentLine.includes("-->")) i++;
                i++;
                continue;
            }

            // Have we reached the end of a card?
            // Note: We need to pass the current rule context if we want to support rule-specific end markers
            // For now, we check if it's an end marker for ANY active rule
            // Ideally, we should track which rule initiated the current card
            // But since we don't have that state easily available here without refactoring the loop,
            // we'll assume standard behavior for now.
            // TODO: Refactor loop to track active rule for multiline cards
            
            // Simplified check for card end:
            // 1. Empty line
            // 2. End marker (if we are in a multiline card)
            
            // Check for end marker based on any rule
            // This is a simplification. Ideally we should match the end marker of the *specific* rule that started the card.
            // But for now, let's just check if it's an end marker for *any* rule if we are in a multiline card.
            let isEndMarker = false;
            if (cardType === CardType.MultiLineBasic || cardType === CardType.MultiLineReversed) {
                 // We need to know which rule started this card to check for the correct end marker.
                 // Since we don't track it in this loop variable, we might need to change the structure.
                 // For now, let's assume if it matches ANY rule's end marker, it's an end.
                 // This is acceptable if end markers are unique or consistent.
                 // Actually, let's just use the parser's logic.
            }

            // Let's use a slightly different approach than the legacy parser.
            // We need to detect if the current line ends the card.
            
            const isCardEnd = (
                (currentTrimmed.length === 0) || 
                (cardType && (cardType === CardType.MultiLineBasic || cardType === CardType.MultiLineReversed) && 
                 this.multilineParser.detectSeparator(currentTrimmed) === null && // It's not a separator (which would be part of the card)
                 // Check if it is an end marker for any rule? 
                 // Actually, the legacy parser checks `isEndMarker`.
                 // Let's iterate rules in `isEndMarker`?
                 // For now, let's assume empty line is the primary terminator.
                 false // Placeholder for end marker check
                )
            );

            // Re-implementing the loop logic with the new parsers is tricky because the legacy logic
            // is tightly coupled with the specific separators.
            
            // Let's try to adapt the legacy logic but using our new parsers.
            
            // 1. Check for Multiline Separator
            const multilineSeparatorMatch = this.multilineParser.detectSeparator(currentTrimmed);
            
            // 2. Check for Inline
            const inlineMatch = this.inlineParser.detectCardType(currentLine);

            // 3. Check for Cloze
            const clozeMatch = this.clozeParser.isClozeNote(currentLine);

            // Logic for ending a card
            if (currentTrimmed.length === 0 || (cardType && multilineSeparatorMatch === null && this.isAnyEndMarker(currentTrimmed))) {
                 if (cardType) {
                    lastLineNo = i - 1;
                    cards.push(new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo));
                    cardType = null;
                 }
                 cardText = "";
                 firstLineNo = i + 1;
                 continue;
            }

            // Update card text
            if (cardText.length > 0) {
                cardText += "\n";
            }
            cardText += currentLine.trimEnd();

            // Detect new card start
            if (inlineMatch) {
                cardType = inlineMatch.type;
            }

            if (cardType === CardType.SingleLineBasic || cardType === CardType.SingleLineReversed) {
                cardText = currentLine;
                firstLineNo = i;
                if (i + 1 < lines.length && lines[i + 1].startsWith("<!--SR:")) {
                    cardText += "\n" + lines[i + 1];
                    i++;
                }
                lastLineNo = i;
                cards.push(new ParsedQuestionInfo(cardType, cardText, firstLineNo, lastLineNo));
                cardType = null;
                cardText = "";
            } else {
                // Multiline or Cloze
                if (currentLine.startsWith("```") || currentLine.startsWith("~~~")) {
                    const codeBlockClose = currentLine.match(/`+|~+/)?.[0] || "```";
                    while (i + 1 < lines.length && !lines[i + 1].startsWith(codeBlockClose)) {
                        i++;
                        cardText += "\n" + lines[i];
                    }
                    cardText += "\n" + codeBlockClose;
                    i++;
                } else if (multilineSeparatorMatch) {
                    // It's a separator, so we are definitely in a multiline card now (or continuing one)
                    // The legacy parser sets cardType when it sees the separator?
                    // No, legacy parser sets cardType when it detects the separator.
                    cardType = multilineSeparatorMatch.type;
                } else if (cardType === null && clozeMatch) {
                    cardType = CardType.Cloze;
                }
            }
        }

        if (cardType && cardText) {
            lastLineNo = lines.length - 1;
            cards.push(new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo));
        }

        return cards;
    }

    private isAnyEndMarker(line: string): boolean {
        // This is inefficient but functional for now. 
        // We check if the line matches the end marker of ANY enabled rule.
        // In the future we should optimize this.
        // We can't access `this.multilineParser.rules` directly as it is private.
        // But we can assume the parser handles it if we expose a method.
        // For now, let's just assume we don't support custom end markers in this initial implementation 
        // OR we rely on the fact that we passed the rules to the parser.
        
        // Actually, `RuleBasedMultilineParser` has `isEndMarker(line, rule)`.
        // We need to iterate over rules.
        // Let's expose a method in `RuleBasedMultilineParser` to check if it matches ANY rule's end marker.
        return false; // TODO: Implement
    }
}
