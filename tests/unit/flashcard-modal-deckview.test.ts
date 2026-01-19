import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { DeckView } from "src/gui/flashcard-modal-rewrite/components/DeckView";
import { Deck } from "src/core/models/Deck";
import { DeckStats } from "src/gui/flashcard-modal-rewrite/types";
import { TopicPath } from "src/core/services/TopicPath";
import * as fc from "fast-check";

// Mock external src dependencies
mock.module("src/lang/helpers", () => ({
    t: (str: string) => str,
}));
mock.module("src/constants", () => ({
    COLLAPSE_ICON: "<div>icon</div>",
}));

// Mock HTMLElement
class MockHTMLElement {
    public children: MockHTMLElement[] = [];
    public classList: Set<string> = new Set();
    public innerHTML: string = "";
    public textContent: string = "";
    public tagName: string = "DIV";
    public attributes: Map<string, string> = new Map();
    public style: Record<string, string> = {};
    public dataset: Record<string, string> = {};
    public listeners: Record<string, ((e: any) => void)[]> = {};

    addEventListener(event: string, listener: (e: any) => void): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(listener);
    }

    removeEventListener(event: string, listener: (e: any) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    }

    dispatchEvent(event: any): void {
        if (!event.target) event.target = this;
        const eventListeners = this.listeners[event.type];
        if (eventListeners) {
            eventListeners.forEach((l) => l(event));
        }
    }

    empty(): void {
        this.children = [];
        this.innerHTML = "";
        this.textContent = "";
    }

    remove(): void {
        const parent = (this as any).parentNode;
        if (parent) {
            parent.removeChild(this);
        }
    }

    appendChild(el: MockHTMLElement): void {
        (el as any).parentNode = this;
        this.children.push(el);
    }

    getAttribute(name: string): string | null {
        return this.attributes.get(name) || null;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    setAttr(name: string, value: string): void {
        this.setAttribute(name, value);
    }

    addClass(cls: string): void {
        if (cls) cls.split(" ").forEach((c) => this.classList.add(c));
    }

    addClasses(classes: string[]): void {
        classes.forEach((c) => this.addClass(c));
    }

    removeClass(cls: string): void {
        this.classList.delete(cls);
    }

    toggleClass(cls: string, force?: boolean): void {
        if (force === true) this.addClass(cls);
        else if (force === false) this.removeClass(cls);
        else if (this.classList.has(cls)) this.removeClass(cls);
        else this.addClass(cls);
    }

    setText(text: string): void {
        this.textContent = text;
    }

    createDiv(cls?: string): MockHTMLElement {
        return this.createEl("div", cls);
    }

    createEl(tag: string, options?: any): MockHTMLElement {
        const el = new MockHTMLElement();
        el.tagName = tag.toUpperCase();
        (el as any).parentNode = this;
        if (typeof options === "string") {
            el.addClass(options);
        } else if (options) {
            if (options.cls) el.addClass(options.cls);
            if (options.text) el.setText(options.text);
            if (options.attr) {
                for (const key in options.attr) {
                    el.setAttribute(key, options.attr[key]);
                }
            }
        }
        this.children.push(el);
        return el;
    }

    querySelector(selector: string): MockHTMLElement | null {
        return this.findRecursive((c) => {
            if (selector.startsWith(".")) {
                return c.classList.has(selector.slice(1));
            }
            if (selector.includes('[role="')) {
                const role = selector.match(/role="([^"]+)"/)?.[1];
                return c.attributes.get("role") === role;
            }
            return false;
        });
    }

    private findRecursive(predicate: (el: MockHTMLElement) => boolean): MockHTMLElement | null {
        if (predicate(this)) return this;
        for (const child of this.children) {
            const found = child.findRecursive(predicate);
            if (found) return found;
        }
        return null;
    }

    querySelectorAll(selector: string): MockHTMLElement[] {
        const results: MockHTMLElement[] = [];
        this.findAllRecursive(results, (el) => {
            if (selector.startsWith(".")) {
                return el.classList.has(selector.slice(1));
            }
            return false;
        });
        return results;
    }

    private findAllRecursive(
        results: MockHTMLElement[],
        predicate: (el: MockHTMLElement) => boolean,
    ): void {
        if (predicate(this)) results.push(this);
        for (const child of this.children) {
            child.findAllRecursive(results, predicate);
        }
    }

    removeChild(el: MockHTMLElement): void {
        const index = this.children.indexOf(el);
        if (index > -1) {
            this.children.splice(index, 1);
            (el as any).parentNode = null;
        }
    }

    click(): void {
        const eventListeners = this.listeners["click"];
        if (eventListeners) {
            eventListeners.forEach((l) => l({ stopPropagation: () => {} }));
        }
    }
}

describe("DeckView", () => {
    // Feature: flashcard-modal-rewrite, Property 38: Deck Statistics Display
    test("renders deck statistics correctly", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0 }),
                fc.integer({ min: 0 }),
                fc.integer({ min: 0 }),
                (due, newCards, total) => {
                    const root = new MockHTMLElement() as any as HTMLElement;
                    const view = new DeckView(root);

                    // Mock deck stats
                    const stats: DeckStats = {
                        dueCount: due,
                        newCount: newCards,
                        totalCount: total,
                    };

                    // Render global stats
                    view.updateStats(stats);

                    const headerStats = (view as any).stats as MockHTMLElement;
                    expect(headerStats.children.length).toBe(3);
                },
            ),
        );
    });

    test("renders deck list correctly", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        deckName: fc.string({ minLength: 1 }),
                        dueCount: fc.integer({ min: 0 }),
                    }),
                    { minLength: 1, maxLength: 10 },
                ),
                (decks) => {
                    const root = new MockHTMLElement() as any as HTMLElement;
                    const view = new DeckView(root);

                    const mockDecks = decks.map((d) => {
                        const deck = new Deck(d.deckName, null);
                        deck.subdecks = [];
                        return deck;
                    });

                    view.render(mockDecks, () => ({ dueCount: 0, newCount: 0, totalCount: 0 }));

                    const treeContainer = (view as any).treeContainer as MockHTMLElement;
                    expect(treeContainer.children.length).toBe(decks.length);
                },
            ),
        );
    });

    test("handles deck selection clicks", () => {
        const root = new MockHTMLElement() as any as HTMLElement;
        const view = new DeckView(root);
        let selectedPath = null;

        view.onDeckSelected((path) => {
            selectedPath = path;
        });

        const mockDeck = new Deck("test", null);
        mockDeck.subdecks = [];
        view.render([mockDeck], () => ({ dueCount: 0, newCount: 0, totalCount: 0 }));

        const treeContainer = (view as any).treeContainer as MockHTMLElement;
        const deckItem = treeContainer.children[0];
        const clickable = deckItem.querySelector(".is-clickable");
        expect(clickable).not.toBeNull();
        clickable!.click();

        expect(selectedPath).not.toBeNull();
    });
});
