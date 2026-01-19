import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
    GestureHandler,
    SwipeDirection,
    SwipeEvent,
    DEFAULT_GESTURE_CONFIG,
} from "../../src/gui/flashcard-modal-rewrite/services/GestureHandler";

/**
 * Property-based tests for mobile gesture handling
 * Requirements: 9.4, 12.3
 */

describe("Mobile Gesture Handling", () => {
    let container: HTMLElement;
    let gestureHandler: GestureHandler;

    beforeEach(() => {
        // Create test container
        container = document.createElement("div");
        document.body.appendChild(container);

        // Create gesture handler
        gestureHandler = new GestureHandler(container);
    });

    afterEach(() => {
        // Cleanup
        gestureHandler.deactivate();
        gestureHandler.clearCallbacks();
        document.body.removeChild(container);
    });

    /**
     * Helper function to simulate touch events
     * Note: We dispatch events synchronously but manipulate timestamps
     * to simulate the passage of time for gesture detection
     */
    function simulateSwipe(
        element: HTMLElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        duration: number = 200,
    ): void {
        const startTime = Date.now();

        // Touch start
        const touchStart = new TouchEvent("touchstart", {
            touches: [
                new Touch({
                    identifier: 0,
                    target: element,
                    clientX: startX,
                    clientY: startY,
                    screenX: startX,
                    screenY: startY,
                    pageX: startX,
                    pageY: startY,
                    radiusX: 0,
                    radiusY: 0,
                    rotationAngle: 0,
                    force: 1,
                }),
            ],
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(touchStart);

        // Mock Date.now() to simulate time passing
        const originalDateNow = Date.now;
        Date.now = () => startTime + duration;

        // Touch end (dispatched synchronously but with mocked time)
        const touchEnd = new TouchEvent("touchend", {
            changedTouches: [
                new Touch({
                    identifier: 0,
                    target: element,
                    clientX: endX,
                    clientY: endY,
                    screenX: endX,
                    screenY: endY,
                    pageX: endX,
                    pageY: endY,
                    radiusX: 0,
                    radiusY: 0,
                    rotationAngle: 0,
                    force: 1,
                }),
            ],
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(touchEnd);

        // Restore Date.now()
        Date.now = originalDateNow;
    }

    /**
     * Property 21: Mobile Swipe Gesture Support
     * Swipe gestures should be detected accurately based on:
     * - Direction (left, right, up, down)
     * - Minimum distance threshold
     * - Maximum time threshold
     * - Minimum velocity threshold
     */
    describe("Property 21: Mobile Swipe Gesture Support", () => {
        test("Right swipe is detected correctly", () => {
            let eventReceived: SwipeEvent | null = null;
            const callback = mock((event: SwipeEvent) => {
                eventReceived = event;
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            // Simulate right swipe (100px to the right)
            simulateSwipe(container, 100, 200, 250, 200, 150);

            // Check that callback was called
            expect(callback).toHaveBeenCalled();
            expect(eventReceived).toBeTruthy();
            expect(eventReceived?.direction).toBe(SwipeDirection.RIGHT);
            expect(eventReceived?.distance).toBeGreaterThan(
                DEFAULT_GESTURE_CONFIG.minSwipeDistance,
            );
        });

        test("Left swipe is detected correctly", (done) => {
            const callback = mock((event: SwipeEvent) => {
                expect(event.direction).toBe(SwipeDirection.LEFT);
                expect(event.distance).toBeGreaterThan(DEFAULT_GESTURE_CONFIG.minSwipeDistance);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.LEFT, callback);
            gestureHandler.activate();

            // Simulate left swipe (100px to the left)
            simulateSwipe(container, 250, 200, 100, 200, 150);
        });

        test("Up swipe is detected correctly", (done) => {
            const callback = mock((event: SwipeEvent) => {
                expect(event.direction).toBe(SwipeDirection.UP);
                expect(event.distance).toBeGreaterThan(DEFAULT_GESTURE_CONFIG.minSwipeDistance);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.UP, callback);
            gestureHandler.activate();

            // Simulate up swipe (100px upward)
            simulateSwipe(container, 200, 300, 200, 150, 150);
        });

        test("Down swipe is detected correctly", (done) => {
            const callback = mock((event: SwipeEvent) => {
                expect(event.direction).toBe(SwipeDirection.DOWN);
                expect(event.distance).toBeGreaterThan(DEFAULT_GESTURE_CONFIG.minSwipeDistance);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.DOWN, callback);
            gestureHandler.activate();

            // Simulate down swipe (100px downward)
            simulateSwipe(container, 200, 150, 200, 300, 150);
        });

        test("Short swipes are ignored", (done) => {
            const callback = mock(() => {
                done(new Error("Callback should not be called for short swipe"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            // Simulate short swipe (only 30px)
            simulateSwipe(container, 100, 200, 130, 200, 150);

            // Wait to ensure callback is not called
            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });

        test("Slow swipes are ignored", (done) => {
            const callback = mock(() => {
                done(new Error("Callback should not be called for slow swipe"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            // Simulate slow swipe (400ms, exceeds maxSwipeTime)
            simulateSwipe(container, 100, 200, 250, 200, 400);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 500);
        });

        test("Swipe velocity is calculated correctly", (done) => {
            const callback = mock((event: SwipeEvent) => {
                // Velocity should be distance / duration
                const expectedVelocity = event.distance / event.duration;
                expect(Math.abs(event.velocity - expectedVelocity)).toBeLessThan(0.01);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);
        });
    });

    /**
     * Property 33: Mobile Navigation Gestures
     * Gestures should trigger appropriate navigation actions:
     * - Multiple callbacks can be registered
     * - Callbacks can be removed
     * - Any-swipe callbacks receive all swipe events
     */
    describe("Property 33: Mobile Navigation Gestures", () => {
        test("Multiple callbacks for same direction are all called", (done) => {
            let callCount = 0;
            const callback1 = mock(() => callCount++);
            const callback2 = mock(() => callCount++);
            const callback3 = mock(() => callCount++);

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback1);
            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback2);
            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback3);
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callCount).toBe(3);
                expect(callback1).toHaveBeenCalled();
                expect(callback2).toHaveBeenCalled();
                expect(callback3).toHaveBeenCalled();
                done();
            }, 300);
        });

        test("Removed callbacks are not called", (done) => {
            const callback = mock(() => {
                done(new Error("Removed callback should not be called"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.offSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });

        test("Any-swipe callback receives all swipe directions", (done) => {
            const directions: SwipeDirection[] = [];
            const callback = mock((event: SwipeEvent) => {
                directions.push(event.direction);
            });

            gestureHandler.onAnySwipe(callback);
            gestureHandler.activate();

            // Simulate swipes in all directions
            simulateSwipe(container, 200, 200, 350, 200, 150); // Right
            setTimeout(() => {
                simulateSwipe(container, 350, 200, 200, 200, 150); // Left
            }, 200);
            setTimeout(() => {
                simulateSwipe(container, 200, 300, 200, 150, 150); // Up
            }, 400);
            setTimeout(() => {
                simulateSwipe(container, 200, 150, 200, 300, 150); // Down
            }, 600);

            setTimeout(() => {
                expect(directions.length).toBe(4);
                expect(directions).toContain(SwipeDirection.RIGHT);
                expect(directions).toContain(SwipeDirection.LEFT);
                expect(directions).toContain(SwipeDirection.UP);
                expect(directions).toContain(SwipeDirection.DOWN);
                done();
            }, 1000);
        });

        test("Clear callbacks removes all callbacks", (done) => {
            const callback1 = mock(() => {
                done(new Error("Callback should not be called after clear"));
            });
            const callback2 = mock(() => {
                done(new Error("Callback should not be called after clear"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback1);
            gestureHandler.onAnySwipe(callback2);
            gestureHandler.clearCallbacks();
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callback1).not.toHaveBeenCalled();
                expect(callback2).not.toHaveBeenCalled();
                done();
            }, 300);
        });
    });

    /**
     * Property 38: Gesture Configuration
     * Gesture detection parameters should be configurable
     */
    describe("Property 38: Gesture Configuration", () => {
        test("Custom gesture config is applied", () => {
            const customConfig = {
                minSwipeDistance: 100,
                maxSwipeTime: 500,
                minSwipeVelocity: 0.5,
                swipeThreshold: 50,
            };

            const customHandler = new GestureHandler(container, customConfig);
            const config = customHandler.getConfig();

            expect(config.minSwipeDistance).toBe(100);
            expect(config.maxSwipeTime).toBe(500);
            expect(config.minSwipeVelocity).toBe(0.5);
            expect(config.swipeThreshold).toBe(50);

            customHandler.deactivate();
        });

        test("Config can be updated after creation", () => {
            gestureHandler.updateConfig({
                minSwipeDistance: 75,
            });

            const config = gestureHandler.getConfig();
            expect(config.minSwipeDistance).toBe(75);
            // Other values should remain default
            expect(config.maxSwipeTime).toBe(DEFAULT_GESTURE_CONFIG.maxSwipeTime);
        });

        test("Swipe with custom distance threshold is respected", (done) => {
            gestureHandler.updateConfig({
                minSwipeDistance: 200, // Require 200px minimum
            });

            const callback = mock(() => {
                done(new Error("Callback should not be called for swipe below threshold"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            // Simulate swipe of only 150px (below new threshold)
            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });
    });

    /**
     * Property 39: Gesture Lifecycle
     * Gesture handler should properly manage activation/deactivation
     */
    describe("Property 39: Gesture Lifecycle", () => {
        test("Inactive handler does not detect gestures", (done) => {
            const callback = mock(() => {
                done(new Error("Inactive handler should not detect gestures"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            // Don't activate handler

            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });

        test("Deactivated handler stops detecting gestures", (done) => {
            const callback = mock(() => {
                done(new Error("Deactivated handler should not detect gestures"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();
            gestureHandler.deactivate();

            simulateSwipe(container, 100, 200, 250, 200, 150);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });

        test("Handler can be reactivated after deactivation", (done) => {
            const callback = mock((event: SwipeEvent) => {
                expect(event.direction).toBe(SwipeDirection.RIGHT);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();
            gestureHandler.deactivate();
            gestureHandler.activate(); // Reactivate

            simulateSwipe(container, 100, 200, 250, 200, 150);
        });
    });

    /**
     * Property 40: Multi-touch Handling
     * Handler should only respond to single-touch gestures
     */
    describe("Property 40: Multi-touch Handling", () => {
        test("Multi-touch gestures are ignored", (done) => {
            const callback = mock(() => {
                done(new Error("Multi-touch gesture should be ignored"));
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            // Simulate multi-touch (2 fingers)
            const multiTouch = new TouchEvent("touchstart", {
                touches: [
                    new Touch({
                        identifier: 0,
                        target: container,
                        clientX: 100,
                        clientY: 200,
                        screenX: 100,
                        screenY: 200,
                        pageX: 100,
                        pageY: 200,
                        radiusX: 0,
                        radiusY: 0,
                        rotationAngle: 0,
                        force: 1,
                    }),
                    new Touch({
                        identifier: 1,
                        target: container,
                        clientX: 150,
                        clientY: 200,
                        screenX: 150,
                        screenY: 200,
                        pageX: 150,
                        pageY: 200,
                        radiusX: 0,
                        radiusY: 0,
                        rotationAngle: 0,
                        force: 1,
                    }),
                ],
                bubbles: true,
                cancelable: true,
            });
            container.dispatchEvent(multiTouch);

            setTimeout(() => {
                expect(callback).not.toHaveBeenCalled();
                done();
            }, 300);
        });
    });

    /**
     * Property 41: Swipe Event Data
     * Swipe events should contain accurate data
     */
    describe("Property 41: Swipe Event Data", () => {
        test("Swipe event contains all required data", (done) => {
            const callback = mock((event: SwipeEvent) => {
                expect(event.direction).toBeDefined();
                expect(event.distance).toBeGreaterThan(0);
                expect(event.duration).toBeGreaterThan(0);
                expect(event.velocity).toBeGreaterThan(0);
                expect(event.startX).toBe(100);
                expect(event.startY).toBe(200);
                expect(event.endX).toBe(250);
                expect(event.endY).toBe(200);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);
        });

        test("Distance is calculated correctly", (done) => {
            const callback = mock((event: SwipeEvent) => {
                const deltaX = event.endX - event.startX;
                const deltaY = event.endY - event.startY;
                const expectedDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                expect(Math.abs(event.distance - expectedDistance)).toBeLessThan(0.01);
                done();
            });

            gestureHandler.onSwipe(SwipeDirection.RIGHT, callback);
            gestureHandler.activate();

            simulateSwipe(container, 100, 200, 250, 200, 150);
        });
    });
});
