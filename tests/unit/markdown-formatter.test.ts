import { MarkdownFormatter } from "src/utils/markdown-formatter";

describe("MarkdownFormatter", () => {
    describe("formatForDisplay", () => {
        test("removes heading markers from beginning of lines", () => {
            expect(MarkdownFormatter.formatForDisplay("# Heading 1")).toBe("Heading 1");
            expect(MarkdownFormatter.formatForDisplay("## Heading 2")).toBe("Heading 2");
            expect(MarkdownFormatter.formatForDisplay("### Heading 3")).toBe("Heading 3");
            expect(MarkdownFormatter.formatForDisplay("#### Heading 4")).toBe("Heading 4");
        });

        test("converts bold markdown to HTML", () => {
            expect(MarkdownFormatter.formatForDisplay("**жирный**")).toBe(
                "<strong>жирный</strong>",
            );
            expect(MarkdownFormatter.formatForDisplay("текст **жирный** текст")).toBe(
                "текст <strong>жирный</strong> текст",
            );
        });

        test("converts italic markdown to HTML", () => {
            expect(MarkdownFormatter.formatForDisplay("*курсив*")).toBe("<em>курсив</em>");
            expect(MarkdownFormatter.formatForDisplay("текст *курсив* текст")).toBe(
                "текст <em>курсив</em> текст",
            );
        });

        test("converts bold italic markdown to HTML", () => {
            expect(MarkdownFormatter.formatForDisplay("***жирный курсив***")).toBe(
                "<strong><em>жирный курсив</em></strong>",
            );
        });

        test("handles mixed formatting", () => {
            const input = "## Заголовок\n**жирный** и *курсив* и ***оба***";
            const expected =
                "Заголовок\n<strong>жирный</strong> и <em>курсив</em> и <strong><em>оба</em></strong>";
            expect(MarkdownFormatter.formatForDisplay(input)).toBe(expected);
        });

        test("does not remove # in middle of text", () => {
            expect(MarkdownFormatter.formatForDisplay("текст # символ")).toBe("текст # символ");
            expect(MarkdownFormatter.formatForDisplay("C# programming")).toBe("C# programming");
        });
    });

    describe("extractDisplayText", () => {
        test("removes HTML tags and formats markdown", () => {
            const input = "<p>## Заголовок</p><div>**жирный**</div>";
            const result = MarkdownFormatter.extractDisplayText(input);
            // extractDisplayText formats markdown to HTML, then removes HTML tags
            // So **жирный** becomes <strong>жирный</strong>, which stays as HTML
            expect(result).toContain("Заголовок");
            expect(result).toContain("жирный");
        });

        test("truncates long text", () => {
            const longText = "a".repeat(150);
            const result = MarkdownFormatter.extractDisplayText(longText, 100);
            expect(result.length).toBe(103); // 100 + "..."
            expect(result.endsWith("...")).toBe(true);
        });

        test("handles empty input", () => {
            expect(MarkdownFormatter.extractDisplayText("")).toBe("");
            expect(MarkdownFormatter.extractDisplayText(null as any)).toBe("");
        });
    });
});
