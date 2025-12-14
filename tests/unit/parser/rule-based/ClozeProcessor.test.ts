/**
 * Unit tests for ClozeProcessor
 *
 * Tests cloze deletion processing including:
 * - Pattern matching with named capture groups
 * - Priority-based pattern selection
 * - Fallback to global patterns
 * - Answer, hint, and id extraction
 */

import { ClozeProcessor } from "../../../../src/parser/rule-based/ClozeProcessor";
import { ClozeSettings, ClozePattern } from "../../../../src/parser/rule-based/types";

describe("ClozeProcessor", () => {
    let processor: ClozeProcessor;

    beforeEach(() => {
        processor = new ClozeProcessor();
    });

    describe("Basic Pattern Matching", () => {
        it("should extract cloze deletions from simple pattern", () => {
            const text = "The capital of France is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==(?<answer>[^=]+)==" }],
            };
            const globalPatterns: ClozePattern[] = [];

            const cards = processor.process(text, config, globalPatterns);

            expect(cards).toHaveLength(1);
            expect(cards[0].text).toBe(text);
            expect(cards[0].deletions).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
            expect(cards[0].deletions[0].id).toBe("c1");
        });

        it("should extract multiple cloze deletions", () => {
            const text = "The capital of ==France== is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==(?<answer>[^=]+)==" }],
            };
            const globalPatterns: ClozePattern[] = [];

            const cards = processor.process(text, config, globalPatterns);

            expect(cards).toHaveLength(2);
            expect(cards[0].deletions[0].answer).toBe("France");
            expect(cards[1].deletions[0].answer).toBe("Paris");
        });
    });

    describe("Named Capture Groups", () => {
        it("should extract answer from named capture group", () => {
            const text = "The answer is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==(?<answer>[^=]+)==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards[0].deletions[0].answer).toBe("Paris");
        });

        it("should extract hint from named capture group", () => {
            const text = "The capital is ==[;;city]Paris[;;]==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==\\[;;(?<hint>[^\\]]+)\\](?<answer>[^\\[]+)\\[;;\\]==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards[0].deletions[0].answer).toBe("Paris");
            expect(cards[0].deletions[0].hint).toBe("city");
        });

        it("should extract id from named capture group", () => {
            const text = "The capital is ==[id1;;]Paris[;;]==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==\\[(?<id>[^;]+);;\\](?<answer>[^\\[]+)\\[;;\\]==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards[0].deletions[0].answer).toBe("Paris");
            expect(cards[0].deletions[0].id).toBe("id1");
        });
    });

    describe("Priority-Based Pattern Selection", () => {
        it("should use highest priority pattern when multiple patterns match", () => {
            const text = "The answer is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [
                    { pattern: "==(?<answer>[^=]+)==", priority: 1 },
                    { pattern: "==(?<answer>.+)==", priority: 10 },
                ],
            };

            const cards = processor.process(text, config, []);

            // Both patterns match, but priority 10 should win
            expect(cards).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
        });

        it("should treat patterns without priority as priority 0", () => {
            const text = "The answer is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [
                    { pattern: "==(?<answer>[^=]+)==" }, // No priority = 0
                    { pattern: "==(?<answer>.+)==", priority: 1 },
                ],
            };

            const cards = processor.process(text, config, []);

            // Priority 1 should win over priority 0
            expect(cards).toHaveLength(1);
        });
    });

    describe("Fallback to Global Patterns", () => {
        it("should use global patterns when rule patterns are undefined", () => {
            const text = "The capital is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: undefined,
            };
            const globalPatterns: ClozePattern[] = [{ pattern: "==(?<answer>[^=]+)==" }];

            const cards = processor.process(text, config, globalPatterns);

            expect(cards).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
        });

        it("should use global patterns when rule patterns are empty", () => {
            const text = "The capital is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [],
            };
            const globalPatterns: ClozePattern[] = [{ pattern: "==(?<answer>[^=]+)==" }];

            const cards = processor.process(text, config, globalPatterns);

            expect(cards).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
        });

        it("should prefer rule patterns over global patterns", () => {
            const text = "The capital is **Paris**.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "\\*\\*(?<answer>[^*]+)\\*\\*" }],
            };
            const globalPatterns: ClozePattern[] = [{ pattern: "==(?<answer>[^=]+)==" }];

            const cards = processor.process(text, config, globalPatterns);

            expect(cards).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
        });
    });

    describe("Edge Cases", () => {
        it("should return empty array when cloze is disabled", () => {
            const text = "The capital is ==Paris==.";
            const config: ClozeSettings = {
                enabled: false,
                patterns: [{ pattern: "==(?<answer>[^=]+)==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards).toHaveLength(0);
        });

        it("should return empty array when no patterns available", () => {
            const text = "The capital is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [],
            };

            const cards = processor.process(text, config, []);

            expect(cards).toHaveLength(0);
        });

        it("should return empty array when no deletions found", () => {
            const text = "The capital is Paris.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==(?<answer>[^=]+)==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards).toHaveLength(0);
        });

        it("should handle invalid regex patterns gracefully", () => {
            const text = "The capital is ==Paris==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [
                    { pattern: "==[invalid(" }, // Invalid regex
                    { pattern: "==(?<answer>[^=]+)==" }, // Valid pattern
                ],
            };

            const cards = processor.process(text, config, []);

            // Should skip invalid pattern and use valid one
            expect(cards).toHaveLength(1);
            expect(cards[0].deletions[0].answer).toBe("Paris");
        });

        it("should skip empty answers", () => {
            const text = "The capital is ====.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==(?<answer>[^=]*)==" }],
            };

            const cards = processor.process(text, config, []);

            expect(cards).toHaveLength(0);
        });
    });

    describe("Multiple Deletions with Same ID", () => {
        it("should group deletions with same ID into one card", () => {
            const text = "The capital of ==[c1;;]France[;;]== is ==[c1;;]Paris[;;]==.";
            const config: ClozeSettings = {
                enabled: true,
                patterns: [{ pattern: "==\\[(?<id>[^;]+);;\\](?<answer>[^\\[]+)\\[;;\\]==" }],
            };

            const cards = processor.process(text, config, []);

            // Should create one card with two deletions
            expect(cards).toHaveLength(1);
            expect(cards[0].deletions).toHaveLength(2);
            expect(cards[0].deletions[0].id).toBe("c1");
            expect(cards[0].deletions[1].id).toBe("c1");
        });
    });
});
