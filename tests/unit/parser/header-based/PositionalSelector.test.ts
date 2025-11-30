import { PositionalSelectorUtil } from "src/parser/header-based/PositionalSelector";
import { HeadingInfo, PositionalSelector } from "src/parser/header-based/types";

/**
 * Helper function to create a HeadingInfo object for testing
 */
function createHeading(
    level: number,
    text: string,
    lineNumber: number,
    isQuestion: boolean = false,
): HeadingInfo {
    return {
        level,
        text,
        lineNumber,
        isQuestion,
        context: [],
        index: 0,
    };
}

describe("PositionalSelectorUtil", () => {
    // Sample headings for testing
    const sampleHeadings: HeadingInfo[] = [
        createHeading(2, "Heading 1", 0),
        createHeading(2, "Heading 2", 5),
        createHeading(2, "Heading 3", 10),
        createHeading(2, "Heading 4", 15),
        createHeading(2, "Heading 5", 20),
    ];

    describe("parseSelector", () => {
        test("Parses first-N selector correctly", () => {
            const result = PositionalSelectorUtil.parseSelector("first-3");
            expect(result).toEqual({ type: "first", count: 3 });
        });

        test("Parses last-N selector correctly", () => {
            const result = PositionalSelectorUtil.parseSelector("last-2");
            expect(result).toEqual({ type: "last", count: 2 });
        });

        test("Parses nth-N selector correctly", () => {
            const result = PositionalSelectorUtil.parseSelector("nth-5");
            expect(result).toEqual({ type: "nth", count: 5 });
        });

        test("Parses single digit counts", () => {
            expect(PositionalSelectorUtil.parseSelector("first-1")).toEqual({ type: "first", count: 1 });
            expect(PositionalSelectorUtil.parseSelector("last-9")).toEqual({ type: "last", count: 9 });
        });

        test("Parses multi-digit counts", () => {
            expect(PositionalSelectorUtil.parseSelector("first-10")).toEqual({ type: "first", count: 10 });
            expect(PositionalSelectorUtil.parseSelector("last-100")).toEqual({ type: "last", count: 100 });
        });

        test("Returns null for invalid selector format", () => {
            expect(PositionalSelectorUtil.parseSelector("invalid")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("first")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("last-")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("-3")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("first3")).toBeNull();
        });

        test("Returns null for zero count", () => {
            expect(PositionalSelectorUtil.parseSelector("first-0")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("last-0")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("nth-0")).toBeNull();
        });

        test("Returns null for negative count (not matched by regex)", () => {
            expect(PositionalSelectorUtil.parseSelector("first--1")).toBeNull();
        });

        test("Returns null for unknown selector type", () => {
            expect(PositionalSelectorUtil.parseSelector("middle-3")).toBeNull();
            expect(PositionalSelectorUtil.parseSelector("random-5")).toBeNull();
        });
    });

    describe("applySelectors - first-N selector", () => {
        test("Selects first N headings", () => {
            const selectors: PositionalSelector[] = [{ type: "first", count: 3 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(3);
            expect(result[0].text).toBe("Heading 1");
            expect(result[1].text).toBe("Heading 2");
            expect(result[2].text).toBe("Heading 3");
        });

        test("Selects first 1 heading", () => {
            const selectors: PositionalSelector[] = [{ type: "first", count: 1 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 1");
        });

        test("Returns all headings when N > available", () => {
            const selectors: PositionalSelector[] = [{ type: "first", count: 10 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(5);
            expect(result.map(h => h.text)).toEqual([
                "Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5"
            ]);
        });

        test("Returns all headings when N equals available", () => {
            const selectors: PositionalSelector[] = [{ type: "first", count: 5 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(5);
        });
    });

    describe("applySelectors - last-N selector", () => {
        test("Selects last N headings", () => {
            const selectors: PositionalSelector[] = [{ type: "last", count: 2 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("Heading 4");
            expect(result[1].text).toBe("Heading 5");
        });

        test("Selects last 1 heading", () => {
            const selectors: PositionalSelector[] = [{ type: "last", count: 1 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 5");
        });

        test("Returns all headings when N > available", () => {
            const selectors: PositionalSelector[] = [{ type: "last", count: 10 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(5);
            expect(result.map(h => h.text)).toEqual([
                "Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5"
            ]);
        });

        test("Returns all headings when N equals available", () => {
            const selectors: PositionalSelector[] = [{ type: "last", count: 5 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(5);
        });
    });

    describe("applySelectors - nth-N selector", () => {
        test("Selects the Nth heading (1-based)", () => {
            const selectors: PositionalSelector[] = [{ type: "nth", count: 3 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 3");
        });

        test("Selects the first heading with nth-1", () => {
            const selectors: PositionalSelector[] = [{ type: "nth", count: 1 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 1");
        });

        test("Selects the last heading with nth-5", () => {
            const selectors: PositionalSelector[] = [{ type: "nth", count: 5 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 5");
        });

        test("Returns empty array when N > available headings", () => {
            const selectors: PositionalSelector[] = [{ type: "nth", count: 10 }];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(0);
        });
    });

    describe("applySelectors - combination of selectors", () => {
        test("Applies multiple selectors sequentially", () => {
            // First get first 4, then get last 2 of those
            const selectors: PositionalSelector[] = [
                { type: "first", count: 4 },
                { type: "last", count: 2 },
            ];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("Heading 3");
            expect(result[1].text).toBe("Heading 4");
        });

        test("Applies first then nth selector", () => {
            // First get first 3, then get 2nd of those
            const selectors: PositionalSelector[] = [
                { type: "first", count: 3 },
                { type: "nth", count: 2 },
            ];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Heading 2");
        });

        test("Applies last then first selector", () => {
            // Get last 3, then get first 2 of those
            const selectors: PositionalSelector[] = [
                { type: "last", count: 3 },
                { type: "first", count: 2 },
            ];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe("Heading 3");
            expect(result[1].text).toBe("Heading 4");
        });

        test("Returns empty when nth selector exceeds filtered results", () => {
            // Get first 2, then try to get 5th (doesn't exist)
            const selectors: PositionalSelector[] = [
                { type: "first", count: 2 },
                { type: "nth", count: 5 },
            ];
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(result).toHaveLength(0);
        });
    });

    describe("applySelectors - edge cases", () => {
        test("Returns all headings when no selectors provided", () => {
            const result = PositionalSelectorUtil.applySelectors(sampleHeadings, []);

            expect(result).toHaveLength(5);
            expect(result).toEqual(sampleHeadings);
        });

        test("Returns empty array when headings array is empty", () => {
            const selectors: PositionalSelector[] = [{ type: "first", count: 3 }];
            const result = PositionalSelectorUtil.applySelectors([], selectors);

            expect(result).toHaveLength(0);
        });

        test("Handles single heading with first selector", () => {
            const singleHeading = [createHeading(2, "Only Heading", 0)];
            const selectors: PositionalSelector[] = [{ type: "first", count: 5 }];
            const result = PositionalSelectorUtil.applySelectors(singleHeading, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Only Heading");
        });

        test("Handles single heading with last selector", () => {
            const singleHeading = [createHeading(2, "Only Heading", 0)];
            const selectors: PositionalSelector[] = [{ type: "last", count: 5 }];
            const result = PositionalSelectorUtil.applySelectors(singleHeading, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Only Heading");
        });

        test("Handles single heading with nth-1 selector", () => {
            const singleHeading = [createHeading(2, "Only Heading", 0)];
            const selectors: PositionalSelector[] = [{ type: "nth", count: 1 }];
            const result = PositionalSelectorUtil.applySelectors(singleHeading, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe("Only Heading");
        });

        test("Handles single heading with nth-2 selector (out of bounds)", () => {
            const singleHeading = [createHeading(2, "Only Heading", 0)];
            const selectors: PositionalSelector[] = [{ type: "nth", count: 2 }];
            const result = PositionalSelectorUtil.applySelectors(singleHeading, selectors);

            expect(result).toHaveLength(0);
        });

        test("Does not modify original headings array", () => {
            const originalLength = sampleHeadings.length;
            const selectors: PositionalSelector[] = [{ type: "first", count: 2 }];
            
            PositionalSelectorUtil.applySelectors(sampleHeadings, selectors);

            expect(sampleHeadings).toHaveLength(originalLength);
        });

        test("Preserves heading properties after selection", () => {
            const headingsWithContext: HeadingInfo[] = [
                { level: 2, text: "Question?", lineNumber: 5, isQuestion: true, context: ["Parent"], index: 0 },
                { level: 3, text: "Regular", lineNumber: 10, isQuestion: false, context: ["Parent", "Child"], index: 1 },
            ];
            const selectors: PositionalSelector[] = [{ type: "first", count: 1 }];
            const result = PositionalSelectorUtil.applySelectors(headingsWithContext, selectors);

            expect(result).toHaveLength(1);
            expect(result[0].level).toBe(2);
            expect(result[0].text).toBe("Question?");
            expect(result[0].lineNumber).toBe(5);
            expect(result[0].isQuestion).toBe(true);
            expect(result[0].context).toEqual(["Parent"]);
            expect(result[0].index).toBe(0);
        });
    });
});
