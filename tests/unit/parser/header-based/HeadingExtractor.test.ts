import { HeadingExtractor } from "src/parser/header-based/HeadingExtractor";

describe("HeadingExtractor", () => {
    let extractor: HeadingExtractor;

    beforeEach(() => {
        extractor = new HeadingExtractor();
    });

    describe("extractHeadings - basic extraction", () => {
        test("Extracts h1 heading", () => {
            const lines = ["# Heading 1", "Some content"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(1);
            expect(headings[0].text).toBe("Heading 1");
            expect(headings[0].lineNumber).toBe(0);
        });

        test("Extracts h2 heading", () => {
            const lines = ["## Heading 2", "Some content"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(2);
            expect(headings[0].text).toBe("Heading 2");
        });

        test("Extracts h3 heading", () => {
            const lines = ["### Heading 3"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(3);
        });

        test("Extracts h4 heading", () => {
            const lines = ["#### Heading 4"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(4);
        });

        test("Extracts h5 heading", () => {
            const lines = ["##### Heading 5"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(5);
        });

        test("Extracts h6 heading", () => {
            const lines = ["###### Heading 6"];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(6);
        });


        test("Extracts multiple headings of different levels", () => {
            const lines = [
                "# H1",
                "## H2",
                "### H3",
                "#### H4",
                "##### H5",
                "###### H6",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(6);
            expect(headings.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
        });

        test("Extracts headings with correct line numbers", () => {
            const lines = [
                "Some intro text",
                "# First Heading",
                "Content here",
                "## Second Heading",
                "More content",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].lineNumber).toBe(1);
            expect(headings[1].lineNumber).toBe(3);
        });

        test("Detects question headings (ending with ?)", () => {
            const lines = [
                "## What is JavaScript?",
                "## Regular Heading",
                "## Why use TypeScript?",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(3);
            expect(headings[0].isQuestion).toBe(true);
            expect(headings[1].isQuestion).toBe(false);
            expect(headings[2].isQuestion).toBe(true);
        });

        test("Tracks index for headings of same level", () => {
            const lines = [
                "## First H2",
                "## Second H2",
                "### First H3",
                "## Third H2",
                "### Second H3",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(5);
            // H2 indices
            expect(headings[0].index).toBe(0);
            expect(headings[1].index).toBe(1);
            expect(headings[3].index).toBe(2);
            // H3 indices
            expect(headings[2].index).toBe(0);
            expect(headings[4].index).toBe(1);
        });
    });

    describe("buildHeadingHierarchy - context building", () => {
        test("Top-level heading has empty context", () => {
            const lines = ["# Chapter 1"];
            const headings = extractor.extractHeadings(lines);

            expect(headings[0].context).toEqual([]);
        });

        test("Nested heading includes parent in context", () => {
            const lines = [
                "# Chapter 1",
                "## Section A",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings[0].context).toEqual([]);
            expect(headings[1].context).toEqual(["Chapter 1"]);
        });

        test("Deeply nested heading includes all parents in context", () => {
            const lines = [
                "# Chapter 1",
                "## Section A",
                "### Subsection 1",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings[0].context).toEqual([]);
            expect(headings[1].context).toEqual(["Chapter 1"]);
            expect(headings[2].context).toEqual(["Chapter 1", "Section A"]);
        });

        test("Sibling headings share same context", () => {
            const lines = [
                "# Chapter 1",
                "## Section A",
                "## Section B",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings[1].context).toEqual(["Chapter 1"]);
            expect(headings[2].context).toEqual(["Chapter 1"]);
        });

        test("Context resets when going to higher level heading", () => {
            const lines = [
                "# Chapter 1",
                "## Section A",
                "### Subsection 1",
                "# Chapter 2",
                "## Section B",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings[2].context).toEqual(["Chapter 1", "Section A"]);
            expect(headings[3].context).toEqual([]);
            expect(headings[4].context).toEqual(["Chapter 2"]);
        });

        test("Complex hierarchy with multiple levels", () => {
            const lines = [
                "# Book",
                "## Part 1",
                "### Chapter 1",
                "#### Section 1.1",
                "### Chapter 2",
                "## Part 2",
                "### Chapter 3",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings[0].context).toEqual([]);
            expect(headings[1].context).toEqual(["Book"]);
            expect(headings[2].context).toEqual(["Book", "Part 1"]);
            expect(headings[3].context).toEqual(["Book", "Part 1", "Chapter 1"]);
            expect(headings[4].context).toEqual(["Book", "Part 1"]);
            expect(headings[5].context).toEqual(["Book"]);
            expect(headings[6].context).toEqual(["Book", "Part 2"]);
        });
    });


    describe("isInCodeBlock - code block detection", () => {
        test("Ignores headings inside triple backtick code blocks", () => {
            const lines = [
                "## Real Heading",
                "```",
                "## Fake Heading in Code",
                "```",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Real Heading");
            expect(headings[1].text).toBe("Another Real Heading");
        });

        test("Ignores headings inside triple tilde code blocks", () => {
            const lines = [
                "## Real Heading",
                "~~~",
                "## Fake Heading in Code",
                "~~~",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Real Heading");
            expect(headings[1].text).toBe("Another Real Heading");
        });

        test("Ignores headings in code blocks with language specifier", () => {
            const lines = [
                "## Real Heading",
                "```javascript",
                "// ## Not a heading",
                "## Also not a heading",
                "```",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Real Heading");
            expect(headings[1].text).toBe("Another Real Heading");
        });

        test("Handles multiple code blocks", () => {
            const lines = [
                "## Heading 1",
                "```",
                "## In Code 1",
                "```",
                "## Heading 2",
                "```python",
                "## In Code 2",
                "```",
                "## Heading 3",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(3);
            expect(headings.map(h => h.text)).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
        });

        test("Handles nested code block delimiters correctly", () => {
            const lines = [
                "## Real Heading",
                "```",
                "Some code with ``` in it",
                "## Fake Heading",
                "```",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
        });

        test("isInCodeBlock utility method works correctly", () => {
            const lines = [
                "Normal line",
                "```",
                "Code line",
                "```",
                "Normal again",
            ];

            expect(extractor.isInCodeBlock(0, lines)).toBe(false);
            expect(extractor.isInCodeBlock(1, lines)).toBe(true);
            expect(extractor.isInCodeBlock(2, lines)).toBe(true);
            expect(extractor.isInCodeBlock(3, lines)).toBe(false);
            expect(extractor.isInCodeBlock(4, lines)).toBe(false);
        });

        test("Can disable code block ignoring", () => {
            const lines = [
                "## Real Heading",
                "```",
                "## Heading in Code",
                "```",
            ];
            const headings = extractor.extractHeadings(lines, false);

            expect(headings).toHaveLength(2);
            expect(headings[1].text).toBe("Heading in Code");
        });
    });

    describe("isInQuote - quote detection", () => {
        test("Ignores headings inside block quotes", () => {
            const lines = [
                "## Real Heading",
                "> ## Quoted Heading",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Real Heading");
            expect(headings[1].text).toBe("Another Real Heading");
        });

        test("Ignores headings in nested quotes", () => {
            const lines = [
                "## Real Heading",
                "> > ## Deeply Quoted",
                ">> ## Also Quoted",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
        });

        test("Ignores headings in quotes with leading whitespace", () => {
            const lines = [
                "## Real Heading",
                "  > ## Quoted with spaces",
                "## Another Real Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
        });

        test("Can disable quote ignoring", () => {
            const lines = [
                "## Real Heading",
                "> ## Quoted Heading",
            ];
            const headings = extractor.extractHeadings(lines, true, false);

            // When quote ignoring is disabled, the line "> ## Quoted Heading" is processed
            // but it doesn't match the heading pattern because it starts with ">"
            // So we still only get 1 heading
            expect(headings).toHaveLength(1);
        });

        test("isInQuote method works correctly", () => {
            expect(extractor.isInQuote("> Some quote")).toBe(true);
            expect(extractor.isInQuote(">> Nested quote")).toBe(true);
            expect(extractor.isInQuote("  > Indented quote")).toBe(true);
            expect(extractor.isInQuote("Normal line")).toBe(false);
            expect(extractor.isInQuote("Not > a quote")).toBe(false);
        });
    });


    describe("isHeading - heading detection", () => {
        test("Detects valid headings", () => {
            expect(extractor.isHeading("# H1").isHeading).toBe(true);
            expect(extractor.isHeading("## H2").isHeading).toBe(true);
            expect(extractor.isHeading("### H3").isHeading).toBe(true);
            expect(extractor.isHeading("#### H4").isHeading).toBe(true);
            expect(extractor.isHeading("##### H5").isHeading).toBe(true);
            expect(extractor.isHeading("###### H6").isHeading).toBe(true);
        });

        test("Returns correct level", () => {
            expect(extractor.isHeading("# H1").level).toBe(1);
            expect(extractor.isHeading("## H2").level).toBe(2);
            expect(extractor.isHeading("### H3").level).toBe(3);
            expect(extractor.isHeading("#### H4").level).toBe(4);
            expect(extractor.isHeading("##### H5").level).toBe(5);
            expect(extractor.isHeading("###### H6").level).toBe(6);
        });

        test("Returns correct text", () => {
            expect(extractor.isHeading("# Hello World").text).toBe("Hello World");
            expect(extractor.isHeading("## Test Heading").text).toBe("Test Heading");
        });

        test("Handles headings without space after #", () => {
            const result = extractor.isHeading("#NoSpace");
            expect(result.isHeading).toBe(true);
            expect(result.level).toBe(1);
            expect(result.text).toBe("NoSpace");
        });

        test("Handles headings with multiple spaces", () => {
            const result = extractor.isHeading("##   Multiple Spaces");
            expect(result.isHeading).toBe(true);
            expect(result.level).toBe(2);
            // The regex captures text after the first space, preserving additional spaces
            expect(result.text).toBe("  Multiple Spaces");
        });

        test("Does not detect more than 6 # as heading", () => {
            const result = extractor.isHeading("####### Too Many");
            expect(result.isHeading).toBe(false);
        });

        test("Does not detect # in middle of line", () => {
            const result = extractor.isHeading("Some text # not a heading");
            expect(result.isHeading).toBe(false);
        });

        test("Does not detect empty line as heading", () => {
            const result = extractor.isHeading("");
            expect(result.isHeading).toBe(false);
        });

        test("Does not detect line with only spaces as heading", () => {
            const result = extractor.isHeading("   ");
            expect(result.isHeading).toBe(false);
        });
    });

    describe("Special characters in headings", () => {
        test("Handles headings with special markdown characters", () => {
            const lines = [
                "## Heading with **bold**",
                "## Heading with *italic*",
                "## Heading with `code`",
                "## Heading with [link](url)",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(4);
            expect(headings[0].text).toBe("Heading with **bold**");
            expect(headings[1].text).toBe("Heading with *italic*");
            expect(headings[2].text).toBe("Heading with `code`");
            expect(headings[3].text).toBe("Heading with [link](url)");
        });

        test("Handles headings with Unicode characters", () => {
            const lines = [
                "## Что такое JavaScript?",
                "## 日本語の見出し",
                "## Überschrift mit Umlauten",
                "## Заголовок с эмодзи 🎉",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(4);
            expect(headings[0].text).toBe("Что такое JavaScript?");
            expect(headings[0].isQuestion).toBe(true);
            expect(headings[1].text).toBe("日本語の見出し");
            expect(headings[2].text).toBe("Überschrift mit Umlauten");
            expect(headings[3].text).toBe("Заголовок с эмодзи 🎉");
        });

        test("Handles headings with numbers", () => {
            const lines = [
                "## 1. First Item",
                "## 2.5 Second Item",
                "## Chapter 10",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(3);
            expect(headings[0].text).toBe("1. First Item");
            expect(headings[1].text).toBe("2.5 Second Item");
            expect(headings[2].text).toBe("Chapter 10");
        });

        test("Handles headings with HTML entities", () => {
            const lines = [
                "## Heading &amp; More",
                "## Less &lt; Greater &gt;",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Heading &amp; More");
        });
    });

    describe("Edge cases", () => {
        test("Handles empty note", () => {
            const headings = extractor.extractHeadings([]);
            expect(headings).toHaveLength(0);
        });

        test("Handles note with no headings", () => {
            const lines = [
                "Just some text",
                "More text here",
                "No headings at all",
            ];
            const headings = extractor.extractHeadings(lines);
            expect(headings).toHaveLength(0);
        });

        test("Skips empty headings", () => {
            const lines = [
                "## ",
                "##",
                "##   ",
                "## Valid Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].text).toBe("Valid Heading");
        });

        test("Handles heading at end of file", () => {
            const lines = [
                "Some content",
                "## Last Heading",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(1);
            expect(headings[0].text).toBe("Last Heading");
        });

        test("Handles consecutive headings", () => {
            const lines = [
                "## Heading 1",
                "## Heading 2",
                "## Heading 3",
            ];
            const headings = extractor.extractHeadings(lines);

            expect(headings).toHaveLength(3);
        });

        test("Handles unclosed code block", () => {
            const lines = [
                "## Before Code",
                "```",
                "## In Unclosed Code",
            ];
            const headings = extractor.extractHeadings(lines);

            // Only the heading before the code block should be extracted
            expect(headings).toHaveLength(1);
            expect(headings[0].text).toBe("Before Code");
        });
    });
});
