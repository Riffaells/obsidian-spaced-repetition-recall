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
    public disabled: boolean = false;
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

    // Helper to find elements by class
    findByClass(className: string): MockHTMLElement[] {
        const results: MockHTMLElement[] = [];
        if (this.classList.has(className)) results.push(this);
        this.children.forEach((child) => results.push(...child.findByClass(className)));
        return results;
    }

    // Helper to find button elements
    findButtons(): MockHTMLElement[] {
        const results: MockHTMLElement[] = [];
        if (this.tagName === "BUTTON") results.push(this);
        this.children.forEach((child) => results.push(...child.findButtons()));
        return results;
    }
}

// Mock IMarkdownRenderer
class MockMarkdownRenderer {
    async render(content: string, container: HTMLElement, direction: string): Promise<void> {
        // Simple mock implementation
    }
}

// Helper to create mock cards
function createMockCard(options: {
    front: string;
    back: string;
    textDirection?: TextDirection;
}): any {
    return {
        front: options.front,
        back: options.back,
        question: {
            questionType: 0,
            questionText: {
                original: options.front,
                textDirection:
                    options.textDirection !== undefined ? options.textDirection : TextDirection.Ltr,
            },
            note: {
                filePath: "test.md",
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

describe("CardView Review Controls Properties", () => {
    let mockApp: any;
    let mockRenderer: MockMarkdownRenderer;
    let rootElement: MockHTMLElement;

    beforeEach(() => {
        mockApp = {};
        mockRenderer = new MockMarkdownRenderer();
        rootElement = new MockHTMLElement();
    });

    // Property 19: Review Button Display
    // Feature: flashcard-modal-rewrite, Property 19: Review Button Display
    test("Property 19: For any card back view, all configured review response buttons SHALL be present and visible", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const card = createMockCard({
            front: "Question",
            back: "Answer",
        });

        const view = new CardView(mockApp, rootElement as any, mockRenderer);

        // Render front first
        await view.renderFront(card);

        // Then render back to show review buttons
        await view.renderBack(card);

        // Find all response buttons
        const responseButtons = rootElement.findByClass("sr-response-button");

        // Should have: Show Answer, Reset, Hard, Good, Easy buttons
        expect(responseButtons.length).toBeGreaterThanOrEqual(5);

        // Verify specific buttons exist
        const hardButton = responseButtons.find((btn) => btn.hasClass("sr-hard-button"));
        const goodButton = responseButtons.find((btn) => btn.hasClass("sr-good-button"));
        const easyButton = responseButtons.find((btn) => btn.hasClass("sr-easy-button"));
        const resetButton = responseButtons.find((btn) => btn.hasClass("sr-reset-button"));

        expect(hardButton).toBeDefined();
        expect(goodButton).toBeDefined();
        expect(easyButton).toBeDefined();
        expect(resetButton).toBeDefined();

        // Verify they are visible (not hidden)
        expect(hardButton?.hasClass("sr-is-hidden")).toBe(false);
        expect(goodButton?.hasClass("sr-is-hidden")).toBe(false);
        expect(easyButton?.hasClass("sr-is-hidden")).toBe(false);
        expect(resetButton?.hasClass("sr-is-hidden")).toBe(false);
    });

    // Property 20: Review Interval Display
    // Feature: flashcard-modal-rewrite, Property 20: Review Interval Display
    test("Property 20: For any review response button, the modal SHALL display the calculated next review interval", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const card = createMockCard({
            front: "Question",
            back: "Answer",
        });

        const view = new CardView(mockApp, rootElement as any, mockRenderer);

        // Render back to show review buttons
        await view.renderBack(card);

        // Test various interval values
        const testIntervals = [
            [0, 1, 3, 7], // days
            [0, 0.5, 1, 2], // less than a day
            [0, 30, 60, 90], // months
            [0, 365, 730, 1095], // years
        ];

        for (const intervals of testIntervals) {
            view.showReviewButtons(intervals);

            // Find response buttons
            const hardButton = rootElement.findByClass("sr-hard-button")[0];
            const goodButton = rootElement.findByClass("sr-good-button")[0];
            const easyButton = rootElement.findByClass("sr-easy-button")[0];

            // Verify buttons contain interval information
            expect(hardButton.textContent).toContain("Hard");
            expect(goodButton.textContent).toContain("Good");
            expect(easyButton.textContent).toContain("Easy");

            // Verify interval is displayed (should contain a dash separator and interval text)
            if (intervals[1] > 0) {
                expect(hardButton.textContent).toContain("-");
            }
            if (intervals[2] > 0) {
                expect(goodButton.textContent).toContain("-");
            }
            if (intervals[3] > 0) {
                expect(easyButton.textContent).toContain("-");
            }
        }
    });

    test("Property 20 (edge case): Review buttons handle missing or invalid intervals gracefully", async () => {
        const { CardView } = await import("src/gui/flashcard-modal-rewrite/components/CardView");

        const card = createMockCard({
            front: "Question",
            back: "Answer",
        });

        const view = new CardView(mockApp, rootElement as any, mockRenderer);
        await view.renderBack(card);

        // Test with null/undefined intervals
        view.showReviewButtons(null as any);

        const hardButton = rootElement.findByClass("sr-hard-button")[0];
        const goodButton = rootElement.findByClass("sr-good-button")[0];
        const easyButton = rootElement.findByClass("sr-easy-button")[0];

        // Should still have button text even without intervals
        expect(hardButton.textContent).toBeTruthy();
        expect(goodButton.textContent).toBeTruthy();
        expect(easyButton.textContent).toBeTruthy();

        // Test with empty array
        view.showReviewButtons([]);
        expect(hardButton.textContent).toBeTruthy();
        expect(goodButton.textContent).toBeTruthy();
        expect(easyButton.textContent).toBeTruthy();
    });
});
