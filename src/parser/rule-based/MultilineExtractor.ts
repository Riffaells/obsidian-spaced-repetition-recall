/**
 * MultilineExtractor
 *
 * Extracts flashcards from multiline text blocks based on MultilineConfig rules.
 * Implements question line pattern detection and various stop conditions
 * (blank-line, separator, next-question, custom-pattern).
 *
 * @module parser/rule-based/MultilineExtractor
 */

import { MultilineConfig, ExtractedCard, ExtractionContext, Range } from "./types";

/**
 * Extracts flashcards from multiline text using question patterns and stop conditions
 */
export class MultilineExtractor {
    /**
     * Extract flashcards from text based on multiline configuration
     *
     * @param text - The markdown text to parse
     * @param config - Multiline extraction configuration
     * @param context - Extraction context with metadata
     * @param codeBlocks - Code block ranges to skip
     * @param htmlComments - HTML comment ranges to skip
     * @returns Array of extracted flashcards
     */
    extract(
        text: string,
        config: MultilineConfig,
        context: ExtractionContext,
        codeBlocks: Range[],
        htmlComments: Range[],
    ): ExtractedCard[] {
        const lines = text.split("\n");
        const cards: ExtractedCard[] = [];

        let questionRegex: RegExp;
        try {
            questionRegex = new RegExp(config.questionLinePattern);
            console.log("MultilineExtractor: Using question pattern:", config.questionLinePattern);
        } catch (error) {
            console.warn(`Invalid question line pattern: ${config.questionLinePattern}`, error);
            return [];
        }

        // Compile custom pattern regex if needed
        let customStopRegex: RegExp | null = null;
        if (config.stopCondition.type === "custom-pattern") {
            try {
                customStopRegex = new RegExp(config.stopCondition.pattern);
            } catch (error) {
                console.warn(`Invalid custom stop pattern: ${config.stopCondition.pattern}`, error);
                return [];
            }
        }

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const absoluteLineNumber = context.lineOffset + i;

            // Skip if line is inside a code block or HTML comment
            if (this.shouldSkipLine(absoluteLineNumber, codeBlocks, htmlComments, context)) {
                i++;
                continue;
            }

            // Check if this line matches the question pattern
            console.log(
                "MultilineExtractor: Testing line:",
                line,
                "with pattern:",
                config.questionLinePattern,
                "Result:",
                questionRegex.test(line),
            );
            if (questionRegex.test(line)) {
                const card = this.extractCard(
                    lines,
                    i,
                    config,
                    context,
                    codeBlocks,
                    htmlComments,
                    questionRegex,
                    customStopRegex,
                );

                if (card) {
                    cards.push(card.card);
                    i = card.nextIndex;
                } else {
                    i++;
                }
            } else {
                i++;
            }
        }

        return cards;
    }

    /**
     * Extract a single flashcard starting from a question line
     *
     * @param lines - All lines in the text
     * @param startIndex - Index of the question line
     * @param config - Multiline extraction configuration
     * @param context - Extraction context
     * @param codeBlocks - Code block ranges to skip
     * @param htmlComments - HTML comment ranges to skip
     * @param questionRegex - Compiled question pattern regex
     * @param customStopRegex - Compiled custom stop pattern regex (if applicable)
     * @returns Extracted card and next index to continue from, or null if incomplete
     */
    private extractCard(
        lines: string[],
        startIndex: number,
        config: MultilineConfig,
        context: ExtractionContext,
        codeBlocks: Range[],
        htmlComments: Range[],
        questionRegex: RegExp,
        customStopRegex: RegExp | null,
    ): { card: ExtractedCard; nextIndex: number } | null {
        const questionLine = lines[startIndex];
        const absoluteLineNumber = context.lineOffset + startIndex;

        // Collect answer lines
        const answerLines: string[] = [];
        let i = startIndex + 1;

        while (i < lines.length) {
            const line = lines[i];
            const currentAbsoluteLineNumber = context.lineOffset + i;

            // Skip lines inside code blocks or HTML comments
            if (this.shouldSkipLine(currentAbsoluteLineNumber, codeBlocks, htmlComments, context)) {
                i++;
                continue;
            }

            // Check stop conditions
            const shouldStop = this.checkStopCondition(
                line,
                config.stopCondition,
                questionRegex,
                customStopRegex,
            );

            if (shouldStop) {
                break;
            }

            // Add line to answer
            answerLines.push(line);
            i++;
        }

        // Check if we have an answer
        const answer = answerLines.join("\n").trim();
        if (!answer) {
            // Incomplete card - question without answer
            return null;
        }

        const card: ExtractedCard = {
            front: questionLine.trim(),
            back: answer,
            lineNumber: absoluteLineNumber,
            headersPath: context.headersPath,
        };

        return {
            card,
            nextIndex: i,
        };
    }

    /**
     * Check if a stop condition is met
     *
     * @param line - The current line to check
     * @param stopCondition - The stop condition configuration
     * @param questionRegex - Compiled question pattern regex
     * @param customStopRegex - Compiled custom stop pattern regex (if applicable)
     * @returns True if the stop condition is met
     */
    private checkStopCondition(
        line: string,
        stopCondition: MultilineConfig["stopCondition"],
        questionRegex: RegExp,
        customStopRegex: RegExp | null,
    ): boolean {
        switch (stopCondition.type) {
            case "blank-line":
                return line.trim() === "";

            case "separator":
                return line.trim() === stopCondition.separator;

            case "next-question":
                return questionRegex.test(line);

            case "custom-pattern":
                return customStopRegex !== null && customStopRegex.test(line);

            default:
                // TypeScript exhaustiveness check
                const _exhaustive: never = stopCondition;
                return false;
        }
    }

    /**
     * Check if a line should be skipped based on code blocks and HTML comments
     *
     * @param lineNumber - The absolute line number to check
     * @param codeBlocks - Code block ranges to skip
     * @param htmlComments - HTML comment ranges to skip
     * @param context - Extraction context
     * @returns True if the line should be skipped
     */
    private shouldSkipLine(
        lineNumber: number,
        codeBlocks: Range[],
        htmlComments: Range[],
        context: ExtractionContext,
    ): boolean {
        if (context.skipCodeBlocks && this.isLineInRange(lineNumber, codeBlocks)) {
            return true;
        }

        if (context.skipHtmlComments && this.isLineInRange(lineNumber, htmlComments)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a line number falls within any range
     *
     * @param lineNumber - The line number to check
     * @param ranges - Array of ranges
     * @returns True if the line is within any range
     */
    private isLineInRange(lineNumber: number, ranges: Range[]): boolean {
        return ranges.some((range) => lineNumber >= range.start && lineNumber <= range.end);
    }
}
