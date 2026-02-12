/**
 * Integration tests for InlineExtractor with ContextCleaner
 *
 * Tests context-aware extraction for lists, callouts, and quotes
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { InlineExtractor } from "src/parser/rule-based/InlineExtractor";
import { InlineConfig, ExtractionContext, Range } from "src/parser/rule-based/types";

describe("InlineExtractor - Context-Aware Extraction", () => {
    let extractor: InlineExtractor;

    const defaultConfig: InlineConfig = {
        separator: "::",
        startOfLineOnly: false,
    };

    const defaultContext: ExtractionContext = {
        lineOffset: 0,
        headersPath: [],
        skipCodeBlocks: true,
        skipHtmlComments: true,
    };

    beforeEach(() => {
        extractor = new InlineExtractor();
    });

    describe("List context", () => {
        test("should extract card from list item and clean list marker", () => {
            const text = "- Question in list::Answer in list";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question in list");
            expect(cards[0].back).toBe("Answer in list");
        });

        test("should handle multiple list items", () => {
            const text = "- Q1::A1\n- Q2::A2\n- Q3::A3";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(3);
            expect(cards[0].front).toBe("Q1");
            expect(cards[0].back).toBe("A1");
            expect(cards[1].front).toBe("Q2");
            expect(cards[1].back).toBe("A2");
            expect(cards[2].front).toBe("Q3");
            expect(cards[2].back).toBe("A3");
        });

        test("should handle nested lists", () => {
            const text = "- Parent\n  - Nested Q::Nested A";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Nested Q");
            expect(cards[0].back).toBe("Nested A");
        });

        test("should preserve rich markdown in list items", () => {
            const text = "- **Bold Q**::*Italic A*";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("**Bold Q**");
            expect(cards[0].back).toBe("*Italic A*");
        });

        test("should handle asterisk list marker", () => {
            const text = "* Question::Answer";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });

        test("should handle plus list marker", () => {
            const text = "+ Question::Answer";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });

        test("should handle ordered list", () => {
            const text = "1. First Q::First A\n2. Second Q::Second A";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("First Q");
            expect(cards[0].back).toBe("First A");
            expect(cards[1].front).toBe("Second Q");
            expect(cards[1].back).toBe("Second A");
        });
    });

    describe("Callout context", () => {
        test("should extract card from callout and clean callout marker", () => {
            const text = "> Question in callout::Answer in callout";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question in callout");
            expect(cards[0].back).toBe("Answer in callout");
        });

        test("should handle multiple callout lines", () => {
            const text = "> Q1::A1\n> Q2::A2";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Q1");
            expect(cards[0].back).toBe("A1");
            expect(cards[1].front).toBe("Q2");
            expect(cards[1].back).toBe("A2");
        });

        test("should preserve rich markdown in callouts", () => {
            const text = "> **Bold**::==Highlight==";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("**Bold**");
            expect(cards[0].back).toBe("==Highlight==");
        });
    });

    describe("Mixed context", () => {
        test("should handle mix of normal, list, and callout lines", () => {
            const text = "Normal::Card\n- List::Card\n> Callout::Card";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(3);
            expect(cards[0].front).toBe("Normal");
            expect(cards[0].back).toBe("Card");
            expect(cards[1].front).toBe("List");
            expect(cards[1].back).toBe("Card");
            expect(cards[2].front).toBe("Callout");
            expect(cards[2].back).toBe("Card");
        });

        test("should handle list inside callout (conceptually)", () => {
            // Note: This is a single line with > prefix, not actual nested structure
            const text = "> - List in callout::Answer";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            // The > is cleaned, but the - remains as part of the content
            // This is expected behavior - we clean the outermost context marker
            expect(cards[0].front).toContain("List in callout");
            expect(cards[0].back).toBe("Answer");
        });
    });

    describe("Bidirectional cards with context", () => {
        test("should create bidirectional cards from list items", () => {
            const config: InlineConfig = {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            };

            const text = "- Front:::Back";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Front");
            expect(cards[0].back).toBe("Back");
            expect(cards[1].front).toBe("Back");
            expect(cards[1].back).toBe("Front");
        });
    });

    describe("Edge cases", () => {
        test("should skip empty list items", () => {
            const text = "- \n- Q::A\n- ";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Q");
        });

        test("should handle list items with only separator", () => {
            const text = "- ::";
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(0);
        });

        test("should handle very long list items", () => {
            const longQ = "A".repeat(100);
            const longA = "B".repeat(100);
            const text = `- ${longQ}::${longA}`;
            const cards = extractor.extract(text, defaultConfig, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe(longQ);
            expect(cards[0].back).toBe(longA);
        });
    });
});


describe("InlineExtractor - Context-Aware Alternative Separators", () => {
    let extractor: InlineExtractor;

    const defaultContext: ExtractionContext = {
        lineOffset: 0,
        headersPath: [],
        skipCodeBlocks: true,
        skipHtmlComments: true,
    };

    beforeEach(() => {
        extractor = new InlineExtractor();
    });

    describe("Alternative separators in lists", () => {
        test("should use dash as separator in list when configured", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            const text = "- Question in list - Answer in list";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question in list");
            expect(cards[0].back).toBe("Answer in list");
        });

        test("should use pipe as separator in list when configured", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" | "],
            };

            const text = "- Question | Answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });

        test("should use question mark as separator in list when configured", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" ? "],
            };

            const text = "- What is this ? This is an answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("What is this");
            expect(cards[0].back).toBe("This is an answer");
        });

        test("should try multiple alternative separators in order", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - ", " | ", " ? "],
            };

            const text1 = "- Q1 - A1";
            const text2 = "- Q2 | A2";
            const text3 = "- Q3 ? A3";

            const cards1 = extractor.extract(text1, config, defaultContext, []);
            const cards2 = extractor.extract(text2, config, defaultContext, []);
            const cards3 = extractor.extract(text3, config, defaultContext, []);

            expect(cards1[0].front).toBe("Q1");
            expect(cards1[0].back).toBe("A1");
            expect(cards2[0].front).toBe("Q2");
            expect(cards2[0].back).toBe("A2");
            expect(cards3[0].front).toBe("Q3");
            expect(cards3[0].back).toBe("A3");
        });

        test("should prioritize main separator over alternative separators", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            // Both :: and - are present, should use :: (main separator)
            const text = "- Question::Answer - Extra";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer - Extra");
        });

        test("should fall back to alternative separator if main separator not found", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            // Only - is present, should use it
            const text = "- Question - Answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });
    });

    describe("Alternative separators NOT used in normal lines", () => {
        test("should NOT use alternative separators in normal (non-context) lines", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            // Normal line (not a list), should NOT use " - " as separator
            const text = "Question - Answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            // Should not extract a card because :: is not present
            expect(cards).toHaveLength(0);
        });

        test("should use main separator in normal lines", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            const text = "Question::Answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });
    });

    describe("Alternative separators in callouts", () => {
        test("should use alternative separator in callout", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" | "],
            };

            const text = "> Question | Answer";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Question");
            expect(cards[0].back).toBe("Answer");
        });
    });

    describe("Rich markdown with alternative separators", () => {
        test("should preserve rich markdown with alternative separators", () => {
            const config: InlineConfig = {
                separator: "::",
                startOfLineOnly: false,
                contextAwareSeparators: [" - "],
            };

            const text = "- **Bold Q** - *Italic A*";
            const cards = extractor.extract(text, config, defaultContext, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("**Bold Q**");
            expect(cards[0].back).toBe("*Italic A*");
        });
    });
});
