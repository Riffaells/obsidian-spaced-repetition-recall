/**
 * Unit tests for MultilineExtractor
 *
 * Tests multiline flashcard extraction with various stop conditions
 */

import { MultilineExtractor } from "../../../../src/parser/rule-based/MultilineExtractor";
import { MultilineConfig, ExtractionContext, Range } from "../../../../src/parser/rule-based/types";

describe("MultilineExtractor", () => {
    let extractor: MultilineExtractor;

    beforeEach(() => {
        extractor = new MultilineExtractor();
    });

    const createContext = (overrides?: Partial<ExtractionContext>): ExtractionContext => ({
        lineOffset: 0,
        headersPath: [],
        skipCodeBlocks: true,
        skipHtmlComments: true,
        ...overrides,
    });

    describe("blank-line stop condition", () => {
        it("should extract card with answer ending at blank line", () => {
            const text = `Q: What is TypeScript?
A programming language
That adds types to JavaScript

Q: What is React?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Q: What is TypeScript?");
            expect(cards[0].back).toBe("A programming language\nThat adds types to JavaScript");
            expect(cards[0].lineNumber).toBe(0);
        });

        it("should extract multiple cards separated by blank lines", () => {
            const text = `Q: First question?
First answer

Q: Second question?
Second answer`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Q: First question?");
            expect(cards[0].back).toBe("First answer");
            expect(cards[1].front).toBe("Q: Second question?");
            expect(cards[1].back).toBe("Second answer");
        });
    });

    describe("separator stop condition", () => {
        it("should extract card with answer ending at separator", () => {
            const text = `Q: What is Node.js?
A JavaScript runtime
Built on Chrome's V8 engine
---
Q: What is npm?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "separator", separator: "---" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Q: What is Node.js?");
            expect(cards[0].back).toBe("A JavaScript runtime\nBuilt on Chrome's V8 engine");
        });
    });

    describe("next-question stop condition", () => {
        it("should extract card with answer ending at next question", () => {
            const text = `Q: What is HTML?
HyperText Markup Language
Used for web structure
Q: What is CSS?
Cascading Style Sheets`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "next-question" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Q: What is HTML?");
            expect(cards[0].back).toBe("HyperText Markup Language\nUsed for web structure");
            expect(cards[1].front).toBe("Q: What is CSS?");
            expect(cards[1].back).toBe("Cascading Style Sheets");
        });
    });

    describe("custom-pattern stop condition", () => {
        it("should extract card with answer ending at custom pattern", () => {
            const text = `Q: What is Git?
A version control system
Tracks changes in code
END
Q: What is GitHub?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "custom-pattern", pattern: "^END$" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Q: What is Git?");
            expect(cards[0].back).toBe("A version control system\nTracks changes in code");
        });
    });

    describe("incomplete cards", () => {
        it("should not create card when question has no answer", () => {
            const text = `Q: What is TypeScript?

Q: What is React?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(0);
        });

        it("should not create card when question is at end of file", () => {
            const text = `Q: What is TypeScript?
Some answer

Q: What is React?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(1);
            expect(cards[0].front).toBe("Q: What is TypeScript?");
        });
    });

    describe("code block handling", () => {
        it("should skip questions inside code blocks", () => {
            const text = `Q: What is a function?
A reusable block of code

\`\`\`
Q: This is not a question
Just code
\`\`\`

Q: What is a variable?
A named storage location`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const codeBlocks: Range[] = [{ start: 3, end: 6 }];

            const cards = extractor.extract(text, config, createContext(), codeBlocks, []);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Q: What is a function?");
            expect(cards[1].front).toBe("Q: What is a variable?");
        });

        it("should skip answer lines inside code blocks", () => {
            const text = `Q: What is code?
Answer line 1
\`\`\`
This is in a code block
\`\`\`
Answer line 2

Q: Next question?`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const codeBlocks: Range[] = [{ start: 2, end: 4 }];

            const cards = extractor.extract(text, config, createContext(), codeBlocks, []);

            expect(cards).toHaveLength(1);
            expect(cards[0].back).toBe("Answer line 1\nAnswer line 2");
        });
    });

    describe("HTML comment handling", () => {
        it("should skip questions inside HTML comments", () => {
            const text = `Q: What is HTML?
Markup language

<!-- 
Q: This is commented out
Not a real question
-->

Q: What is CSS?
Style sheets`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const htmlComments: Range[] = [{ start: 3, end: 6 }];

            const cards = extractor.extract(text, config, createContext(), [], htmlComments);

            expect(cards).toHaveLength(2);
            expect(cards[0].front).toBe("Q: What is HTML?");
            expect(cards[1].front).toBe("Q: What is CSS?");
        });
    });

    describe("invalid regex patterns", () => {
        it("should return empty array for invalid question pattern", () => {
            const text = `Q: What is TypeScript?
Answer here`;

            const config: MultilineConfig = {
                questionLinePattern: "[invalid(regex",
                stopCondition: { type: "blank-line" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(0);
        });

        it("should return empty array for invalid custom stop pattern", () => {
            const text = `Q: What is TypeScript?
Answer here`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "custom-pattern", pattern: "[invalid(regex" },
            };

            const cards = extractor.extract(text, config, createContext(), [], []);

            expect(cards).toHaveLength(0);
        });
    });

    describe("context propagation", () => {
        it("should include headers path in extracted cards", () => {
            const text = `Q: What is TypeScript?
A typed superset of JavaScript`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const context = createContext({
                headersPath: ["Programming", "Languages"],
            });

            const cards = extractor.extract(text, config, context, [], []);

            expect(cards).toHaveLength(1);
            expect(cards[0].headersPath).toEqual(["Programming", "Languages"]);
        });

        it("should calculate correct line numbers with offset", () => {
            const text = `Q: What is TypeScript?
Answer here

Q: What is React?
Another answer`;

            const config: MultilineConfig = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };

            const context = createContext({
                lineOffset: 10,
            });

            const cards = extractor.extract(text, config, context, [], []);

            expect(cards).toHaveLength(2);
            expect(cards[0].lineNumber).toBe(10);
            expect(cards[1].lineNumber).toBe(13);
        });
    });
});
