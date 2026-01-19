import { describe, test, expect, map, mock, beforeEach, afterEach, afterAll } from "bun:test";
import { StateMachine } from "src/gui/flashcard-modal-rewrite/utils/StateMachine";
import { EventBus } from "src/gui/flashcard-modal-rewrite/utils/EventBus";
import { ModalState } from "src/gui/flashcard-modal-rewrite/types";
import { ServiceContainer } from "src/gui/flashcard-modal-rewrite/services/ServiceContainer";
import {
    KeyboardHandler,
    KeyboardAction,
    DEFAULT_SHORTCUTS,
} from "src/gui/flashcard-modal-rewrite/services/KeyboardHandler";
import { CardView } from "src/gui/flashcard-modal-rewrite/components/CardView";
import { Card } from "src/core/models/Card";
import * as fc from "fast-check";

// Note: document, window, etc. are provided by tests/setup.ts

describe("Flashcard Modal Infrastructure", () => {
    describe("StateMachine", () => {
        test("CLOSED to CLOSED manual", () => {
            const bus = new EventBus();
            const machine = new StateMachine(bus);
            (machine as any).currentState = ModalState.CLOSED;
            let eventEmitted: ModalState | null = null;
            bus.on("state-changed", (data: any) => {
                eventEmitted = data.to;
            });
            machine.transitionTo(ModalState.CLOSED);
            expect(machine.getCurrentState()).toBe(ModalState.CLOSED);
            expect(eventEmitted).toBeNull();
        });

        // Feature: flashcard-modal-rewrite, Property 1: State Transition Event Emission
        test("state transitions emit correct events", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...Object.values(ModalState)),
                    fc.constantFrom(...Object.values(ModalState)),
                    (fromState: ModalState, toState: ModalState) => {
                        const bus = new EventBus();
                        const machine = new StateMachine(bus);

                        // Force state for testing isolation
                        (machine as any).currentState = fromState;

                        let eventEmitted: ModalState | null = null;
                        bus.on("state-changed", (data: any) => {
                            eventEmitted = data.to;
                        });

                        // Same-state transitions are always no-ops
                        if (fromState === toState) {
                            machine.transitionTo(toState);
                            expect(machine.getCurrentState()).toBe(fromState);
                            expect(eventEmitted).toBeNull();
                            return;
                        }

                        const isValid = (machine as any).isValidTransition(fromState, toState);
                        machine.transitionTo(toState);

                        if (isValid) {
                            expect(machine.getCurrentState()).toBe(toState);
                            expect(eventEmitted).toBe(toState);
                        } else {
                            expect(machine.getCurrentState()).toBe(fromState);
                            expect(eventEmitted).toBeNull();
                        }
                    },
                ),
            );
        });
    });

    describe.skip("ServiceContainer", () => {
        test("get throws if service not found", () => {
            const container = new ServiceContainer();
            expect(() => container.get("non-existent")).toThrow();
        });

        test("get returns registered service", () => {
            const container = new ServiceContainer();
            const service = { foo: "bar" };
            container.register("test", service);
            expect(container.get("test")).toBe(service);
        });
    });

    describe.skip("KeyboardHandler", () => {
        // Feature: flashcard-modal-rewrite, Property 3: Keyboard Shortcuts State Awareness
        test("keyboard shortcuts execute correct actions and prevent propagation", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...Object.values(ModalState)),
                    fc.constantFrom(...DEFAULT_SHORTCUTS),
                    (state, shortcut) => {
                        // Isolate the single shortcut to avoid overlap with default shortcuts
                        const handler = new KeyboardHandler([shortcut]);
                        handler.setState(state);

                        let actionExecuted = false;
                        handler.registerAction(shortcut.action, () => {
                            actionExecuted = true;
                        });

                        handler.activate();

                        const event = new KeyboardEvent("keydown", {
                            key: shortcut.key,
                            ctrlKey: shortcut.ctrlKey,
                            shiftKey: shortcut.shiftKey,
                            altKey: shortcut.altKey,
                            bubbles: true,
                            cancelable: true,
                        });

                        let defaultPrevented = false;
                        let propagationStopped = false;
                        event.preventDefault = () => {
                            defaultPrevented = true;
                        };
                        event.stopPropagation = () => {
                            propagationStopped = true;
                        };

                        document.dispatchEvent(event);
                        handler.deactivate();

                        const isMatch = shortcut.validStates.includes(state);
                        if (isMatch) {
                            expect(actionExecuted).toBe(true);
                            expect(defaultPrevented).toBe(true);
                            expect(propagationStopped).toBe(true);
                        } else {
                            expect(actionExecuted).toBe(false);
                            // Should NOT prevent default if no action matched
                            expect(defaultPrevented).toBe(false);
                        }
                    },
                ),
            );
        });

        test("keyboard handler ignores events when typing in input fields", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom("INPUT", "TEXTAREA", "DIV"),
                    fc.constantFrom(...DEFAULT_SHORTCUTS),
                    (tagName, shortcut) => {
                        // Isolate shortcut
                        const handler = new KeyboardHandler([shortcut]);
                        handler.setState(ModalState.CARD_FRONT);

                        let actionExecuted = false;
                        handler.registerAction(shortcut.action, () => {
                            actionExecuted = true;
                        });

                        handler.activate();

                        const target = document.createElement(tagName);
                        if (tagName === "DIV")
                            (target as HTMLElement).setAttribute("contenteditable", "true");

                        const event = new KeyboardEvent("keydown", {
                            key: shortcut.key,
                            ctrlKey: shortcut.ctrlKey,
                            shiftKey: shortcut.shiftKey,
                            altKey: shortcut.altKey,
                            bubbles: true,
                            cancelable: true,
                        });
                        // Use defineProperty because dispatcher sets target
                        Object.defineProperty(event, "target", {
                            value: target,
                            configurable: true,
                        });

                        let defaultPrevented = false;
                        event.preventDefault = () => {
                            defaultPrevented = true;
                        };

                        // We call the internal keydownHandler directly to test target logic reliably
                        (handler as any).handleKeydown(event);
                        handler.deactivate();

                        const shouldIgnore =
                            ["INPUT", "TEXTAREA"].includes(tagName) ||
                            (target as HTMLElement).getAttribute("contenteditable") === "true";

                        if (shouldIgnore) {
                            expect(actionExecuted).toBe(false);
                            expect(defaultPrevented).toBe(false);
                        } else if (shortcut.validStates.includes(ModalState.CARD_FRONT)) {
                            expect(actionExecuted).toBe(true);
                            expect(defaultPrevented).toBe(true);
                        }
                    },
                ),
            );
        });

        test("keyboard handler allows action registration and unregistration", () => {
            fc.assert(
                fc.property(fc.constantFrom(...Object.values(KeyboardAction)), (action) => {
                    const shortcut = DEFAULT_SHORTCUTS.find((s) => s.action === action);
                    if (!shortcut) return;

                    const handler = new KeyboardHandler([shortcut]);
                    let callCount = 0;
                    handler.registerAction(action, () => {
                        callCount++;
                    });

                    handler.setState(shortcut.validStates[0]);
                    const event = new KeyboardEvent("keydown", {
                        key: shortcut.key,
                        ctrlKey: shortcut.ctrlKey,
                        shiftKey: shortcut.shiftKey,
                        altKey: shortcut.altKey,
                    });
                    Object.defineProperty(event, "target", { value: document.body });

                    handler.activate();
                    document.dispatchEvent(event);
                    expect(callCount).toBe(1);

                    handler.unregisterAction(action);
                    document.dispatchEvent(event);
                    expect(callCount).toBe(1);
                    handler.deactivate();
                }),
            );
        });
    });

    describe.skip("Accessibility", () => {
        // Feature: flashcard-modal-rewrite, Property 6: Accessibility Announcements
        test("state changes update ARIA attributes and announce to screen readers", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(ModalState.CARD_FRONT, ModalState.CARD_BACK),
                    fc.string({ minLength: 5, maxLength: 100 }),
                    fc.string({ minLength: 5, maxLength: 100 }),
                    async (state, frontText, backText) => {
                        const container = document.createElement("div");
                        document.body.appendChild(container);

                        const mockRenderer = {
                            render: async (text: string, el: HTMLElement) => {
                                el.createDiv().setText(text);
                            },
                        };

                        const mockApp = {} as any;
                        const cardView = new CardView(mockApp, container, mockRenderer as any);

                        const mockCard = {
                            questionType: 1,
                            question: {
                                note: { file: { basename: "test" }, filePath: "test.md" },
                                questionText: { textDirection: 0 },
                                questionContext: [],
                                topicPathList: { list: [] },
                                cards: [],
                            },
                            front: frontText,
                            back: backText,
                        } as any;

                        if (state === ModalState.CARD_FRONT) {
                            await cardView.renderFront(mockCard);
                            const announcer = container.querySelector(".sr-aria-live");
                            expect(announcer).not.toBeNull();
                            expect(announcer?.getAttribute("aria-live")).toBe("polite");
                            expect(announcer?.textContent).toContain(frontText);
                        } else {
                            await cardView.renderBack(mockCard);
                            const announcer = container.querySelector(".sr-aria-live");
                            expect(announcer).not.toBeNull();
                            expect(announcer?.getAttribute("aria-live")).toBe("assertive");
                            expect(announcer?.textContent).toContain(backText);
                        }

                        const responses = container.querySelectorAll(
                            '[role="group"][aria-label="Review response buttons"]',
                        );
                        expect(responses.length).toBeGreaterThan(0);

                        document.body.removeChild(container);
                    },
                ),
                { numRuns: 10 },
            );
        });
    });
});
