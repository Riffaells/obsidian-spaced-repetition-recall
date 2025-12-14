/**
 * Main orchestrator for rule-based flashcard parsing
 *
 * This is the primary entry point for the new rule-based parser system.
 * It coordinates all extractors and applies rules in priority order.
 *
 * @module parser/rule-based/RuleBasedParser
 */

import { FlashcardRule, ParsedFlashcard, ExtractedCard } from "./types";
import { DocumentStructureParser } from "./DocumentStructureParser";
import { RuleMatcher, MatchContext, RuleMatch } from "./RuleMatcher";
import { HeaderExtractor } from "./HeaderExtractor";
import { InlineExtractor } from "./InlineExtractor";
import { MultilineExtractor } from "./MultilineExtractor";
import { ClozeProcessor } from "./ClozeProcessor";
import { ParsedFlashcardBuilder } from "./ParsedFlashcardBuilder";

export interface NoteContext {
    filePath: string;
    fileName: string;
    text: string;
    tags: string[];
    folderPath: string;
}

/**
 * Main rule-based parser that orchestrates flashcard extraction
 */
export class RuleBasedParser {
    private rules: FlashcardRule[];
    private ruleMatcher: RuleMatcher;
    private headerExtractor: HeaderExtractor;
    private inlineExtractor: InlineExtractor;
    private multilineExtractor: MultilineExtractor;
    private clozeProcessor: ClozeProcessor;
    private flashcardBuilder: ParsedFlashcardBuilder;

    constructor(rules: FlashcardRule[]) {
        // Sort rules by priority (highest first)
        this.rules = [...rules]
            .filter((rule) => rule.enabled)
            .sort((a, b) => b.priority - a.priority);

        // Initialize components
        this.ruleMatcher = new RuleMatcher();
        this.headerExtractor = new HeaderExtractor();
        this.inlineExtractor = new InlineExtractor();
        this.multilineExtractor = new MultilineExtractor();
        this.clozeProcessor = new ClozeProcessor();
        this.flashcardBuilder = new ParsedFlashcardBuilder();
    }

    /**
     * Parse a note and extract all flashcards based on configured rules
     *
     * @param noteContext - Context information about the note being parsed
     * @returns Array of parsed flashcards
     */
    parse(noteContext: NoteContext): ParsedFlashcard[] {
        const results: ParsedFlashcard[] = [];

        // Parse document structure once
        const docStructure = DocumentStructureParser.parse(noteContext.text);

        // Create match context for rule evaluation
        const matchContext: MatchContext = {
            tags: noteContext.tags,
            folderPath: noteContext.folderPath,
            ancestorHeaders: [], // Will be populated per-section
        };

        // Evaluate each rule in priority order
        for (const rule of this.rules) {
            const ruleMatch: RuleMatch | null = this.ruleMatcher.match(rule, matchContext);

            if (!ruleMatch) {
                continue; // Rule doesn't apply to this note
            }

            // Delegate to type-specific extractor based on rule type
            let extractedCards: ExtractedCard[] = [];

            switch (rule.type) {
                case "header":
                    extractedCards = this.headerExtractor.extract(
                        docStructure.flatHeadings,
                        rule.config,
                        {
                            lineOffset: 0,
                            headersPath: [],
                            skipCodeBlocks: true,
                            skipHtmlComments: true,
                        },
                    );
                    break;

                case "inline":
                    extractedCards = this.inlineExtractor.extract(
                        noteContext.text,
                        rule.config,
                        {
                            lineOffset: 0,
                            headersPath: [],
                            skipCodeBlocks: true,
                            skipHtmlComments: true,
                        },
                        docStructure.codeBlocks,
                    );
                    break;

                case "multiline":
                    extractedCards = this.multilineExtractor.extract(
                        noteContext.text,
                        rule.config,
                        {
                            lineOffset: 0,
                            headersPath: [],
                            skipCodeBlocks: true,
                            skipHtmlComments: true,
                        },
                        docStructure.codeBlocks,
                        docStructure.htmlComments,
                    );
                    break;
            }

            // Apply cloze processing if enabled
            const clozeConfig = "cloze" in rule.config ? rule.config.cloze : undefined;
            if (clozeConfig?.enabled) {
                const clozeCards: ExtractedCard[] = [];
                for (const card of extractedCards) {
                    const clozeResults = this.clozeProcessor.process(
                        card.front + "\n" + card.back,
                        clozeConfig,
                        [], // Global patterns would come from settings
                    );

                    if (clozeResults.length > 0) {
                        // Convert cloze results to ExtractedCard format
                        clozeCards.push(
                            ...clozeResults.map((cloze) => ({
                                front: cloze.text,
                                back: cloze.text,
                                lineNumber: card.lineNumber,
                                headersPath: card.headersPath,
                            })),
                        );
                    }
                }
                extractedCards.push(...clozeCards);
            }

            // Build final flashcard objects with metadata
            for (const card of extractedCards) {
                const flashcard = this.flashcardBuilder.build({
                    front: card.front,
                    back: card.back,
                    lineNumber: card.lineNumber,
                    headersPath: card.headersPath,
                    filePath: noteContext.filePath,
                    fileName: noteContext.fileName,
                    tags: noteContext.tags,
                    ruleId: rule.id,
                    vars: ruleMatch.vars,
                });
                results.push(flashcard);
            }
        }

        return results;
    }

    /**
     * Get the list of active rules
     */
    getRules(): ReadonlyArray<FlashcardRule> {
        return this.rules;
    }
}
