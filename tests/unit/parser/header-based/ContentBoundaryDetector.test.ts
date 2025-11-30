import { ContentBoundaryDetector } from "src/parser/header-based/ContentBoundaryDetector";
import { HeadingInfo, ContentBoundary } from "src/parser/header-based/types";

describe("ContentBoundaryDetector", () => {
    let detector: ContentBoundaryDetector;

    beforeEach(() => {
        detector = new ContentBoundaryDetector();
    });

    describe("detectBoundary - nested mode", () => {
        test("Includes all content until next same-level heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer line 1",          // line 1
                "Answer line 2",          // line 2
                "## Next Question",       // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next Question",
                    lineNumber: 3,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(2);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Includes subheadings in nested mode", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer line 1",          // line 1
                "### Subheading",         // line 2
                "More content",           // line 3
                "## Next Question",       // line 4
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Subheading",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
                {
                    level: 2,
                    text: "Next Question",
                    lineNumber: 4,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(true);
        });

        test("Includes multiple levels of subheadings", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer",                 // line 1
                "### Level 3",            // line 2
                "Content 3",              // line 3
                "#### Level 4",           // line 4
                "Content 4",              // line 5
                "## Next",                // line 6
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Level 3",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
                {
                    level: 4,
                    text: "Level 4",
                    lineNumber: 4,
                    isQuestion: false,
                    context: ["Question?", "Level 3"],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 6,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(5);
            expect(boundary.includesSubheadings).toBe(true);
        });

        test("Stops at higher-level heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer",                 // line 1
                "### Subheading",         // line 2
                "Sub content",            // line 3
                "# Higher Level",         // line 4
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Subheading",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
                {
                    level: 1,
                    text: "Higher Level",
                    lineNumber: 4,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(true);
        });

        test("Goes to end of document when no next heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer line 1",          // line 1
                "Answer line 2",          // line 2
                "Answer line 3",          // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Detects subheadings when going to end of document", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer",                 // line 1
                "### Subheading",         // line 2
                "More content",           // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Subheading",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(true);
        });
    });

    describe("detectBoundary - flat mode", () => {
        test("Stops at first subheading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer line 1",          // line 1
                "### Subheading",         // line 2
                "Should not include",     // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Subheading",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "flat"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(1);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Stops at any next heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer",                 // line 1
                "## Same Level",          // line 2
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Same Level",
                    lineNumber: 2,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "flat"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(1);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Goes to end of document when no next heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer line 1",          // line 1
                "Answer line 2",          // line 2
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "flat"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(2);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Never includes subheadings in flat mode", () => {
            const lines = [
                "## Question?",           // line 0
                "Answer",                 // line 1
                "### Sub",                // line 2
                "Content",                // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 3,
                    text: "Sub",
                    lineNumber: 2,
                    isQuestion: false,
                    context: ["Question?"],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "flat"
            );

            expect(boundary.includesSubheadings).toBe(false);
        });
    });

    describe("handling empty answers", () => {
        test("Handles empty answer (no content between headings)", () => {
            const lines = [
                "## Question?",           // line 0
                "## Next Question",       // line 1
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next Question",
                    lineNumber: 1,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(0);
        });

        test("Handles answer with only whitespace", () => {
            const lines = [
                "## Question?",           // line 0
                "   ",                    // line 1
                "  ",                     // line 2
                "## Next",                // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 3,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            // When all lines are whitespace, returns the range before next heading
            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(2);
        });

        test("Handles last heading with no content", () => {
            const lines = [
                "## Question?",           // line 0
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(0);
        });
    });

    describe("handling whitespace", () => {
        test("Trims leading whitespace after heading", () => {
            const lines = [
                "## Question?",           // line 0
                "",                       // line 1
                "",                       // line 2
                "First real content",     // line 3
                "More content",           // line 4
                "## Next",                // line 5
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 5,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(3);
            expect(boundary.endLine).toBe(4);
        });

        test("Trims trailing whitespace before next heading", () => {
            const lines = [
                "## Question?",           // line 0
                "Content line 1",         // line 1
                "Content line 2",         // line 2
                "",                       // line 3
                "",                       // line 4
                "## Next",                // line 5
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 5,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(2);
        });

        test("Trims both leading and trailing whitespace", () => {
            const lines = [
                "## Question?",           // line 0
                "",                       // line 1
                "Content",                // line 2
                "",                       // line 3
                "## Next",                // line 4
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 4,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(2);
            expect(boundary.endLine).toBe(2);
        });

        test("Preserves whitespace within content", () => {
            const lines = [
                "## Question?",           // line 0
                "Line 1",                 // line 1
                "",                       // line 2
                "Line 2",                 // line 3
                "## Next",                // line 4
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 4,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
        });
    });

    describe("edge cases", () => {
        test("Handles last heading in document", () => {
            const lines = [
                "## First",               // line 0
                "Content 1",              // line 1
                "## Last Question?",      // line 2
                "Last content",           // line 3
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "First",
                    lineNumber: 0,
                    isQuestion: false,
                    context: [],
                },
                {
                    level: 2,
                    text: "Last Question?",
                    lineNumber: 2,
                    isQuestion: true,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[1],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(3);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(false);
        });

        test("Handles heading at very end with no content after", () => {
            const lines = [
                "## Question?",           // line 0
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(0);
        });

        test("Handles single line of content", () => {
            const lines = [
                "## Question?",           // line 0
                "Single line answer",     // line 1
                "## Next",                // line 2
            ];

            const headings: HeadingInfo[] = [
                {
                    level: 2,
                    text: "Question?",
                    lineNumber: 0,
                    isQuestion: true,
                    context: [],
                },
                {
                    level: 2,
                    text: "Next",
                    lineNumber: 2,
                    isQuestion: false,
                    context: [],
                },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(1);
        });

        test("Handles complex nesting with multiple levels", () => {
            const lines = [
                "# Top",                  // line 0
                "## Question?",           // line 1
                "Content",                // line 2
                "### Level 3",            // line 3
                "Sub content",            // line 4
                "#### Level 4",           // line 5
                "Deep content",           // line 6
                "### Another 3",          // line 7
                "More",                   // line 8
                "## Same as Question",    // line 9
            ];

            const headings: HeadingInfo[] = [
                { level: 1, text: "Top", lineNumber: 0, isQuestion: false, context: [] },
                { level: 2, text: "Question?", lineNumber: 1, isQuestion: true, context: ["Top"] },
                { level: 3, text: "Level 3", lineNumber: 3, isQuestion: false, context: ["Top", "Question?"] },
                { level: 4, text: "Level 4", lineNumber: 5, isQuestion: false, context: ["Top", "Question?", "Level 3"] },
                { level: 3, text: "Another 3", lineNumber: 7, isQuestion: false, context: ["Top", "Question?"] },
                { level: 2, text: "Same as Question", lineNumber: 9, isQuestion: false, context: ["Top"] },
            ];

            const boundary = detector.detectBoundary(
                headings[1],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(2);
            expect(boundary.endLine).toBe(8);
            expect(boundary.includesSubheadings).toBe(true);
        });

        test("Handles h1 heading (top level)", () => {
            const lines = [
                "# Question?",            // line 0
                "Answer",                 // line 1
                "## Subheading",          // line 2
                "Sub content",            // line 3
                "# Next Top",             // line 4
            ];

            const headings: HeadingInfo[] = [
                { level: 1, text: "Question?", lineNumber: 0, isQuestion: true, context: [] },
                { level: 2, text: "Subheading", lineNumber: 2, isQuestion: false, context: ["Question?"] },
                { level: 1, text: "Next Top", lineNumber: 4, isQuestion: false, context: [] },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(3);
            expect(boundary.includesSubheadings).toBe(true);
        });

        test("Handles h6 heading (deepest level)", () => {
            const lines = [
                "###### Question?",       // line 0
                "Answer",                 // line 1
                "###### Next",            // line 2
            ];

            const headings: HeadingInfo[] = [
                { level: 6, text: "Question?", lineNumber: 0, isQuestion: true, context: [] },
                { level: 6, text: "Next", lineNumber: 2, isQuestion: false, context: [] },
            ];

            const boundary = detector.detectBoundary(
                headings[0],
                headings,
                lines,
                "nested"
            );

            expect(boundary.startLine).toBe(1);
            expect(boundary.endLine).toBe(1);
            expect(boundary.includesSubheadings).toBe(false);
        });
    });
});
