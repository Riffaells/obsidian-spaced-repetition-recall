import { describe, test, expect, mock } from "bun:test";

// Mocks for dependencies
mock.module("obsidian", () => ({
    setIcon: () => {},
    TFile: class {},
    App: class {},
}));

// Mock external src dependencies
// mock.module("src/core/models/Card", () => ({ Card: class {} }));
// mock.module("src/core/models/Deck", () => ({ Deck: class {} }));
// mock.module("src/core/services/TopicPath", () => ({ TopicPath: class {} }));
mock.module("src/core/scheduling/scheduling", () => ({
    ReviewResponse: { Hard: 1, Good: 2, Easy: 3 },
}));
mock.module("src/core/scheduling/FlashcardReviewSequencer", () => ({
    FlashcardReviewMode: { Review: 0, Cram: 1 },
}));
mock.module("src/utils/RenderMarkdownWrapper", () => ({ RenderMarkdownWrapper: class {} }));
mock.module("src/utils/TextDirection", () => ({
    TextDirection: { Unspecified: 0, Ltr: 1, Rtl: 2 },
}));
mock.module("src/main", () => ({ default: class {} }));
mock.module("src/lang/helpers", () => ({ t: (str: string) => str }));

import { CardView } from "src/gui/flashcard-modal-rewrite/components/CardView";

interface MockCard {
    front: string;
    back: string;
    note: { filePath: string };
    question: { questionText: { textDirection: string } };
}

// Mock HTMLElement
class MockHTMLElement {
    public children: MockHTMLElement[] = [];
    public classList: Set<string> = new Set();
    public innerHTML: string = "";
    public textContent: string = "";
    public tagName: string = "DIV";
    public eventListeners: Record<string, Function[]> = {};
    public scrollTop: number = 0;
    public style: Record<string, string> = {};
    public attributes: Record<string, string> = {};

    createDiv(options?: any): MockHTMLElement {
        return this._createEl("div", options);
    }
    createEl(tag: string, options?: any): MockHTMLElement {
        return this._createEl(tag, options);
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
                    el.attributes[key] = value as string;
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
    addEventListener(event: string, cb: Function): void {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(cb);
    }
    setAttribute(name: string, value: string): void {
        this.attributes[name] = value;
    }
    getAttribute(name: string): string | null {
        return this.attributes[name] || null;
    }
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

describe("CardView", () => {
    test("renderFront calls injected renderer", async () => {
        const root = new MockHTMLElement() as any as HTMLElement;
        const renderInfo = { called: false, content: "", direction: "" };

        const mockRenderer = {
            render: async (content: string, container: HTMLElement, direction: string) => {
                renderInfo.called = true;
                renderInfo.content = content;
                renderInfo.direction = direction;
            },
        };

        const mockApp = {} as any;

        const view = new CardView(mockApp, root, mockRenderer);

        const card = {
            front: "Front Text",
            back: "Back Text",
            note: { filePath: "path/to/note.md" },
            question: { questionText: { textDirection: 1 }, topicPathList: { list: [] } }, // TextDirection.Ltr
        } as unknown as MockCard;

        await view.renderFront(card as any);

        expect(renderInfo.called).toBe(true);
        expect(renderInfo.content).toBe("Front Text");
        expect(renderInfo.direction).toBe("ltr");
    });
});
