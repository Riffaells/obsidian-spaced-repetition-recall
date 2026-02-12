/**
 * Throttler utility for limiting the frequency of function execution.
 * Unlike debouncing, throttling ensures the function is called at most once per interval.
 * 
 * @example
 * ```typescript
 * const throttler = new Throttler(1000);
 * window.addEventListener('scroll', () => {
 *   throttler.run(() => console.log('Scrolled!'));
 * });
 * ```
 */
export class Throttler {
    private timeout: ReturnType<typeof setTimeout> | null = null;
    private lastRun: number = 0;
    private pendingFn: (() => void) | null = null;

    constructor(private interval: number) {}

    /**
     * Runs the provided function, throttled to the specified interval.
     * If called multiple times within the interval, only the first call executes immediately,
     * and the last call is scheduled to run after the interval.
     * 
     * @param fn - Function to execute
     */
    run(fn: () => void): void {
        const now = Date.now();
        const timeSinceLastRun = now - this.lastRun;

        if (timeSinceLastRun >= this.interval) {
            // Enough time has passed, execute immediately
            fn();
            this.lastRun = now;
            this.pendingFn = null;
        } else {
            // Too soon, schedule for later
            this.pendingFn = fn;
            if (!this.timeout) {
                const remainingTime = this.interval - timeSinceLastRun;
                this.timeout = setTimeout(() => {
                    if (this.pendingFn) {
                        this.pendingFn();
                        this.lastRun = Date.now();
                        this.pendingFn = null;
                    }
                    this.timeout = null;
                }, remainingTime);
            }
        }
    }

    /**
     * Cancels any pending throttled function execution.
     */
    cancel(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.pendingFn = null;
    }

    /**
     * Returns whether there is a pending throttled function.
     */
    isPending(): boolean {
        return this.pendingFn !== null;
    }

    /**
     * Resets the throttler state, allowing immediate execution on next call.
     */
    reset(): void {
        this.cancel();
        this.lastRun = 0;
    }
}

/**
 * Simple function throttling for single-use cases.
 * 
 * @example
 * ```typescript
 * const handleScroll = throttle(() => {
 *   console.log('Scrolled!');
 * }, 1000);
 * 
 * window.addEventListener('scroll', handleScroll);
 * ```
 */
export function throttle<T extends any[]>(
    fn: (...args: T) => void,
    interval: number,
): (...args: T) => void {
    let lastRun = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let pendingArgs: T | null = null;

    return (...args: T): void => {
        const now = Date.now();
        const timeSinceLastRun = now - lastRun;

        if (timeSinceLastRun >= interval) {
            fn(...args);
            lastRun = now;
            pendingArgs = null;
        } else {
            pendingArgs = args;
            if (!timeout) {
                const remainingTime = interval - timeSinceLastRun;
                timeout = setTimeout(() => {
                    if (pendingArgs) {
                        fn(...pendingArgs);
                        lastRun = Date.now();
                        pendingArgs = null;
                    }
                    timeout = null;
                }, remainingTime);
            }
        }
    };
}
