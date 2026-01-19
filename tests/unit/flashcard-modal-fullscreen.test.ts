/**
 * Property-Based Tests for Fullscreen Mode
 *
 * Feature: flashcard-modal-rewrite
 *
 * These tests validate the correctness properties for fullscreen mode:
 * - Property 54: Fullscreen Mode Toggle
 * - Property 55: Fullscreen Preference Persistence
 * - Property 56: Fullscreen Exit Restoration
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { FullscreenToggle } from "../../src/gui/flashcard-modal-rewrite/components/FullscreenToggle";
import * as fc from "fast-check";

// Mock sessionStorage for tests
class MockStorage implements Storage {
    private store: Map<string, string> = new Map();

    get length(): number {
        return this.store.size;
    }

    clear(): void {
        this.store.clear();
    }

    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
        const keys = Array.from(this.store.keys());
        return keys[index] ?? null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
}

// Set up mock sessionStorage
(global as any).sessionStorage = new MockStorage();

describe("Fullscreen Mode Property Tests", () => {
    let modalElement: HTMLElement;
    let buttonElement: HTMLButtonElement;
    let fullscreenToggle: FullscreenToggle;

    beforeEach(() => {
        // Create mock DOM elements
        modalElement = document.createElement("div");
        modalElement.style.width = "80vw";
        modalElement.style.height = "80vh";
        modalElement.style.maxWidth = "1000px";
        modalElement.style.maxHeight = "800px";

        buttonElement = document.createElement("button");

        // Clear session storage before each test
        sessionStorage.clear();
    });

    afterEach(() => {
        if (fullscreenToggle) {
            fullscreenToggle.destroy();
        }
        sessionStorage.clear();
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 54: Fullscreen Mode Toggle
     *
     * For any modal state, clicking the fullscreen button SHALL toggle between
     * fullscreen and normal mode, applying the appropriate dimensions and CSS classes.
     *
     * Validates: Requirements 18.1, 18.2, 18.3
     */
    test("Property 54: toggling fullscreen applies correct dimensions and CSS classes", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }), // Number of toggles
                (numToggles) => {
                    // Clear session storage for this test iteration
                    sessionStorage.clear();

                    // Create fresh elements for this iteration
                    const testModalElement = document.createElement("div");
                    testModalElement.style.width = "80vw";
                    testModalElement.style.height = "80vh";
                    testModalElement.style.maxWidth = "1000px";
                    testModalElement.style.maxHeight = "800px";
                    const testButtonElement = document.createElement("button");

                    // Initialize fullscreen toggle
                    const testFullscreenToggle = new FullscreenToggle(
                        testModalElement,
                        testButtonElement,
                    );

                    // Track expected state
                    let expectedFullscreen = false;

                    // Perform toggles
                    for (let i = 0; i < numToggles; i++) {
                        testFullscreenToggle.toggleFullscreen();
                        expectedFullscreen = !expectedFullscreen;

                        // Verify state
                        expect(testFullscreenToggle.isFullscreen()).toBe(expectedFullscreen);

                        if (expectedFullscreen) {
                            // Verify fullscreen dimensions (Requirements 18.2)
                            expect(testModalElement.style.width).toBe("100vw");
                            expect(testModalElement.style.height).toBe("100vh");
                            expect(testModalElement.style.maxWidth).toBe("100vw");
                            expect(testModalElement.style.maxHeight).toBe("100vh");

                            // Verify fullscreen CSS class (Requirements 18.3)
                            expect(testModalElement.classList.contains("sr-modal-fullscreen")).toBe(
                                true,
                            );

                            // Verify button icon changed
                            expect(testButtonElement.getAttribute("aria-label")).toBe(
                                "Exit Fullscreen",
                            );
                        } else {
                            // Verify normal mode - CSS class removed
                            expect(testModalElement.classList.contains("sr-modal-fullscreen")).toBe(
                                false,
                            );

                            // Verify button icon changed back
                            expect(testButtonElement.getAttribute("aria-label")).toBe(
                                "Enter Fullscreen",
                            );
                        }
                    }

                    // Final state should match expected
                    expect(testFullscreenToggle.isFullscreen()).toBe(expectedFullscreen);

                    // Cleanup
                    testFullscreenToggle.destroy();
                    sessionStorage.clear();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 55: Fullscreen Preference Persistence
     *
     * For any fullscreen mode change, the preference SHALL be stored in session storage
     * and restored when reopening the modal in the same session.
     *
     * Validates: Requirements 18.4
     */
    test("Property 55: fullscreen preference persists across modal reopens", () => {
        fc.assert(
            fc.property(
                fc.boolean(), // Initial fullscreen state
                fc.integer({ min: 1, max: 5 }), // Number of reopen cycles
                (initialFullscreen, numReopens) => {
                    // Clear session storage for this test iteration
                    sessionStorage.clear();

                    // Create fresh elements for first instance
                    let testModalElement = document.createElement("div");
                    testModalElement.style.width = "80vw";
                    testModalElement.style.height = "80vh";
                    testModalElement.style.maxWidth = "1000px";
                    testModalElement.style.maxHeight = "800px";
                    let testButtonElement = document.createElement("button");

                    // First instance - set initial state
                    let testFullscreenToggle = new FullscreenToggle(
                        testModalElement,
                        testButtonElement,
                    );

                    if (initialFullscreen) {
                        testFullscreenToggle.enterFullscreen();
                    }

                    // Verify state is saved
                    const savedState = sessionStorage.getItem("sr-modal-fullscreen-preference");
                    expect(savedState).toBe(initialFullscreen.toString());

                    // Destroy and recreate multiple times
                    for (let i = 0; i < numReopens; i++) {
                        testFullscreenToggle.destroy();

                        // Create new instance (simulating modal reopen)
                        testModalElement = document.createElement("div");
                        // Set initial dimensions like a real modal would have
                        testModalElement.style.width = "80vw";
                        testModalElement.style.height = "80vh";
                        testModalElement.style.maxWidth = "1000px";
                        testModalElement.style.maxHeight = "800px";
                        testButtonElement = document.createElement("button");

                        testFullscreenToggle = new FullscreenToggle(
                            testModalElement,
                            testButtonElement,
                        );

                        // Verify state was restored (Requirements 18.4)
                        expect(testFullscreenToggle.isFullscreen()).toBe(initialFullscreen);

                        if (initialFullscreen) {
                            expect(testModalElement.classList.contains("sr-modal-fullscreen")).toBe(
                                true,
                            );
                            expect(testModalElement.style.width).toBe("100vw");
                        } else {
                            expect(testModalElement.classList.contains("sr-modal-fullscreen")).toBe(
                                false,
                            );
                        }
                    }

                    // Cleanup
                    testFullscreenToggle.destroy();
                    sessionStorage.clear();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 56: Fullscreen Exit Restoration
     *
     * For any fullscreen exit, the modal SHALL restore the previous size configuration
     * (width and height percentages).
     *
     * Validates: Requirements 18.5
     */
    test("Property 56: exiting fullscreen restores original dimensions", () => {
        fc.assert(
            fc.property(
                fc.record({
                    width: fc.constantFrom("70vw", "80vw", "90vw", "600px", "800px"),
                    height: fc.constantFrom("70vh", "80vh", "90vh", "500px", "700px"),
                    maxWidth: fc.constantFrom("900px", "1000px", "1200px", "none"),
                    maxHeight: fc.constantFrom("700px", "800px", "900px", "none"),
                }),
                (originalDimensions) => {
                    // Set original dimensions
                    modalElement.style.width = originalDimensions.width;
                    modalElement.style.height = originalDimensions.height;
                    modalElement.style.maxWidth = originalDimensions.maxWidth;
                    modalElement.style.maxHeight = originalDimensions.maxHeight;

                    // Initialize fullscreen toggle (stores original dimensions)
                    fullscreenToggle = new FullscreenToggle(modalElement, buttonElement);

                    // Enter fullscreen
                    fullscreenToggle.enterFullscreen();

                    // Verify fullscreen dimensions
                    expect(modalElement.style.width).toBe("100vw");
                    expect(modalElement.style.height).toBe("100vh");

                    // Exit fullscreen
                    fullscreenToggle.exitFullscreen();

                    // Verify original dimensions are restored (Requirements 18.5)
                    expect(modalElement.style.width).toBe(originalDimensions.width);
                    expect(modalElement.style.height).toBe(originalDimensions.height);
                    expect(modalElement.style.maxWidth).toBe(originalDimensions.maxWidth);
                    expect(modalElement.style.maxHeight).toBe(originalDimensions.maxHeight);

                    // Verify CSS class is removed
                    expect(modalElement.classList.contains("sr-modal-fullscreen")).toBe(false);

                    // Cleanup
                    fullscreenToggle.destroy();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Additional test: Fullscreen callback notification
     *
     * Verifies that the fullscreen change callback is invoked with correct state
     */
    test("fullscreen change callback is invoked with correct state", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5 }), // Number of toggles
                (numToggles) => {
                    // Clear session storage for this test iteration
                    sessionStorage.clear();

                    // Create fresh elements for this iteration
                    const testModalElement = document.createElement("div");
                    testModalElement.style.width = "80vw";
                    testModalElement.style.height = "80vh";
                    testModalElement.style.maxWidth = "1000px";
                    testModalElement.style.maxHeight = "800px";
                    const testButtonElement = document.createElement("button");

                    const testFullscreenToggle = new FullscreenToggle(
                        testModalElement,
                        testButtonElement,
                    );

                    const callbackStates: boolean[] = [];

                    // Register callback
                    testFullscreenToggle.onFullscreenChange((isFullscreen) => {
                        callbackStates.push(isFullscreen);
                    });

                    // Perform toggles
                    let expectedState = false;
                    for (let i = 0; i < numToggles; i++) {
                        testFullscreenToggle.toggleFullscreen();
                        expectedState = !expectedState;
                    }

                    // Verify callback was called correct number of times
                    expect(callbackStates.length).toBe(numToggles);

                    // Verify callback states alternate correctly
                    for (let i = 0; i < callbackStates.length; i++) {
                        const expectedCallbackState = i % 2 === 0; // true, false, true, false...
                        expect(callbackStates[i]).toBe(expectedCallbackState);
                    }

                    // Cleanup
                    testFullscreenToggle.destroy();
                    sessionStorage.clear();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Additional test: Fullscreen state consistency
     *
     * Verifies that isFullscreen() always returns consistent state with DOM
     */
    test("isFullscreen() state is consistent with DOM state", () => {
        fc.assert(
            fc.property(
                fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // Sequence of enter/exit operations
                (operations) => {
                    fullscreenToggle = new FullscreenToggle(modalElement, buttonElement);

                    for (const shouldBeFullscreen of operations) {
                        if (shouldBeFullscreen) {
                            fullscreenToggle.enterFullscreen();
                        } else {
                            fullscreenToggle.exitFullscreen();
                        }

                        // Verify consistency between isFullscreen() and DOM state
                        const hasClass = modalElement.classList.contains("sr-modal-fullscreen");
                        const isFullscreenState = fullscreenToggle.isFullscreen();

                        expect(isFullscreenState).toBe(hasClass);
                        expect(isFullscreenState).toBe(shouldBeFullscreen);
                    }

                    // Cleanup
                    fullscreenToggle.destroy();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Additional test: Destroy cleanup
     *
     * Verifies that destroy() properly exits fullscreen and cleans up
     */
    test("destroy exits fullscreen and cleans up properly", () => {
        fc.assert(
            fc.property(
                fc.boolean(), // Whether to be in fullscreen when destroying
                (startInFullscreen) => {
                    fullscreenToggle = new FullscreenToggle(modalElement, buttonElement);

                    if (startInFullscreen) {
                        fullscreenToggle.enterFullscreen();
                        expect(fullscreenToggle.isFullscreen()).toBe(true);
                    }

                    // Destroy
                    fullscreenToggle.destroy();

                    // Verify fullscreen is exited
                    expect(modalElement.classList.contains("sr-modal-fullscreen")).toBe(false);

                    // Verify callback is cleared (no error when calling)
                    expect(() => {
                        fullscreenToggle.onFullscreenChange(() => {});
                    }).not.toThrow();
                },
            ),
            { numRuns: 100 },
        );
    });
});
