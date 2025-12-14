/**
 * Manual checkpoint test to verify new parser methods work alongside old methods
 * This test verifies backward compatibility during the migration phase
 */

import { Question, CardType } from "../../src/core/models/Question";
import { ParsedFlashcard, FlashcardRule, InlineConfig } from "../../src/parser/rule-based/types";
import { deriveCardType, reconstructQuestionText } from "../../src/parser/ParserUtils";

describe("Checkpoint - New Parser Methods", () => {
    describe("deriveCardType utility", () => {
        it("should derive CardType.Cloze for cloze cards", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-1",
                ruleId: "inline-1",
                front: "This is a {{c1::cloze}} card",
                back: "cloze",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: [],
                },
                tags: [],
                metadata: {
                    clozeIndex: 1,
                },
            };

            const rule: FlashcardRule = {
                id: "inline-1",
                name: "Inline Rule",
                type: "inline",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    separator: "::",
                    startOfLineOnly: false,
                } as InlineConfig,
            };

            const cardType = deriveCardType(flashcard, rule);
            expect(cardType).toBe(CardType.Cloze);
        });

        it("should derive CardType.SingleLineBasic for inline rule without reverse", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-2",
                ruleId: "inline-1",
                front: "Question",
                back: "Answer",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: [],
                },
                tags: [],
                metadata: {},
            };

            const rule: FlashcardRule = {
                id: "inline-1",
                name: "Inline Rule",
                type: "inline",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    separator: "::",
                    startOfLineOnly: false,
                } as InlineConfig,
            };

            const cardType = deriveCardType(flashcard, rule);
            expect(cardType).toBe(CardType.SingleLineBasic);
        });

        it("should derive CardType.SingleLineReversed for inline rule with reverse separator", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-3",
                ruleId: "inline-1",
                front: "Question",
                back: "Answer",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: [],
                },
                tags: [],
                metadata: {},
            };

            const rule: FlashcardRule = {
                id: "inline-1",
                name: "Inline Rule",
                type: "inline",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    separator: "::",
                    separatorReverse: ":::",
                    startOfLineOnly: false,
                } as InlineConfig,
            };

            const cardType = deriveCardType(flashcard, rule);
            expect(cardType).toBe(CardType.SingleLineReversed);
        });

        it("should derive CardType.MultiLineBasic for header rule", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-4",
                ruleId: "header-1",
                front: "Header Question",
                back: "Answer content",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: ["Parent Header"],
                },
                tags: [],
                metadata: {},
            };

            const rule: FlashcardRule = {
                id: "header-1",
                name: "Header Rule",
                type: "header",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    selection: { levels: [2], strictPriority: false },
                    content: { scope: "section", includeSubheaders: false, stripTags: false }
                } as any, // Cast to any to avoid strict type checking if types are not fully aligned in test environment
            };

            const cardType = deriveCardType(flashcard, rule);
            expect(cardType).toBe(CardType.MultiLineBasic);
        });
    });

    describe("reconstructQuestionText utility", () => {
        it("should reconstruct inline card text with separator", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-5",
                ruleId: "inline-1",
                front: "Question",
                back: "Answer",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: [],
                },
                tags: [],
                metadata: {},
            };

            const rule: FlashcardRule = {
                id: "inline-1",
                name: "Inline Rule",
                type: "inline",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    separator: "::",
                    startOfLineOnly: false,
                } as InlineConfig,
            };

            const text = reconstructQuestionText(flashcard, rule);
            expect(text).toBe("Question::Answer");
        });

        it("should reconstruct inline card text with custom separator", () => {
            const flashcard: ParsedFlashcard = {
                id: "test-6",
                ruleId: "inline-1",
                front: "Front",
                back: "Back",
                context: {
                    filePath: "/test.md",
                    fileName: "test.md",
                    lineNumber: 1,
                    headersPath: [],
                },
                tags: [],
                metadata: {},
            };

            const rule: FlashcardRule = {
                id: "inline-1",
                name: "Inline Rule",
                type: "inline",
                enabled: true,
                priority: 1,
                tagPattern: "",
                config: {
                    separator: " ?? ",
                    startOfLineOnly: false,
                } as InlineConfig,
            };

            const text = reconstructQuestionText(flashcard, rule);
            expect(text).toBe("Front ?? Back");
        });
    });

    describe("Backward compatibility", () => {
        it("should verify old Question.Create method still exists", () => {
            // This test just verifies the method exists
            expect(typeof Question.Create).toBe("function");
        });

        it("should verify Question.Create method exists", () => {
            // This test just verifies the method exists
            expect(typeof Question.Create).toBe("function");
        });
    });
});
