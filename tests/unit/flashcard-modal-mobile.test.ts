import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
    ResponsiveLayout,
    DeviceType,
    DEFAULT_BREAKPOINTS,
} from "../../src/gui/flashcard-modal-rewrite/utils/ResponsiveLayout";

/**
 * Property-based tests for mobile responsive layout
 * Requirements: 12.1, 12.2
 */

describe("Mobile Responsive Layout", () => {
    let responsiveLayout: ResponsiveLayout;
    let originalInnerWidth: number;

    beforeEach(() => {
        // Store original window width
        originalInnerWidth = window.innerWidth;

        // Create fresh instance
        responsiveLayout = new ResponsiveLayout();
    });

    afterEach(() => {
        // Cleanup
        responsiveLayout.stopListening();

        // Restore original window width
        Object.defineProperty(window, "innerWidth", {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });
    });

    /**
     * Property 31: Mobile Touch Target Sizing
     * Touch targets on mobile devices should be at least 44x44 pixels
     * to ensure accessibility and usability (WCAG 2.1 Level AAA)
     */
    describe("Property 31: Mobile Touch Target Sizing", () => {
        test("Mobile touch targets are at least 44px", () => {
            // Simulate mobile viewport
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375, // iPhone SE width
            });

            const layout = new ResponsiveLayout();
            const touchTargetSize = layout.getTouchTargetSize();

            // WCAG 2.1 Level AAA requires minimum 44x44px
            expect(touchTargetSize).toBeGreaterThanOrEqual(44);
            expect(layout.isMobile()).toBe(true);
        });

        test("Desktop touch targets can be smaller than mobile", () => {
            // Simulate desktop viewport
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });

            const layout = new ResponsiveLayout();
            const touchTargetSize = layout.getTouchTargetSize();

            // Desktop can have smaller targets
            expect(touchTargetSize).toBeLessThan(44);
            expect(layout.isDesktop()).toBe(true);
        });

        test("Touch target size is consistent for same device type", () => {
            // Test multiple mobile widths
            const mobileWidths = [320, 375, 414, 767];
            const touchTargetSizes = mobileWidths.map((width) => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: width,
                });
                const layout = new ResponsiveLayout();
                return layout.getTouchTargetSize();
            });

            // All mobile devices should have same touch target size
            const allSame = touchTargetSizes.every((size) => size === touchTargetSizes[0]);
            expect(allSame).toBe(true);
            expect(touchTargetSizes[0]).toBe(44);
        });

        test("Touch target size respects custom breakpoints", () => {
            const customBreakpoints = {
                mobile: 600,
                tablet: 900,
                desktop: 900,
            };

            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 550, // Below custom mobile breakpoint
            });

            const layout = new ResponsiveLayout(customBreakpoints);
            expect(layout.isMobile()).toBe(true);
            expect(layout.getTouchTargetSize()).toBe(44);
        });
    });

    /**
     * Property 32: Responsive Layout Adaptation
     * The layout should automatically adapt to viewport changes
     * and notify listeners of device type changes
     */
    describe("Property 32: Responsive Layout Adaptation", () => {
        test("Device type detection is accurate for mobile", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });

            const layout = new ResponsiveLayout();
            expect(layout.getDeviceType()).toBe(DeviceType.MOBILE);
            expect(layout.isMobile()).toBe(true);
            expect(layout.isTablet()).toBe(false);
            expect(layout.isDesktop()).toBe(false);
        });

        test("Device type detection is accurate for tablet", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 800,
            });

            const layout = new ResponsiveLayout();
            expect(layout.getDeviceType()).toBe(DeviceType.TABLET);
            expect(layout.isMobile()).toBe(false);
            expect(layout.isTablet()).toBe(true);
            expect(layout.isDesktop()).toBe(false);
        });

        test("Device type detection is accurate for desktop", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });

            const layout = new ResponsiveLayout();
            expect(layout.getDeviceType()).toBe(DeviceType.DESKTOP);
            expect(layout.isMobile()).toBe(false);
            expect(layout.isTablet()).toBe(false);
            expect(layout.isDesktop()).toBe(true);
        });

        test("Breakpoint boundaries are handled correctly", () => {
            // Test exact breakpoint values
            const testCases = [
                { width: 767, expected: DeviceType.MOBILE },
                { width: 768, expected: DeviceType.TABLET },
                { width: 1023, expected: DeviceType.TABLET },
                { width: 1024, expected: DeviceType.DESKTOP },
            ];

            testCases.forEach(({ width, expected }) => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: width,
                });

                const layout = new ResponsiveLayout();
                expect(layout.getDeviceType()).toBe(expected);
            });
        });

        test("Layout notifies listeners on device type change", (done) => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920, // Start as desktop
            });

            const layout = new ResponsiveLayout();
            let notificationReceived = false;

            layout.onChange((deviceType) => {
                expect(deviceType).toBe(DeviceType.MOBILE);
                notificationReceived = true;
                done();
            });

            layout.startListening();

            // Simulate viewport resize to mobile
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });

            // Trigger resize event
            window.dispatchEvent(new Event("resize"));

            // Cleanup
            setTimeout(() => {
                layout.stopListening();
                if (!notificationReceived) {
                    done(new Error("Notification not received"));
                }
            }, 100);
        });

        test("Multiple listeners are all notified", async () => {
            // Start with desktop width BEFORE creating layout
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920, // Desktop width (well above 1024)
            });

            const layout = new ResponsiveLayout();
            const listener1 = mock(() => {});
            const listener2 = mock(() => {});
            const listener3 = mock(() => {});

            layout.onChange(listener1);
            layout.onChange(listener2);
            layout.onChange(listener3);

            layout.startListening();

            // Change to mobile width (this should trigger device type change)
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375, // Mobile width
            });

            // Trigger resize event
            window.dispatchEvent(new Event("resize"));

            // Give time for ResizeObserver and listeners to be called
            await new Promise((resolve) => setTimeout(resolve, 200));

            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
            expect(listener3).toHaveBeenCalled();
            layout.stopListening();
        });

        test("Listeners can be removed", () => {
            const layout = new ResponsiveLayout();
            const listener = mock(() => {});

            layout.onChange(listener);
            layout.offChange(listener);

            layout.startListening();

            // Simulate resize
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
            window.dispatchEvent(new Event("resize"));

            setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                layout.stopListening();
            }, 100);
        });
    });

    /**
     * Property 33: Font Size Adaptation
     * Font sizes should be larger on mobile for better readability
     */
    describe("Property 33: Font Size Adaptation", () => {
        test("Mobile has larger base font size than desktop", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
            const mobileLayout = new ResponsiveLayout();
            const mobileFonts = mobileLayout.getFontSize();

            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });
            const desktopLayout = new ResponsiveLayout();
            const desktopFonts = desktopLayout.getFontSize();

            expect(mobileFonts.base).toBeGreaterThan(desktopFonts.base);
            expect(mobileFonts.heading).toBeGreaterThan(desktopFonts.heading);
        });

        test("Font sizes are appropriate for each device type", () => {
            const testCases = [
                { width: 375, expectedBase: 16, expectedHeading: 20 },
                { width: 800, expectedBase: 15, expectedHeading: 19 },
                { width: 1920, expectedBase: 14, expectedHeading: 18 },
            ];

            testCases.forEach(({ width, expectedBase, expectedHeading }) => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: width,
                });

                const layout = new ResponsiveLayout();
                const fonts = layout.getFontSize();

                expect(fonts.base).toBe(expectedBase);
                expect(fonts.heading).toBe(expectedHeading);
            });
        });
    });

    /**
     * Property 34: Spacing Adaptation
     * Spacing should be larger on mobile for better touch interaction
     */
    describe("Property 34: Spacing Adaptation", () => {
        test("Mobile has larger spacing than desktop", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
            const mobileLayout = new ResponsiveLayout();
            const mobileSpacing = mobileLayout.getSpacing();

            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });
            const desktopLayout = new ResponsiveLayout();
            const desktopSpacing = desktopLayout.getSpacing();

            expect(mobileSpacing.small).toBeGreaterThan(desktopSpacing.small);
            expect(mobileSpacing.medium).toBeGreaterThan(desktopSpacing.medium);
            expect(mobileSpacing.large).toBeGreaterThan(desktopSpacing.large);
        });

        test("Spacing maintains proportional relationships", () => {
            const layout = new ResponsiveLayout();
            const spacing = layout.getSpacing();

            // Medium should be roughly 2x small
            expect(spacing.medium).toBeGreaterThanOrEqual(spacing.small * 1.5);

            // Large should be roughly 2x medium
            expect(spacing.large).toBeGreaterThanOrEqual(spacing.medium * 1.5);
        });
    });

    /**
     * Property 35: Touch Device Detection
     * The system should accurately detect touch-capable devices
     */
    describe("Property 35: Touch Device Detection", () => {
        test("Touch device detection works", () => {
            const layout = new ResponsiveLayout();
            const isTouchDevice = layout.isTouchDevice();

            // Should return a boolean
            expect(typeof isTouchDevice).toBe("boolean");
        });
    });

    /**
     * Property 36: Safe Area Insets
     * Safe area insets should be detected for devices with notches
     */
    describe("Property 36: Safe Area Insets", () => {
        test("Safe area insets are returned as numbers", () => {
            const layout = new ResponsiveLayout();
            const insets = layout.getSafeAreaInsets();

            expect(typeof insets.top).toBe("number");
            expect(typeof insets.right).toBe("number");
            expect(typeof insets.bottom).toBe("number");
            expect(typeof insets.left).toBe("number");
        });

        test("Safe area insets are non-negative", () => {
            const layout = new ResponsiveLayout();
            const insets = layout.getSafeAreaInsets();

            expect(insets.top).toBeGreaterThanOrEqual(0);
            expect(insets.right).toBeGreaterThanOrEqual(0);
            expect(insets.bottom).toBeGreaterThanOrEqual(0);
            expect(insets.left).toBeGreaterThanOrEqual(0);
        });
    });

    /**
     * Property 37: CSS Class Application
     * The correct CSS classes should be applied based on device type
     */
    describe("Property 37: CSS Class Application", () => {
        test("Mobile class is applied on mobile devices", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });

            const layout = new ResponsiveLayout();
            const element = document.createElement("div");

            layout.applyMobileStyles(element);

            expect(element.classList.contains("sr-modal-mobile")).toBe(true);
            expect(element.classList.contains("sr-modal-tablet")).toBe(false);
            expect(element.classList.contains("sr-modal-desktop")).toBe(false);
        });

        test("Tablet class is applied on tablet devices", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 800,
            });

            const layout = new ResponsiveLayout();
            const element = document.createElement("div");

            layout.applyMobileStyles(element);

            expect(element.classList.contains("sr-modal-mobile")).toBe(false);
            expect(element.classList.contains("sr-modal-tablet")).toBe(true);
            expect(element.classList.contains("sr-modal-desktop")).toBe(false);
        });

        test("Desktop class is applied on desktop devices", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });

            const layout = new ResponsiveLayout();
            const element = document.createElement("div");

            layout.applyMobileStyles(element);

            expect(element.classList.contains("sr-modal-mobile")).toBe(false);
            expect(element.classList.contains("sr-modal-tablet")).toBe(false);
            expect(element.classList.contains("sr-modal-desktop")).toBe(true);
        });

        test("Classes are updated when device type changes", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1920,
            });

            const layout = new ResponsiveLayout();
            const element = document.createElement("div");

            // Apply desktop styles
            layout.applyMobileStyles(element);
            expect(element.classList.contains("sr-modal-desktop")).toBe(true);

            // Change to mobile
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });

            const mobileLayout = new ResponsiveLayout();
            mobileLayout.applyMobileStyles(element);

            // Should now have mobile class
            expect(element.classList.contains("sr-modal-mobile")).toBe(true);
            expect(element.classList.contains("sr-modal-desktop")).toBe(false);
        });
    });
});
