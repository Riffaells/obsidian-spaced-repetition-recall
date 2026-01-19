/**
 * Safe Area Inset Support for Devices with Notches
 * Requirements: 12.5
 *
 * This module provides utilities for handling safe area insets on devices
 * with notches, rounded corners, or other display cutouts (e.g., iPhone X+, Android devices).
 */

/**
 * Apply safe area insets to a modal container
 *
 * This function ensures that the modal content is not obscured by device notches
 * or rounded corners by applying appropriate padding.
 *
 * @param element - The HTML element to apply safe area insets to
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const modalContainer = document.querySelector('.sr-flashcard-modal');
 * applySafeAreaInsets(modalContainer, { includeBottom: true });
 * ```
 */
export function applySafeAreaInsets(
    element: HTMLElement,
    options: {
        includeTop?: boolean;
        includeRight?: boolean;
        includeBottom?: boolean;
        includeLeft?: boolean;
        basePadding?: number;
    } = {},
): void {
    const {
        includeTop = true,
        includeRight = true,
        includeBottom = true,
        includeLeft = true,
        basePadding = 0,
    } = options;

    // Set CSS custom property for base padding
    element.style.setProperty("--base-padding", `${basePadding}px`);

    // Apply safe area insets using CSS environment variables
    if (includeTop) {
        element.style.paddingTop = `max(${basePadding}px, env(safe-area-inset-top))`;
    }
    if (includeRight) {
        element.style.paddingRight = `max(${basePadding}px, env(safe-area-inset-right))`;
    }
    if (includeBottom) {
        element.style.paddingBottom = `max(${basePadding}px, env(safe-area-inset-bottom))`;
    }
    if (includeLeft) {
        element.style.paddingLeft = `max(${basePadding}px, env(safe-area-inset-left))`;
    }

    // Add class for CSS targeting
    element.classList.add("sr-safe-area-applied");
}

/**
 * Get the current safe area inset values
 *
 * @returns Object with top, right, bottom, left inset values in pixels
 *
 * @example
 * ```typescript
 * const insets = getSafeAreaInsets();
 * console.log(`Top inset: ${insets.top}px`);
 * ```
 */
export function getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
} {
    const style = getComputedStyle(document.documentElement);

    return {
        top: parseSafeAreaValue(style.getPropertyValue("--safe-area-inset-top")),
        right: parseSafeAreaValue(style.getPropertyValue("--safe-area-inset-right")),
        bottom: parseSafeAreaValue(style.getPropertyValue("--safe-area-inset-bottom")),
        left: parseSafeAreaValue(style.getPropertyValue("--safe-area-inset-left")),
    };
}

/**
 * Parse safe area inset value from CSS
 */
function parseSafeAreaValue(value: string): number {
    if (!value) return 0;
    const parsed = parseInt(value.replace("px", ""));
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Check if the device has safe area insets (notch, rounded corners, etc.)
 *
 * @returns true if any safe area inset is greater than 0
 */
export function hasSafeAreaInsets(): boolean {
    const insets = getSafeAreaInsets();
    return insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0;
}

/**
 * Initialize safe area support in the document
 *
 * This should be called once when the application loads to set up
 * CSS custom properties for safe area insets.
 */
export function initializeSafeAreaSupport(): void {
    // Ensure viewport meta tag includes viewport-fit=cover
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

    if (!viewportMeta) {
        viewportMeta = document.createElement("meta");
        viewportMeta.name = "viewport";
        document.head.appendChild(viewportMeta);
    }

    // Add viewport-fit=cover if not present
    const currentContent = viewportMeta.content;
    if (!currentContent.includes("viewport-fit")) {
        viewportMeta.content = currentContent + ", viewport-fit=cover";
    }

    // Set CSS custom properties
    const style = document.createElement("style");
    style.textContent = `
        :root {
            --safe-area-inset-top: env(safe-area-inset-top, 0px);
            --safe-area-inset-right: env(safe-area-inset-right, 0px);
            --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-inset-left: env(safe-area-inset-left, 0px);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Apply safe area class to an element
 *
 * This adds a CSS class that applies safe area padding via CSS.
 * Use this for simpler cases where you don't need custom padding values.
 *
 * @param element - The element to apply the class to
 */
export function applySafeAreaClass(element: HTMLElement): void {
    element.classList.add("sr-modal-safe-area");
}

/**
 * Remove safe area support from an element
 *
 * @param element - The element to remove safe area support from
 */
export function removeSafeAreaSupport(element: HTMLElement): void {
    element.classList.remove("sr-safe-area-applied", "sr-modal-safe-area");
    element.style.removeProperty("padding-top");
    element.style.removeProperty("padding-right");
    element.style.removeProperty("padding-bottom");
    element.style.removeProperty("padding-left");
    element.style.removeProperty("--base-padding");
}

/**
 * Safe Area Inset Hook for monitoring changes
 *
 * Monitors safe area inset changes (e.g., when device orientation changes)
 * and calls the provided callback.
 */
export class SafeAreaMonitor {
    private observer: ResizeObserver | null = null;
    private callback: (insets: ReturnType<typeof getSafeAreaInsets>) => void;
    private lastInsets: ReturnType<typeof getSafeAreaInsets>;

    constructor(callback: (insets: ReturnType<typeof getSafeAreaInsets>) => void) {
        this.callback = callback;
        this.lastInsets = getSafeAreaInsets();
    }

    /**
     * Start monitoring safe area inset changes
     */
    start(): void {
        if (this.observer) return;

        // Monitor document.documentElement for changes
        this.observer = new ResizeObserver(() => {
            const currentInsets = getSafeAreaInsets();

            // Check if insets have changed
            if (
                currentInsets.top !== this.lastInsets.top ||
                currentInsets.right !== this.lastInsets.right ||
                currentInsets.bottom !== this.lastInsets.bottom ||
                currentInsets.left !== this.lastInsets.left
            ) {
                this.lastInsets = currentInsets;
                this.callback(currentInsets);
            }
        });

        this.observer.observe(document.documentElement);

        // Also listen for orientation changes
        window.addEventListener("orientationchange", this.handleOrientationChange.bind(this));
    }

    /**
     * Stop monitoring safe area inset changes
     */
    stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        window.removeEventListener("orientationchange", this.handleOrientationChange.bind(this));
    }

    private handleOrientationChange(): void {
        // Wait for orientation change to complete
        setTimeout(() => {
            const currentInsets = getSafeAreaInsets();
            this.lastInsets = currentInsets;
            this.callback(currentInsets);
        }, 100);
    }
}

/**
 * Utility to check if we're running on a device with a notch
 *
 * This is a heuristic check based on safe area insets.
 * Not 100% accurate but good enough for most cases.
 */
export function hasNotch(): boolean {
    const insets = getSafeAreaInsets();
    // Devices with notches typically have top inset > 20px
    return insets.top > 20;
}

/**
 * Get recommended padding for modal content based on safe areas
 *
 * @param basePadding - Base padding to use when no safe area insets
 * @returns Recommended padding values
 */
export function getRecommendedPadding(basePadding: number = 16): {
    top: number;
    right: number;
    bottom: number;
    left: number;
} {
    const insets = getSafeAreaInsets();

    return {
        top: Math.max(basePadding, insets.top),
        right: Math.max(basePadding, insets.right),
        bottom: Math.max(basePadding, insets.bottom),
        left: Math.max(basePadding, insets.left),
    };
}
