/**
 * Touch gesture handler for mobile flashcard navigation
 * Requirements: 9.4, 12.3
 */

export enum SwipeDirection {
    LEFT = "left",
    RIGHT = "right",
    UP = "up",
    DOWN = "down",
}

export interface SwipeEvent {
    direction: SwipeDirection;
    distance: number;
    duration: number;
    velocity: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export interface GestureConfig {
    minSwipeDistance: number;
    maxSwipeTime: number;
    minSwipeVelocity: number;
    swipeThreshold: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
    minSwipeDistance: 50, // Minimum distance in pixels to register as swipe
    maxSwipeTime: 300, // Maximum time in ms for swipe
    minSwipeVelocity: 0.3, // Minimum velocity (px/ms)
    swipeThreshold: 30, // Threshold to distinguish horizontal vs vertical
};

export type SwipeCallback = (event: SwipeEvent) => void;

export class GestureHandler {
    private element: HTMLElement;
    private config: GestureConfig;

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;

    private touchEndX: number = 0;
    private touchEndY: number = 0;
    private touchEndTime: number = 0;

    private swipeCallbacks: Map<SwipeDirection, Set<SwipeCallback>> = new Map();
    private anySwipeCallbacks: Set<SwipeCallback> = new Set();

    private isActive: boolean = false;

    // Bound event handlers (to properly remove listeners)
    private boundHandleTouchStart: (event: TouchEvent) => void;
    private boundHandleTouchEnd: (event: TouchEvent) => void;
    private boundHandleTouchCancel: (event: TouchEvent) => void;

    constructor(element: HTMLElement, config: GestureConfig = DEFAULT_GESTURE_CONFIG) {
        this.element = element;
        this.config = config;

        // Bind event handlers once
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.boundHandleTouchCancel = this.handleTouchCancel.bind(this);

        // Initialize callback sets for each direction
        Object.values(SwipeDirection).forEach((direction) => {
            this.swipeCallbacks.set(direction, new Set());
        });
    }

    /**
     * Start listening for touch events
     */
    activate(): void {
        if (this.isActive) return;

        this.element.addEventListener("touchstart", this.boundHandleTouchStart, { passive: true });
        this.element.addEventListener("touchend", this.boundHandleTouchEnd, { passive: true });
        this.element.addEventListener("touchcancel", this.boundHandleTouchCancel, {
            passive: true,
        });

        this.isActive = true;
    }

    /**
     * Stop listening for touch events
     */
    deactivate(): void {
        if (!this.isActive) return;

        this.element.removeEventListener("touchstart", this.boundHandleTouchStart);
        this.element.removeEventListener("touchend", this.boundHandleTouchEnd);
        this.element.removeEventListener("touchcancel", this.boundHandleTouchCancel);

        this.isActive = false;
    }

    /**
     * Register a callback for a specific swipe direction
     */
    onSwipe(direction: SwipeDirection, callback: SwipeCallback): void {
        const callbacks = this.swipeCallbacks.get(direction);
        if (callbacks) {
            callbacks.add(callback);
        }
    }

    /**
     * Register a callback for any swipe direction
     */
    onAnySwipe(callback: SwipeCallback): void {
        this.anySwipeCallbacks.add(callback);
    }

