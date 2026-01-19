/**
 * Mobile responsive utilities for the flashcard modal
 * Requirements: 12.1, 12.2
 */

export interface BreakpointConfig {
    mobile: number;
    tablet: number;
    desktop: number;
}

export const DEFAULT_BREAKPOINTS: BreakpointConfig = {
    mobile: 768, // Below this is mobile
    tablet: 1024, // Between mobile and desktop
    desktop: 1024, // Above this is desktop
};

export enum DeviceType {
    MOBILE = "mobile",
    TABLET = "tablet",
    DESKTOP = "desktop",
}

export class ResponsiveLayout {
    private breakpoints: BreakpointConfig;
    private currentDeviceType: DeviceType;
    private resizeObserver: ResizeObserver | null = null;
    private callbacks: Set<(deviceType: DeviceType) => void> = new Set();
    private boundHandleResize: () => void;

    constructor(breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS) {
        this.breakpoints = breakpoints;
        this.currentDeviceType = this.detectDeviceType();
        this.boundHandleResize = this.handleResize.bind(this);
    }

    /**
     * Detect the current device type based on viewport width
     */
    private detectDeviceType(): DeviceType {
        const width = window.innerWidth;

        if (width < this.breakpoints.mobile) {
            return DeviceType.MOBILE;
        } else if (width < this.breakpoints.desktop) {
            return DeviceType.TABLET;
        } else {
            return DeviceType.DESKTOP;
        }
    }

    /**
     * Get the current device type
     */
    getDeviceType(): DeviceType {
        return this.currentDeviceType;
    }

    /**
     * Check if current device is mobile
     */
    isMobile(): boolean {
        return this.currentDeviceType === DeviceType.MOBILE;
    }

    /**
     * Check if current device is tablet
     */
    isTablet(): boolean {
        return this.currentDeviceType === DeviceType.TABLET;
    }

    /**
     * Check if current device is desktop
     */
    isDesktop(): boolean {
        return this.currentDeviceType === DeviceType.DESKTOP;
    }

    /**
     * Start listening for viewport changes
     */
    startListening(): void {
        if (this.resizeObserver) {
            return; // Already listening
        }

        // Use ResizeObserver for better performance
        this.resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });

        this.resizeObserver.observe(document.body);

        // Also listen to window resize as fallback
        window.addEventListener("resize", this.boundHandleResize);
    }

    /**
     * Stop listening for viewport changes
     */
    stopListening(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        window.removeEventListener("resize", this.boundHandleResize);
    }

    /**
     * Handle viewport resize
     */
    private handleResize(): void {
        const newDeviceType = this.detectDeviceType();

        if (newDeviceType !== this.currentDeviceType) {
            this.currentDeviceType = newDeviceType;
            this.notifyCallbacks(newDeviceType);
        }
    }

    /**
     * Register a callback for device type changes
     */
    onChange(callback: (deviceType: DeviceType) => void): void {
        this.callbacks.add(callback);
    }

    /**
     * Unregister a callback
     */
    offChange(callback: (deviceType: DeviceType) => void): void {
        this.callbacks.delete(callback);
    }

    /**
     * Notify all registered callbacks
     */
    private notifyCallbacks(deviceType: DeviceType): void {
        this.callbacks.forEach((callback) => callback(deviceType));
    }

    /**
     * Apply mobile-specific styles to an element
     */
    applyMobileStyles(element: HTMLElement): void {
        if (this.isMobile()) {
            element.addClass("sr-modal-mobile");
            element.removeClass("sr-modal-tablet", "sr-modal-desktop");
        } else if (this.isTablet()) {
            element.addClass("sr-modal-tablet");
            element.removeClass("sr-modal-mobile", "sr-modal-desktop");
        } else {
            element.addClass("sr-modal-desktop");
            element.removeClass("sr-modal-mobile", "sr-modal-tablet");
        }
    }

    /**
     * Get recommended touch target size for current device
     * Requirements: 12.1 - Touch targets should be at least 44x44px on mobile
     */
    getTouchTargetSize(): number {
        return this.isMobile() ? 44 : 32;
    }

    /**
     * Get recommended font size for current device
     */
    getFontSize(): { base: number; heading: number } {
        if (this.isMobile()) {
            return { base: 16, heading: 20 };
        } else if (this.isTablet()) {
            return { base: 15, heading: 19 };
        } else {
            return { base: 14, heading: 18 };
        }
    }

    /**
     * Get recommended spacing for current device
     */
    getSpacing(): { small: number; medium: number; large: number } {
        if (this.isMobile()) {
            return { small: 8, medium: 16, large: 24 };
        } else if (this.isTablet()) {
            return { small: 6, medium: 12, large: 20 };
        } else {
            return { small: 4, medium: 8, large: 16 };
        }
    }

    /**
     * Check if device supports touch
     */
    isTouchDevice(): boolean {
        return (
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator.msMaxTouchPoints ?? 0) > 0
        );
    }

    /**
     * Get safe area insets for devices with notches
     * Requirements: 12.5
     */
    getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
        const style = getComputedStyle(document.documentElement);

        return {
            top: parseInt(style.getPropertyValue("--safe-area-inset-top") || "0"),
            right: parseInt(style.getPropertyValue("--safe-area-inset-right") || "0"),
            bottom: parseInt(style.getPropertyValue("--safe-area-inset-bottom") || "0"),
            left: parseInt(style.getPropertyValue("--safe-area-inset-left") || "0"),
        };
    }

    /**
     * Apply safe area padding to an element
     */
    applySafeAreaPadding(element: HTMLElement): void {
        const insets = this.getSafeAreaInsets();

        element.style.paddingTop = `calc(var(--base-padding, 0px) + ${insets.top}px)`;
        element.style.paddingRight = `calc(var(--base-padding, 0px) + ${insets.right}px)`;
        element.style.paddingBottom = `calc(var(--base-padding, 0px) + ${insets.bottom}px)`;
        element.style.paddingLeft = `calc(var(--base-padding, 0px) + ${insets.left}px)`;
    }
}
