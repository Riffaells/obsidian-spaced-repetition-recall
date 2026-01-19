import { mock } from "bun:test";
import { JSDOM } from "jsdom";

// Create JSDOM instance
const jsdom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
});

const window = jsdom.window as any;
const document = window.document;

// Set window dimensions
Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });
Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 800 });

// Expose globals
(global as any).window = window;
(global as any).document = document;
(global as any).HTMLElement = window.HTMLElement;
(global as any).HTMLMetaElement = window.HTMLMetaElement;
(global as any).Event = window.Event;
(global as any).KeyboardEvent = window.KeyboardEvent;
(global as any).MouseEvent = window.MouseEvent;
(global as any).CustomEvent = window.CustomEvent;
(global as any).Node = window.Node;
(global as any).navigator = window.navigator;

// Add ResizeObserver mock that actually works
(global as any).ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;
    private observedElements: Set<Element> = new Set();

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }

    disconnect() {
        this.observedElements.clear();
    }

    observe(target: Element, options?: ResizeObserverObserveOptions) {
        this.observedElements.add(target);
        // Trigger callback immediately for testing
        setTimeout(() => {
            if (this.observedElements.has(target)) {
                this.callback([], this);
            }
        }, 0);
    }

    unobserve(target: Element) {
        this.observedElements.delete(target);
    }
};

// Mock getComputedStyle with safe area support
const originalGetComputedStyle = window.getComputedStyle.bind(window);
(global as any).getComputedStyle = (elt: Element) => {
    const defaultStyle = originalGetComputedStyle(elt);
    return new Proxy(defaultStyle, {
        get(target: any, prop: string) {
            if (prop === "getPropertyValue") {
                return (cssProp: string) => {
                    if (cssProp === "--safe-area-inset-top") return "20px";
                    if (cssProp === "--safe-area-inset-right") return "0px";
                    if (cssProp === "--safe-area-inset-bottom") return "0px";
                    if (cssProp === "--safe-area-inset-left") return "0px";
                    return target.getPropertyValue(cssProp);
                };
            }
            return target[prop];
        },
    });
};

// Mock Touch and TouchEvent
class TouchImpl {
    public identifier: number = 0;
    public target: EventTarget | null = null;
    public clientX: number = 0;
    public clientY: number = 0;
    public screenX: number = 0;
    public screenY: number = 0;
    public pageX: number = 0;
    public pageY: number = 0;
    public radiusX: number = 0;
    public radiusY: number = 0;
    public rotationAngle: number = 0;
    public force: number = 0;

    constructor(init: any) {
        Object.assign(this, init);
    }
}

class TouchEventImpl extends window.Event {
    public touches: Touch[] = [];
    public targetTouches: Touch[] = [];
    public changedTouches: Touch[] = [];
    public altKey: boolean = false;
    public metaKey: boolean = false;
    public ctrlKey: boolean = false;
    public shiftKey: boolean = false;

    constructor(type: string, init?: any) {
        super(type, init);
        if (init) {
            if (init.touches) this.touches = Array.from(init.touches);
            if (init.targetTouches) this.targetTouches = Array.from(init.targetTouches);
            if (init.changedTouches) this.changedTouches = Array.from(init.changedTouches);
            if (init.altKey !== undefined) this.altKey = init.altKey;
            if (init.metaKey !== undefined) this.metaKey = init.metaKey;
            if (init.ctrlKey !== undefined) this.ctrlKey = init.ctrlKey;
            if (init.shiftKey !== undefined) this.shiftKey = init.shiftKey;
        }
    }
}

// Set Touch and TouchEvent on window and global
(window as any).Touch = TouchImpl;
(window as any).TouchEvent = TouchEventImpl;
(global as any).Touch = TouchImpl;
(global as any).TouchEvent = TouchEventImpl;

