/**
 * Unit tests for HeaderExtractor
 *
 * Tests header extraction logic including:
 * - Level filtering
 * - Strict priority
 * - Limit strategies (count, range, random)
 * - Content scope (full-section, first-paragraph)
 * - Subheader inclusion
 * - Tag stripping
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { HeaderExtractor } from "../../../../src/parser/rule-based/HeaderExtractor";
import {
    HeaderConfig,
    HeadingNode,
    ExtractionContext,
} from "../../../../src/parser/rule-based/types";

describe("HeaderExtractor", () => {
    let extractor: HeaderExtractor;

    beforeEach(() => {
        extractor = new HeaderExtractor();
    });

    // Helper to create a heading node
    const createHeading = (
        level: number,
        text: string,
        lineNumber: number,
        content: string = "",
    ): HeadingNode => ({
        level,
        text,
        lineNumber,
        content,
        children: [],
    });

    // Helper to create extraction context
    const createContext = (headersPath: string[] = []): ExtractionContext => ({
        lineOffset: 0,
        headersPath,
        skipCodeBlocks: true,
        skipHtmlComments: true,
    });

    describe("Level Filtering", () => {
        it("should filter headings by specified levels", () => {
            const headings: HeadingNode[] = [
                createHeading(1, "H1", 0, "Content 1"),
                createHeading(2, "H2", 1, "Content 2"),
                createHeading(3, "H3", 2, "Content 3"),
            ];

            const config: HeaderConfig = {
                selection: {
                    levels: [2, 3],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(2);
            expect(result[0].front).toBe("H2");
            expect(result[1].front).toBe("H3");
        });
    });

    describe("Strict Priority", () => {
        it("should only select highest level headings when strictPriority is true", () => {
            const headings: HeadingNode[] = [
                createHeading(1, "H1", 0, "Content 1"),
                createHeading(2, "H2", 1, "Content 2"),
                createHeading(2, "H2-2", 2, "Content 3"),
            ];

            const config: HeaderConfig = {
                selection: {
                    levels: [1, 2],
                    strictPriority: true,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].front).toBe("H1");
        });

        it("should select lower level when higher level does not exist", () => {
            const headings: HeadingNode[] = [
                createHeading(2, "H2", 0, "Content 1"),
                createHeading(3, "H3", 1, "Content 2"),
            ];

            const config: HeaderConfig = {
                selection: {
                    levels: [1, 2, 3],
                    strictPriority: true,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].front).toBe("H2");
        });
    });

    describe("Limit Strategies", () => {
        const headings: HeadingNode[] = [
            createHeading(2, "First", 0, "Content 1"),
            createHeading(2, "Second", 1, "Content 2"),
            createHeading(2, "Third", 2, "Content 3"),
            createHeading(2, "Fourth", 3, "Content 4"),
            createHeading(2, "Fifth", 4, "Content 5"),
        ];

        it('should apply count limit with mode "first"', () => {
            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                    limit: { type: "count", mode: "first", count: 3 },
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(3);
            expect(result[0].front).toBe("First");
            expect(result[1].front).toBe("Second");
            expect(result[2].front).toBe("Third");
        });

        it('should apply count limit with mode "last"', () => {
            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                    limit: { type: "count", mode: "last", count: 2 },
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(2);
            expect(result[0].front).toBe("Fourth");
            expect(result[1].front).toBe("Fifth");
        });

        it("should apply range limit", () => {
            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                    limit: { type: "range", start: 2, end: 4 },
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(3);
            expect(result[0].front).toBe("Second");
            expect(result[1].front).toBe("Third");
            expect(result[2].front).toBe("Fourth");
        });

        it("should apply random limit", () => {
            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                    limit: { type: "random", count: 2 },
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract(headings, config, createContext());

            expect(result).toHaveLength(2);
            // Results should be in original order (sorted by line number)
            expect(result[0].lineNumber).toBeLessThan(result[1].lineNumber);
        });
    });

    describe("Content Scope", () => {
        it("should extract full section content", () => {
            const heading = createHeading(
                2,
                "Question",
                0,
                "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toBe(
                "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
            );
        });

        it("should extract only first paragraph", () => {
            const heading = createHeading(
                2,
                "Question",
                0,
                "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "first-paragraph",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toBe("First paragraph.");
        });
    });

    describe("Subheader Inclusion", () => {
        it("should include subheaders when includeSubheaders is true", () => {
            const heading = createHeading(
                2,
                "Main",
                0,
                "Content before.\n### Subheading\nContent after.",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toContain("### Subheading");
        });

        it("should exclude subheaders when includeSubheaders is false", () => {
            const heading = createHeading(
                2,
                "Main",
                0,
                "Content before.\n### Subheading\nContent after.",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: false,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).not.toContain("### Subheading");
            expect(result[0].back).toContain("Content before.");
            expect(result[0].back).toContain("Content after.");
        });
    });

    describe("Tag Stripping", () => {
        it("should strip HTML tags when stripTags is true", () => {
            const heading = createHeading(
                2,
                "Question",
                0,
                "Text with <strong>HTML</strong> tags.",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: true,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toBe("Text with HTML tags.");
        });

        it("should strip markdown formatting when stripTags is true", () => {
            const heading = createHeading(
                2,
                "Question",
                0,
                "Text with **bold** and *italic* and `code` and [link](url).",
            );

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: true,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toBe("Text with bold and italic and code and link.");
        });

        it("should preserve formatting when stripTags is false", () => {
            const heading = createHeading(2, "Question", 0, "Text with **bold** formatting.");

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(1);
            expect(result[0].back).toBe("Text with **bold** formatting.");
        });
    });

    describe("Empty Content Handling", () => {
        it("should not create card for heading with no content", () => {
            const heading = createHeading(2, "Empty", 0, "");

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(0);
        });

        it("should not create card for heading with only whitespace", () => {
            const heading = createHeading(2, "Whitespace", 0, "   \n\n   ");

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const result = extractor.extract([heading], config, createContext());

            expect(result).toHaveLength(0);
        });
    });

    describe("Headers Path", () => {
        it("should build correct headers path", () => {
            const heading = createHeading(2, "Subheading", 0, "Content");

            const config: HeaderConfig = {
                selection: {
                    levels: [2],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            };

            const context = createContext(["Main", "Section"]);
            const result = extractor.extract([heading], config, context);

            expect(result).toHaveLength(1);
            expect(result[0].headersPath).toEqual(["Main", "Section", "Subheading"]);
        });
    });
});
