/**
 * Main flashcard parser
 * 
 * This module provides the main parse function that combines all parser types:
 * inline (::), multiline (?), reversed, and cloze deletions.
 * 
 * @module parser/parse
 */

import { CardType } from "../Question";
import { ParsedQuestionInfo, ParserOptions } from "./types";
import { debugParser } from "./utils";
import { InlineCardParser } from "./inline/InlineCardParser";
import { MultilineCardParser } from "./multiline/MultilineCardParser";
import { ClozeCardParser } from "./cloze/ClozeCardParser";

/**
 * Returns flashcards found in `text`
 *
 * It is best that the text does not contain frontmatter, see extractFrontmatter for reasoning
 *
 * @param text - The text to extract flashcards from
 * @param options - Parser options
 * @returns An array of parsed question information
 */
export function parse(text: string, options: ParserOptions): ParsedQuestionInfo[] {
    if (debugParser) {
        console.log("Text to parse:\n<<<" + text + ">>>");
    }

    const inlineParser = new InlineCardParser(options);
    const multilineParser = new MultilineCardParser(options);
    const clozeParser = new ClozeCardParser(options);

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
        if (multilineParser.isCardEnd(currentTrimmed, cardType !== null)) {
            if (cardType) {
                // Create a new card
                lastLineNo = i - 1;
                cards.push(
                    new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo),
                );
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

        // Pick up inline cards
        const inlineCardType = inlineParser.detectCardType(currentLine);
        if (inlineCardType !== null) {
            cardType = inlineCardType;
        }

        if (cardType == CardType.SingleLineBasic || cardType == CardType.SingleLineReversed) {
            cardText = currentLine;
            firstLineNo = i;

            // Pick up scheduling information if present
            if (i + 1 < lines.length && lines[i + 1].startsWith("<!--SR:")) {
                cardText += "\n" + lines[i + 1];
                i++;
            }

            lastLineNo = i;
            cards.push(new ParsedQuestionInfo(cardType, cardText, firstLineNo, lastLineNo));

            cardType = null;
            cardText = "";
        } else {
            // Check for multiline separators
            const multilineCardType = multilineParser.detectSeparator(currentTrimmed);
            if (multilineCardType === CardType.MultiLineBasic) {
                // Ignore card if the front of the card is empty
                if (cardText.length > 1) {
                    cardType = CardType.MultiLineBasic;
                }
            } else if (multilineCardType === CardType.MultiLineReversed) {
                // Ignore card if the front of the card is empty
                if (cardText.length > 1) {
                    cardType = CardType.MultiLineReversed;
                }
            } else if (currentLine.startsWith("```") || currentLine.startsWith("~~~")) {
                // Pick up codeblocks
                const codeBlockClose = currentLine.match(/`+|~+/)?.[0] || "```";
                while (i + 1 < lines.length && !lines[i + 1].startsWith(codeBlockClose)) {
                    i++;
                    cardText += "\n" + lines[i];
                }
                cardText += "\n" + codeBlockClose;
                i++;
            } else if (cardType === null && clozeParser.isClozeNote(currentLine)) {
                // Pick up cloze cards
                cardType = CardType.Cloze;
            }
        }
    }

    // Do we have a card left in the queue?
    if (cardType && cardText) {
        lastLineNo = lines.length - 1;
        cards.push(new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo));
    }

    if (debugParser) {
        console.log("Parsed cards:\n", cards);
    }

    return cards;
}