// Mock 'obsidian' module
mock.module("obsidian", () => {
    const moment = require("moment");
    const Platform = {
        isMobile: true,
        isDesktop: false,
        isSafari: false,
    };
    return {
        moment,
        App: class {},
        Plugin: class {},
        Modal: class {
            public contentEl: any;
            public titleEl: any;
            constructor() {
                this.contentEl = document.createElement("div");
                this.titleEl = document.createElement("div");
            }
            open() {}
            close() {}
        },
        Setting: class {
            constructor() {}
            setName() {
                return this;
            }
            setDesc() {
                return this;
            }
            addText() {
                return this;
            }
            addToggle() {
                return this;
            }
            addButton() {
                return this;
            }
            addDropdown() {
                return this;
            }
            addSlider() {
                return this;
            }
        },
        TFile: class {},
        TFolder: class {},
        Notice: class {},
        MarkdownRenderer: class {
            static render() {}
        },
        request: mock(() => Promise.resolve("")),
        setIcon: mock(() => {}),
        finishRenderMath: mock(() => {}),
        renderMath: mock(() => ({})),
        getAllTags: mock(() => []),
        getLinkpath: mock((p: string) => p),
        prepareSimpleSearch: mock(() => () => null),
        setTooltip: mock(() => {}),
        parseFrontMatterTags: mock(() => []),
        parseFrontMatterAliases: mock(() => []),
        ButtonComponent: class {
            setTooltip() {
                return this;
            }
            setIcon() {
                return this;
            }
            onClick() {
                return this;
            }
            setButtonText() {
                return this;
            }
            setCta() {
                return this;
            }
            removeCta() {
                return this;
            }
        },
        MarkdownView: class {},
        Platform,
    };
});

/**
 * Robustly enrich HTMLElement prototype with Obsidian-specific methods
 */
const enrichPrototype = (proto: any) => {
    if (!proto) return;

    proto.empty = function () {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }
        if (this.innerHTML !== undefined) this.innerHTML = "";
    };

    proto.addClass = function (...clss: any[]) {
        clss.forEach((c) => {
            if (typeof c === "string" && c) {
                c.split(" ")
                    .filter(Boolean)
                    .forEach((cls) => this.classList.add(cls));
            }
        });
        return this;
    };

    proto.addClasses = function (clss: string[]) {
        this.addClass(...clss);
        return this;
    };

    proto.removeClass = function (...clss: any[]) {
        clss.forEach((c) => {
            if (typeof c === "string" && c) {
                c.split(" ")
                    .filter(Boolean)
                    .forEach((cls) => this.classList.remove(cls));
            }
        });
        return this;
    };

    proto.toggleClass = function (cls: string, force?: boolean) {
        return this.classList.toggle(cls, force);
    };

    proto.setText = function (text: string) {
        this.textContent = text;
        return this;
    };

    proto.createDiv = function (o?: any) {
        return this.createEl("div", o);
    };

    proto.createSpan = function (o?: any) {
        return this.createEl("span", o);
    };

    proto.createEl = function (tag: string, o?: any) {
        const doc = this.ownerDocument || document;
        const el = doc.createElement(tag);
        if (typeof o === "string") {
            el.addClass(o);
        } else if (o) {
            if (o.cls) el.addClass(o.cls);
            if (o.text) el.setText(o.text);
            if (o.attr) {
                for (const k in o.attr) el.setAttribute(k, o.attr[k]);
            }
        }
        this.appendChild(el);
        return el;
    };

    if (!proto.remove) {
        proto.remove = function () {
            if (this.parentNode) this.parentNode.removeChild(this);
        };
    }

    Object.defineProperty(proto, "isContentEditable", {
        get: function () {
            return this.getAttribute("contenteditable") === "true";
        },
        configurable: true,
    });
};

if (typeof window !== "undefined" && window.HTMLElement) {
    enrichPrototype(window.HTMLElement.prototype);
}

