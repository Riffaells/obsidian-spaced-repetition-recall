import { HeadingMatcher } from "src/parser/header-based/HeadingMatcher";
import { HeadingInfo, HeaderCardConfig } from "src/parser/header-based/types";

describe("HeadingMatcher", () => {
    let matcher: HeadingMatcher;

    beforeEach(() => {
        matcher = new HeadingMatcher();
    });

    // Helper function to create test headings
    const createHeading = (
        level: number,
        text: string,
        lineNumber: number,
        isQuestion: boolean = false
    ): HeadingInfo => ({
        level,
        text,
        lineNumber,
        isQuestion,
        context: [],
        index: 0,
        indexInLevel: 0,
    });

    describe("matchHeadings - filtering by heading level", () => {
        test("Filters headings by single level (h2)", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1 Heading", 0),
                createHeading(2, "H2 Heading?", 1, true),
                createHeading(3, "H3 Heading?", 2, true),
                createHeading(2, "Another H2?", 3, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("H2 Heading?");
            expect(result[1].text).toBe("Another H2?");
        });

        test("Filters headings by multiple levels (h2 and h3)", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1 Heading?", 0, true),
                createHeading(2, "H2 Heading?", 1, true),
                createHeading(3, "H3 Heading?", 2, true),
                createHeading(4, "H4 Heading?", 3, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("H2 Heading?");
            expect(result[1].text).toBe("H3 Heading?");
        });

        test("Returns empty array when no headings match the level", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1 Heading?", 0, true),
                createHeading(2, "H2 Heading?", 1, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });

        test("Handles all heading levels (h1-h6)", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1?", 0, true),
                createHeading(2, "H2?", 1, true),
                createHeading(3, "H3?", 2, true),
                createHeading(4, "H4?", 3, true),
                createHeading(5, "H5?", 4, true),
                createHeading(6, "H6?", 5, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [1, 2, 3, 4, 5, 6],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(6);
        });
    });

    describe("matchHeadings - 'qa' mode filtering", () => {
        test("In 'qa' mode, only matches headings with question marks", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "What is React?", 0, true),
                createHeading(2, "React Components", 1, false),
                createHeading(2, "Why use React?", 2, true),
                createHeading(2, "Installation", 3, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("What is React?");
            expect(result[1].text).toBe("Why use React?");
            expect(result.every(h => h.isQuestion)).toBe(true);
        });

        test("In 'qa' mode, returns empty array when no questions exist", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "React Components", 0, false),
                createHeading(2, "Installation", 1, false),
                createHeading(2, "Configuration", 2, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });

        test("In 'qa' mode, respects heading level filter", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "H2 Question?", 0, true),
                createHeading(3, "H3 Question?", 1, true),
                createHeading(4, "H4 Question?", 2, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("H2 Question?");
        });
    });

    describe("matchHeadings - 'all' mode filtering", () => {
        test("In 'all' mode, matches all headings of specified level", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "What is React?", 0, true),
                createHeading(2, "React Components", 1, false),
                createHeading(2, "Why use React?", 2, true),
                createHeading(2, "Installation", 3, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(4);
            expect(result[0].text).toBe("What is React?");
            expect(result[1].text).toBe("React Components");
            expect(result[2].text).toBe("Why use React?");
            expect(result[3].text).toBe("Installation");
        });

        test("In 'all' mode, includes both questions and non-questions", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "Question?", 0, true),
                createHeading(2, "Statement", 1, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(2);
            expect(result.some(h => h.isQuestion)).toBe(true);
            expect(result.some(h => !h.isQuestion)).toBe(true);
        });

        test("In 'all' mode, respects heading level filter", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1 Heading", 0, false),
                createHeading(2, "H2 Heading", 1, false),
                createHeading(3, "H3 Heading", 2, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("H2 Heading");
            expect(result[1].text).toBe("H3 Heading");
        });

        test("In 'all' mode, returns empty array when no headings match level", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1 Heading", 0, false),
                createHeading(2, "H2 Heading", 1, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [4],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });
    });

    describe("matchHeadings - invalid heading levels", () => {
        test("Matches headings even with unusual levels if they're in config", () => {
            // Note: HeadingMatcher doesn't validate heading levels - it just filters
            // based on what's in the config. Validation should happen at extraction time.
            const headings: HeadingInfo[] = [
                createHeading(0, "Level 0?", 0, true),
                createHeading(2, "Valid H2?", 1, true),
                createHeading(-1, "Level -1?", 2, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [0, 2, -1],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            // All headings that match the config levels are returned
            expect(result).toHaveLength(3);
        });

        test("Does not filter out headings with levels > 6 if they're in config", () => {
            // HeadingMatcher is level-agnostic - it just checks if level is in the array
            const headings: HeadingInfo[] = [
                createHeading(7, "Level 7?", 0, true),
                createHeading(2, "Valid H2?", 1, true),
                createHeading(10, "Level 10?", 2, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2, 7, 10],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            // All headings matching config levels are returned
            expect(result).toHaveLength(3);
        });

        test("Returns empty array when config has levels not present in headings", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "Valid H2?", 0, true),
                createHeading(3, "Valid H3?", 1, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [0, 7, 8, -1],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            // No headings match the configured levels
            expect(result).toHaveLength(0);
        });

        test("Filters correctly when config has mix of levels", () => {
            const headings: HeadingInfo[] = [
                createHeading(1, "H1?", 0, true),
                createHeading(2, "H2?", 1, true),
                createHeading(3, "H3?", 2, true),
                createHeading(4, "H4?", 3, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [0, 2, 3, 7],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            // Only h2 and h3 match (levels present in both headings and config)
            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("H2?");
            expect(result[1].text).toBe("H3?");
        });
    });

    describe("matchHeadings - disabled config", () => {
        test("Returns empty array when config is disabled", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "H2 Question?", 0, true),
                createHeading(2, "Another H2?", 1, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });

        test("Returns empty array when disabled, even in 'all' mode", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "H2 Heading", 0, false),
                createHeading(2, "Another H2", 1, false),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: false,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });
    });

    describe("matchHeadings - edge cases", () => {
        test("Handles empty headings array", () => {
            const headings: HeadingInfo[] = [];

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });

        test("Handles empty headingLevels array in config", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "H2 Question?", 0, true),
                createHeading(3, "H3 Question?", 1, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(0);
        });

        test("Preserves heading order in results", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "First?", 0, true),
                createHeading(3, "Second?", 1, true),
                createHeading(2, "Third?", 2, true),
                createHeading(3, "Fourth?", 3, true),
            ];

            const config: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = matcher.matchHeadings(headings, config);

            expect(result).toHaveLength(4);
            expect(result[0].text).toBe("First?");
            expect(result[1].text).toBe("Second?");
            expect(result[2].text).toBe("Third?");
            expect(result[3].text).toBe("Fourth?");
        });

        test("Does not modify original headings array", () => {
            const headings: HeadingInfo[] = [
                createHeading(2, "H2 Question?", 0, true),
                createHeading(3, "H3 Question?", 1, true),
            ];

            const originalLength = headings.length;

            const config: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            matcher.matchHeadings(headings, config);

            expect(headings).toHaveLength(originalLength);
        });
    });
});
