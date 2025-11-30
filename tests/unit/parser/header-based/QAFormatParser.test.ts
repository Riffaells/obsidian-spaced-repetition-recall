import { QAFormatParser } from "src/parser/header-based/QAFormatParser";
import { ContentBoundary } from "src/parser/header-based/types";

describe("QAFormatParser", () => {
    let parser: QAFormatParser;

    beforeEach(() => {
        parser = new QAFormatParser();
    });

    describe("parseQAContent - standard QA format", () => {
        test("Parses standard QA format with question and answer", () => {
            const lines = [
                "## JavaScript",          // line 0 (heading)
                "",                       // line 1
                "What is a closure?",     // line 2 (question)
                "",                       // line 3
                "A closure is a function with access to outer variables.", // line 4 (answer)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 4,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.question).toBe("What is a closure?");
            expect(result!.answer).toBe("A closure is a function with access to outer variables.");
            expect(result!.questionLineStart).toBe(2);
            expect(result!.answerLineStart).toBe(4);
            expect(result!.answerLineEnd).toBe(4);
        });

        test("Parses QA format with question immediately after heading", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is React?",         // line 1 (question)
                "React is a JavaScript library.", // line 2 (answer)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 2,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.question).toBe("What is React?");
            expect(result!.answer).toBe("React is a JavaScript library.");
        });
    });


    describe("parseQAContent - handling empty lines after heading", () => {
        test("Ignores multiple empty lines after heading", () => {
            const lines = [
                "## JavaScript",          // line 0 (heading)
                "",                       // line 1
                "",                       // line 2
                "",                       // line 3
                "What is a closure?",     // line 4 (question)
                "",                       // line 5
                "A closure is a function.", // line 6 (answer)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 6,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.question).toBe("What is a closure?");
            expect(result!.answer).toBe("A closure is a function.");
            expect(result!.questionLineStart).toBe(4);
        });

        test("Handles single empty line after heading", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "",                       // line 1
                "What is Vue?",           // line 2 (question)
                "Vue is a framework.",    // line 3 (answer)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 3,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.question).toBe("What is Vue?");
            expect(result!.questionLineStart).toBe(2);
        });
    });

    describe("parseQAContent - single newline (continuation)", () => {
        test("Single empty line between question and answer continues paragraph", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is TypeScript?",    // line 1 (question)
                "",                       // line 2 (single empty line)
                "TypeScript is a superset of JavaScript.", // line 3 (answer)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 3,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.answer).toBe("TypeScript is a superset of JavaScript.");
        });

        test("Single empty line within answer continues the paragraph", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is Node.js?",       // line 1 (question)
                "",                       // line 2
                "Node.js is a runtime.",  // line 3 (answer start)
                "",                       // line 4 (single empty - continuation)
                "It uses V8 engine.",     // line 5 (answer continuation)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 5,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.answer).toBe("Node.js is a runtime.\n\nIt uses V8 engine.");
            expect(result!.answerLineEnd).toBe(5);
        });
    });

    describe("parseQAContent - double newline (paragraph separator)", () => {
        test("Double empty line stops at first paragraph", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is a closure?",     // line 1 (question)
                "",                       // line 2
                "A closure is a function.", // line 3 (answer - first paragraph)
                "",                       // line 4 (first empty)
                "",                       // line 5 (second empty - separator)
                "This is the second paragraph - ignored.", // line 6
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 6,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.answer).toBe("A closure is a function.");
            expect(result!.answerLineEnd).toBe(3);
        });

        test("Multiple paragraphs - only first is included", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is React?",         // line 1 (question)
                "",                       // line 2
                "React is a library.",    // line 3 (first paragraph)
                "",                       // line 4
                "",                       // line 5 (double newline)
                "Second paragraph.",      // line 6 (ignored)
                "",                       // line 7
                "",                       // line 8
                "Third paragraph.",       // line 9 (ignored)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 9,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.answer).toBe("React is a library.");
        });
    });


    describe("parseQAContent - edge cases", () => {
        test("Returns null when no question found (all empty lines)", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "",                       // line 1
                "",                       // line 2
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 2,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).toBeNull();
        });

        test("Returns null when question doesn't end with '?'", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "This is not a question", // line 1 (no "?")
                "Some answer text.",      // line 2
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 2,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).toBeNull();
        });

        test("Returns null when no answer found after question", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is this?",          // line 1 (question)
                "",                       // line 2 (empty)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 2,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).toBeNull();
        });

        test("Returns null when boundary has no content", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "## Next Topic",          // line 1 (next heading)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 0, // endLine < startLine means no content
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).toBeNull();
        });

        test("Handles question with only whitespace after it", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is this?",          // line 1 (question)
                "   ",                    // line 2 (whitespace only)
                "   ",                    // line 3 (whitespace only)
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 3,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).toBeNull();
        });

        test("Handles multi-line answer in first paragraph", () => {
            const lines = [
                "## Topic",               // line 0 (heading)
                "What is JavaScript?",    // line 1 (question)
                "",                       // line 2
                "JavaScript is a programming language.", // line 3
                "It runs in browsers.",   // line 4
                "It's very popular.",     // line 5
            ];

            const boundary: ContentBoundary = {
                startLine: 1,
                endLine: 5,
                includesSubheadings: false
            };

            const result = parser.parseQAContent(0, boundary, lines);

            expect(result).not.toBeNull();
            expect(result!.answer).toBe(
                "JavaScript is a programming language.\nIt runs in browsers.\nIt's very popular."
            );
            expect(result!.answerLineEnd).toBe(5);
        });
    });

    describe("findFirstNonEmptyLine", () => {
        test("Finds first non-empty line", () => {
            const lines = ["", "", "Content", "More"];
            const result = parser.findFirstNonEmptyLine(0, 3, lines);
            expect(result).toBe(2);
        });

        test("Returns -1 when all lines are empty", () => {
            const lines = ["", "", ""];
            const result = parser.findFirstNonEmptyLine(0, 2, lines);
            expect(result).toBe(-1);
        });

        test("Returns -1 when range is invalid", () => {
            const lines = ["Content"];
            const result = parser.findFirstNonEmptyLine(5, 10, lines);
            expect(result).toBe(-1);
        });

        test("Handles whitespace-only lines as empty", () => {
            const lines = ["   ", "\t", "Content"];
            const result = parser.findFirstNonEmptyLine(0, 2, lines);
            expect(result).toBe(2);
        });
    });

    describe("extractFirstParagraph", () => {
        test("Extracts single line paragraph", () => {
            const lines = ["Single line content"];
            const result = parser.extractFirstParagraph(0, 0, lines);
            expect(result.text).toBe("Single line content");
            expect(result.endLine).toBe(0);
        });

        test("Extracts multi-line paragraph", () => {
            const lines = ["Line 1", "Line 2", "Line 3"];
            const result = parser.extractFirstParagraph(0, 2, lines);
            expect(result.text).toBe("Line 1\nLine 2\nLine 3");
            expect(result.endLine).toBe(2);
        });

        test("Stops at double newline", () => {
            const lines = ["Line 1", "", "", "Line 2"];
            const result = parser.extractFirstParagraph(0, 3, lines);
            expect(result.text).toBe("Line 1");
            expect(result.endLine).toBe(0);
        });

        test("Includes single empty line in paragraph", () => {
            const lines = ["Line 1", "", "Line 2"];
            const result = parser.extractFirstParagraph(0, 2, lines);
            expect(result.text).toBe("Line 1\n\nLine 2");
            expect(result.endLine).toBe(2);
        });

        test("Removes trailing empty lines", () => {
            const lines = ["Content", "", ""];
            const result = parser.extractFirstParagraph(0, 2, lines);
            expect(result.text).toBe("Content");
            expect(result.endLine).toBe(0);
        });
    });

    describe("isParagraphSeparator", () => {
        test("Returns true for empty line followed by empty line", () => {
            const lines = ["Content", "", "", "More"];
            expect(parser.isParagraphSeparator(1, lines)).toBe(true);
            expect(parser.isParagraphSeparator(2, lines)).toBe(true);
        });

        test("Returns false for single empty line", () => {
            const lines = ["Content", "", "More"];
            expect(parser.isParagraphSeparator(1, lines)).toBe(false);
        });

        test("Returns false for non-empty line", () => {
            const lines = ["Content", "More"];
            expect(parser.isParagraphSeparator(0, lines)).toBe(false);
            expect(parser.isParagraphSeparator(1, lines)).toBe(false);
        });

        test("Returns false for out of bounds index", () => {
            const lines = ["Content"];
            expect(parser.isParagraphSeparator(-1, lines)).toBe(false);
            expect(parser.isParagraphSeparator(5, lines)).toBe(false);
        });
    });
});