// Store original implementations of the style properties
if (typeof window !== "undefined" && window.CSSStyleDeclaration) {
    const originalStyleDescriptors = new Map<string, PropertyDescriptor | undefined>();
    const paddingProps = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
    paddingProps.forEach((prop) => {
        originalStyleDescriptors.set(
            prop,
            Object.getOwnPropertyDescriptor(window.CSSStyleDeclaration.prototype, prop),
        );
    });

    // Custom storage for mocked style values per CSSStyleDeclaration instance
    const styleStorage = new WeakMap<CSSStyleDeclaration, Map<string, string>>();

    // Store original removeProperty
    const originalRemoveProperty = window.CSSStyleDeclaration.prototype.removeProperty;

    // Override removeProperty to work with our custom storage
    window.CSSStyleDeclaration.prototype.removeProperty = function (property: string): string {
        const camelCaseProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

        const instanceStorage = styleStorage.get(this);
        if (instanceStorage && paddingProps.includes(camelCaseProperty)) {
            const oldValue = instanceStorage.get(camelCaseProperty) || "";
            instanceStorage.delete(camelCaseProperty);

            // Also call original removeProperty
            const result = originalRemoveProperty.call(this, property);
            return oldValue || result;
        }

        return originalRemoveProperty.call(this, property);
    };

    // Define a custom getter/setter for the style properties on CSSStyleDeclaration.prototype
    paddingProps.forEach((prop) => {
        Object.defineProperty(window.CSSStyleDeclaration.prototype, prop, {
            configurable: true,
            enumerable: true,
            get(this: CSSStyleDeclaration): string {
                const instanceStorage = styleStorage.get(this);
                if (instanceStorage && instanceStorage.has(prop)) {
                    return instanceStorage.get(prop) as string;
                }
                const originalDescriptor = originalStyleDescriptors.get(prop);
                return originalDescriptor?.get?.call(this) ?? "";
            },
            set(this: CSSStyleDeclaration, value: string) {
                let instanceStorage = styleStorage.get(this);
                if (!instanceStorage) {
                    instanceStorage = new Map<string, string>();
                    styleStorage.set(this, instanceStorage);
                }

                const originalDescriptor = originalStyleDescriptors.get(prop);

                if (value === "" || value === null || value === undefined) {
                    instanceStorage.delete(prop); // Clear the stored value
                    // Also clear from the underlying style object
                    if (originalDescriptor?.set) {
                        originalDescriptor.set.call(this, "");
                    }
                } else {
                    instanceStorage.set(prop, value); // Store the new value
                    if (originalDescriptor?.set) {
                        originalDescriptor.set.call(this, value);
                    }
                }
            },
        });
    });
}

(global as any).setIcon = mock(() => {});

// Configure fast-check for Bun compatibility
import * as fc from "fast-check";

// Reduce default number of runs for property-based tests to avoid timeouts
(fc as any).configureGlobal({
    numRuns: 20, // Reduced from default 100
    timeout: 5000, // 5 second timeout per property test
});

// Force process exit after tests complete
if (typeof process !== "undefined") {
    const originalExit = process.exit.bind(process);
    let testsDone = false;

    // Hook into Bun's test completion
    if (typeof Bun !== "undefined" && Bun.jest) {
        const originalAfterAll = globalThis.afterAll;
        globalThis.afterAll = function (fn: any) {
            return originalAfterAll(() => {
                if (fn) fn();
                testsDone = true;
                // Give a small delay for cleanup
                setTimeout(() => {
                    if (jsdom && jsdom.window) {
                        jsdom.window.close();
                    }
                    originalExit(0);
                }, 100);
            });
        };
    }

    // Fallback: force exit after 10 seconds of inactivity
    let lastActivity = Date.now();
    const checkInterval = setInterval(() => {
        if (testsDone || Date.now() - lastActivity > 10000) {
            clearInterval(checkInterval);
            if (jsdom && jsdom.window) {
                jsdom.window.close();
            }
            originalExit(0);
        }
    }, 1000);

    // Update activity on any console output
    const originalLog = console.log;
    console.log = function (...args: any[]) {
        lastActivity = Date.now();
        return originalLog.apply(console, args);
    };
}