    /**
     * Unregister a callback for a specific swipe direction
     */
    offSwipe(direction: SwipeDirection, callback: SwipeCallback): void {
        const callbacks = this.swipeCallbacks.get(direction);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Unregister a callback for any swipe
     */
    offAnySwipe(callback: SwipeCallback): void {
        this.anySwipeCallbacks.delete(callback);
    }

    /**
     * Handle touch start event
     */
    private handleTouchStart(event: TouchEvent): void {
        if (event.touches.length !== 1) return; // Only handle single touch

        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
    }

    /**
     * Handle touch end event
     */
    private handleTouchEnd(event: TouchEvent): void {
        if (event.changedTouches.length !== 1) return;

        const touch = event.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;
        this.touchEndTime = Date.now();

        this.detectSwipe();
    }

    /**
     * Handle touch cancel event
     */
    private handleTouchCancel(event: TouchEvent): void {
        // Reset touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.touchEndTime = 0;
    }

    /**
     * Detect and process swipe gesture
     */
    private detectSwipe(): void {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const duration = this.touchEndTime - this.touchStartTime;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / duration;

        console.log(`Detecting swipe: dist=${distance}, dur=${duration}, vel=${velocity}`);

        // Check if gesture meets minimum requirements
        if (distance < this.config.minSwipeDistance) {
            console.log(`Swipe too short: ${distance} < ${this.config.minSwipeDistance}`);
            return;
        }
        if (duration > this.config.maxSwipeTime) {
            console.log(`Swipe too slow: ${duration} > ${this.config.maxSwipeTime}`);
            return;
        }
        if (velocity < this.config.minSwipeVelocity) {
            console.log(`Velocity too low: ${velocity} < ${this.config.minSwipeVelocity}`);
            return;
        }

        // Determine swipe direction
        const direction = this.getSwipeDirection(deltaX, deltaY);
        if (!direction) return;

        // Create swipe event
        const swipeEvent: SwipeEvent = {
            direction,
            distance,
            duration,
            velocity,
            startX: this.touchStartX,
            startY: this.touchStartY,
            endX: this.touchEndX,
            endY: this.touchEndY,
        };

        // Notify callbacks
        this.notifyCallbacks(direction, swipeEvent);
    }

    /**
     * Determine swipe direction from deltas
     */
    private getSwipeDirection(deltaX: number, deltaY: number): SwipeDirection | null {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if swipe is more horizontal or vertical
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (absDeltaX < this.config.swipeThreshold) return null;
            return deltaX > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT;
        } else {
            // Vertical swipe
            if (absDeltaY < this.config.swipeThreshold) return null;
            return deltaY > 0 ? SwipeDirection.DOWN : SwipeDirection.UP;
        }
    }

    /**
     * Notify all registered callbacks
     */
    private notifyCallbacks(direction: SwipeDirection, event: SwipeEvent): void {
        // Notify direction-specific callbacks
        const callbacks = this.swipeCallbacks.get(direction);
        if (callbacks) {
            callbacks.forEach((callback) => callback(event));
        }

        // Notify any-swipe callbacks
        this.anySwipeCallbacks.forEach((callback) => callback(event));
    }

    /**
     * Clear all callbacks
     */
    clearCallbacks(): void {
        this.swipeCallbacks.forEach((callbacks) => callbacks.clear());
        this.anySwipeCallbacks.clear();
    }

    /**
     * Get current gesture configuration
     */
    getConfig(): GestureConfig {
        return { ...this.config };
    }

    /**
     * Update gesture configuration
     */
    updateConfig(config: Partial<GestureConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

/**
 * Helper function to create a gesture handler for common flashcard actions
 * Requirements: 9.4, 12.3
 */
export function createFlashcardGestureHandler(
    element: HTMLElement,
    actions: {
        onSwipeLeft?: () => void;
        onSwipeRight?: () => void;
        onSwipeUp?: () => void;
        onSwipeDown?: () => void;
    },
): GestureHandler {
    const handler = new GestureHandler(element);

    if (actions.onSwipeLeft) {
        handler.onSwipe(SwipeDirection.LEFT, () => actions.onSwipeLeft!());
    }

    if (actions.onSwipeRight) {
        handler.onSwipe(SwipeDirection.RIGHT, () => actions.onSwipeRight!());
    }

    if (actions.onSwipeUp) {
        handler.onSwipe(SwipeDirection.UP, () => actions.onSwipeUp!());
    }

    if (actions.onSwipeDown) {
        handler.onSwipe(SwipeDirection.DOWN, () => actions.onSwipeDown!());
    }

    handler.activate();

    return handler;
}
