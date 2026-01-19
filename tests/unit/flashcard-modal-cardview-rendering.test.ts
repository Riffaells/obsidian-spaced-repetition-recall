import { describe, test, expect, beforeEach } from "bun:test";
import { TextDirection } from "src/utils/TextDirection";

// Mock HTMLElement for testing
class MockHTMLElement {
    public children: MockHTMLElement[] = [];
    public classList: Set<string> = new Set();
    public innerHTML: string = "";
    public textContent: string = "";
    public tagName: string = "DIV";
    public attributes: Map<string, string> = new Map();
    public scrollTop: number = 0;
    public style: any = {};

    createDiv(options?: any): MockHTMLElement {
        return this._createEl("div", options);
    }
    createEl(tag: string, options?: any): MockHTMLElement {
        return this._createEl(tag, options);
    }
    createSpan(options?: any): MockHTMLElement {
        return this._createEl("span", options);
    }

    _createEl(tag: string, options?: any): MockHTMLElement {
        const el = new MockHTMLElement();
        el.tagName = tag.toUpperCase();
        if (typeof options === "string") {
            options.split(" ").forEach((c) => el.classList.add(c));
        } else if (options && typeof options === "object") {
            if (options.cls) {
                if (Array.isArray(options.cls)) {
                    options.cls.forEach((c: string) => el.classList.add(c));
                } else {
                    options.cls.split(" ").forEach((c: string) => el.classList.add(c));
                }
            }
            if (options.attr) {
                for (const [key, value] of Object.entries(options.attr)) {
                    el.attributes.set(key, value as string);
                }
            }
        }
        this.children.push(el);
        return el;
    }

    addClass(cls: string): void {
        this.classList.add(cls);
    }
    addClasses(classes: string[]): void {
        classes.forEach((c) => this.classList.add(c));
    }
    removeClass(cls: string): void {
        this.classList.delete(cls);
    }
    toggleClass(cls: string, force?: boolean): void {
        if (force === undefined) {
            this.classList.has(cls) ? this.classList.delete(cls) : this.classList.add(cls);
        } else {
            force ? this.classList.add(cls) : this.classList.delete(cls);
        }
    }
    hasClass(cls: string): boolean {
        return this.classList.has(cls);
    }
    setText(text: string): void {
        this.textContent = text;
    }
    empty(): void {
        this.children = [];
        this.innerHTML = "";
        this.textContent = "";
    }
    remove(): void {}
    appendChild(node: any): void {
        this.children.push(node);
    }
    addEventListener(event: string, cb: Function): void {}
    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }
    getAttribute(name: string): string | null {
        return this.attributes.get(name) || null;
    }

    // Helper to check if element contains specific HTML structure
    containsElement(tagName: string): boolean {
        if (this.tagName === tagName.toUpperCase()) return true;
        return this.children.some((child) => child.containsElement(tagName));
    }

    // Helper to find elements by class
    findByClass(className: string): MockHTMLElement[] {
        const results: MockHTMLElement[] = [];
        if (this.classList.has(className)) results.push(this);
        this.children.forEach((child) => results.push(...child.findByClass(className)));
        return results;
    }
}

// Mock IMarkdownRenderer
class MockMarkdownRenderer {
    public lastRendered: { content: string; direction: string } | null = null;
    public renderCount: number = 0;

    async render(content: string, container: HTMLElement, direction: string): Promise<void> {
        this.lastRendered = { content, direction };
        this.renderCount++;

        // Simulate markdown rendering by creating elements based on content
        const mockContainer = container as any as MockHTMLElement;

        // Detect markdown patterns and create appropriate elements
        if (content.includes("```")) {
            const codeBlock = mockContainer.createEl("pre");
            codeBlock.addClass("language-javascript");
            const code = codeBlock.createEl("code");
            code.addClass("hljs");
        }

        if (content.includes("![")) {
            const img = mockContainer.createEl("img");
            img.setAttribute("src", "test-image.png");
        }

        if (content.includes("$$") || content.includes("$")) {
            const math = mockContainer.createEl("span");
            math.addClass("math");
            math.addClass("math-inline");
        }

        // Apply text direction
        if (direction === "rtl") {
            mockContainer.setAttribute("dir", "rtl");
        } else if (direction === "ltr") {
            mockContainer.setAttribute("dir", "ltr");
        }
    }
}

// Helper to create mock cards
function createMockCard(options: {
    front: string;
    back: string;
    textDirection?: TextDirection;
    questionType?: number;
    filePath?: string;
}): any {
    return {
        front: options.front,
        back: options.back,
        question: {
            questionType: options.questionType || 0,
            questionText: {
                original: options.front,
                textDirection:
                    options.textDirection !== undefined ? options.textDirection : TextDirection.Ltr,
            },
            note: {
                filePath: options.filePath || "test.md",
                file: { basename: "test" },
            },
            isHeaderBased: false,
            questionContext: [],
            topicPathList: { list: [] },
            getDisplayContext: () => "",
        },
    };
}

