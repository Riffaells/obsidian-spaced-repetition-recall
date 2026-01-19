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
    // Help find elements by class
    findByClass(className: string): MockHTMLElement[] {
        const results: MockHTMLElement[] = [];
        if (this.classList.has(className)) results.push(this);
        this.children.forEach((child) => results.push(...child.findByClass(className)));
        return results;
    }
}

// Mock IMarkdownRenderer
class MockMarkdownRenderer {
    async render(content: string, container: HTMLElement, direction: string): Promise<void> {
        // Simple mock implementation
    }
}

// Helper to create mock cards with context
function createMockCardWithContext(options: {
    front: string;
    back: string;
    filename?: string;
    isHeaderBased?: boolean;
    headingContext?: string;
    questionContext?: string[];
    topicPath?: string[];
}): any {
    return {
        front: options.front,
        back: options.back,
        question: {
            questionType: 0,
            questionText: {
                original: options.front,
                textDirection: TextDirection.Ltr,
            },
            note: {
                filePath: options.filename || "test.md",
                file: { basename: options.filename?.replace(".md", "") || "test" },
            },
            isHeaderBased: options.isHeaderBased || false,
            questionContext: options.questionContext || [],
            topicPathList: { list: options.topicPath ? [{ path: options.topicPath }] : [] },
            getDisplayContext: () => options.headingContext || "",
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

describe("CardView Context Display Property", () => {
    let mockApp: any;
    let mockRenderer: MockMarkdownRenderer;
    let rootElement: MockHTMLElement;

    beforeEach(() => {
        mockApp = {};
        mockRenderer = new MockMarkdownRenderer();
        rootElement = new MockHTMLElement();
    });

    // Property 35: Card Context Display
    // Feature: flashcard-modal-rewrite, Property 35: Card Context Display
    test("Property 35: For any card, the modal SHALL display note filename, heading context, and topic path", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        // Test case 1: Card with filename only
        const card1 = createMockCardWithContext({
            front: "Question 1",
            back: "Answer 1",
            filename: "my-note.md",
        });

        const root1 = new MockHTMLElement();
        const view1 = new CardView(mockApp, root1 as any, mockRenderer);
        await view1.renderFront(card1);

        const contextEl1 = root1.findByClass("sr-context")[0];
        expect(contextEl1).toBeDefined();
        expect(contextEl1.textContent).toContain("my-note");

        // Test case 2: Header-based card with heading context
        const card2 = createMockCardWithContext({
            front: "Question 2",
            back: "Answer 2",
            filename: "notes.md",
            isHeaderBased: true,
            headingContext: "Chapter 1 > Section A",
        });

        const root2 = new MockHTMLElement();
        const view2 = new CardView(mockApp, root2 as any, mockRenderer);
        await view2.renderFront(card2);

        const contextEl2 = root2.findByClass("sr-context")[0];
        expect(contextEl2.textContent).toContain("notes");
        expect(contextEl2.textContent).toContain("Chapter 1 > Section A");

        // Test case 3: Card with question context
        const card3 = createMockCardWithContext({
            front: "Question 3",
            back: "Answer 3",
            filename: "study.md",
            questionContext: ["Context 1", "Context 2"],
        });

        const root3 = new MockHTMLElement();
        const view3 = new CardView(mockApp, root3 as any, mockRenderer);
        await view3.renderFront(card3);

        const contextEl3 = root3.findByClass("sr-context")[0];
        expect(contextEl3.textContent).toContain("study");
        expect(contextEl3.textContent).toContain("Context 1");
        expect(contextEl3.textContent).toContain("Context 2");

        // Test case 4: Card with topic path (deck hierarchy)
        const card4 = createMockCardWithContext({
            front: "Question 4",
            back: "Answer 4",
            filename: "flashcards.md",
            topicPath: ["Science", "Physics", "Mechanics"],
        });

        const root4 = new MockHTMLElement();
        const view4 = new CardView(mockApp, root4 as any, mockRenderer);
        await view4.renderFront(card4);

        const contextEl4 = root4.findByClass("sr-context")[0];
        expect(contextEl4.textContent).toContain("flashcards");
        expect(contextEl4.textContent).toContain("Science");
        expect(contextEl4.textContent).toContain("Physics");
        expect(contextEl4.textContent).toContain("Mechanics");
    });

    test("Property 35 (comprehensive): Card with all context types displays complete hierarchy", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const card = createMockCardWithContext({
            front: "Comprehensive Question",
            back: "Comprehensive Answer",
            filename: "complete-note.md",
            isHeaderBased: true,
            headingContext: "Main Topic",
            questionContext: ["Sub Context"],
            topicPath: ["Deck1", "Deck2"],
        });

        const view = new CardView(mockApp, rootElement as any, mockRenderer);
        await view.renderFront(card);

        const contextEl = rootElement.findByClass("sr-context")[0];

        // Verify all components are present
        expect(contextEl.textContent).toContain("complete-note");
        expect(contextEl.textContent).toContain("Main Topic");
        expect(contextEl.textContent).toContain("Sub Context");
        expect(contextEl.textContent).toContain("Deck1");
        expect(contextEl.textContent).toContain("Deck2");

        // Verify context is visible (not hidden)
        expect(contextEl.hasClass("sr-is-hidden")).toBe(false);
    });

    test("Property 35 (edge case): Card with no context hides context element", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const card = createMockCardWithContext({
            front: "Minimal Question",
            back: "Minimal Answer",
            filename: "",
            isHeaderBased: false,
            questionContext: [],
            topicPath: [],
        });

        // Override to return empty filename
        card.question.note.file.basename = "";

        const view = new CardView(mockApp, rootElement as any, mockRenderer);
        await view.renderFront(card);

        const contextEl = rootElement.findByClass("sr-context")[0];

        // Context element should be hidden when there's no context to display
        expect(contextEl.hasClass("sr-is-hidden")).toBe(true);
    });
});