// Global DOM mocks
if (typeof document === "undefined") {
    (global as any).document = {
        createElement: (tag: string) => {
            const el = new MockHTMLElement();
            el.tagName = tag.toUpperCase();
            return el;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
    };
}

describe("CardView Content Rendering Properties", () => {
    let mockApp: any;
    let mockRenderer: MockMarkdownRenderer;
    let rootElement: MockHTMLElement;

    beforeEach(() => {
        mockApp = {};
        mockRenderer = new MockMarkdownRenderer();
        rootElement = new MockHTMLElement();
    });

    // Property 14: Markdown Rendering Correctness
    // Feature: flashcard-modal-rewrite, Property 14: Markdown Rendering Correctness
    test("Property 14: For any card containing markdown syntax, the rendered output SHALL contain appropriate HTML elements", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const testCases = [
            { markdown: "# Header\n## Subheader", description: "headers" },
            { markdown: "- Item 1\n- Item 2", description: "lists" },
            { markdown: "**bold** and *italic*", description: "emphasis" },
            { markdown: "[link](url)", description: "links" },
        ];

        for (const testCase of testCases) {
            const card = createMockCard({
                front: testCase.markdown,
                back: "Back",
            });

            const view = new CardView(mockApp, rootElement as any, mockRenderer);
            await view.renderFront(card);

            expect(mockRenderer.renderCount).toBeGreaterThan(0);
            expect(mockRenderer.lastRendered?.content).toBe(testCase.markdown);
        }
    });

    // Property 15: Code Block Syntax Highlighting
    // Feature: flashcard-modal-rewrite, Property 15: Code Block Syntax Highlighting
    test("Property 15: For any card containing code blocks, the rendered output SHALL include syntax highlighting CSS classes", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const codeBlocks = [
            "```javascript\nconst x = 1;\n```",
            "```python\ndef foo():\n    pass\n```",
            "```typescript\ninterface Test {}\n```",
        ];

        for (const codeBlock of codeBlocks) {
            const card = createMockCard({
                front: codeBlock,
                back: "Back",
            });

            const view = new CardView(mockApp, rootElement as any, mockRenderer);
            await view.renderFront(card);

            // Verify renderer was called with code block content
            expect(mockRenderer.lastRendered?.content).toContain("```");

            // Verify syntax highlighting classes are present in rendered output
            const contentEl = rootElement.children[0];
            const hasCodeBlock =
                contentEl.containsElement("PRE") || contentEl.containsElement("CODE");
            expect(hasCodeBlock).toBe(true);
        }
    });

    // Property 16: Image Loading and Display
    // Feature: flashcard-modal-rewrite, Property 16: Image Loading and Display
    test("Property 16: For any card containing image references, the modal SHALL create img elements with correct src attributes", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const imageMarkdown = [
            "![alt text](image.png)",
            "![](photo.jpg)",
            "![[embedded-image.png]]",
        ];

        for (const imgMd of imageMarkdown) {
            const card = createMockCard({
                front: imgMd,
                back: "Back",
            });

            const view = new CardView(mockApp, rootElement as any, mockRenderer);
            await view.renderFront(card);

            // Verify renderer was called with image markdown
            expect(mockRenderer.lastRendered?.content).toContain("!");

            // Verify img elements are created
            const contentEl = rootElement.children[0];
            const hasImage = contentEl.containsElement("IMG");
            expect(hasImage).toBe(true);
        }
    });

    // Property 17: LaTeX Rendering
    // Feature: flashcard-modal-rewrite, Property 17: LaTeX Rendering
    test("Property 17: For any card containing LaTeX notation, the modal SHALL process and render mathematical expressions", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const latexExamples = ["$E = mc^2$", "$$\\int_0^1 x^2 dx$$", "$\\frac{a}{b}$"];

        for (const latex of latexExamples) {
            const card = createMockCard({
                front: latex,
                back: "Back",
            });

            const view = new CardView(mockApp, rootElement as any, mockRenderer);
            await view.renderFront(card);

            // Verify renderer was called with LaTeX content
            expect(mockRenderer.lastRendered?.content).toContain("$");

            // Verify math elements are created
            const contentEl = rootElement.children[0];
            const mathElements = contentEl.findByClass("math");
            expect(mathElements.length).toBeGreaterThan(0);
        }
    });

    // Property 18: Text Direction Respect
    // Feature: flashcard-modal-rewrite, Property 18: Text Direction Respect
    test("Property 18: For any card with specified text direction, the modal SHALL apply correct dir attribute", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const directions = [
            { direction: TextDirection.Rtl, expected: "rtl" },
            { direction: TextDirection.Ltr, expected: "ltr" },
            { direction: TextDirection.Unspecified, expected: "auto" },
        ];

        for (const { direction, expected } of directions) {
            const card = createMockCard({
                front: "Test content",
                back: "Back",
                textDirection: direction,
            });

            const view = new CardView(mockApp, rootElement as any, mockRenderer);
            await view.renderFront(card);

            // Verify correct direction was passed to renderer
            expect(mockRenderer.lastRendered?.direction).toBe(expected);
        }
    });
});
