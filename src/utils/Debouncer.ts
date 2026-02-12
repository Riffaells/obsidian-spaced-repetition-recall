/**
 * Debouncer utility for delaying function execution until after a specified delay.
 * Useful for optimizing performance by reducing the frequency of expensive operations.
 * 
 * @example
 * ```typescript
 * const debouncer = new Debouncer(500);
 * debouncer.run(() => console.log('Executed after 500ms'));
 * ```
 */
export class Debouncer {
    private timeout: ReturnType<typeof setTimeout> | null = null;
    private lastArgs: any[] | null = null;

    constructor(private delay: number) {}

    /**
     * Runs the provided function after the debounce delay.
     * If called again before the delay expires, the previous call is cancelled.
     * 
     * @param fn - Function to execute after delay
     */
    run(fn: () => void): void {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            fn();
            this.timeout = null;
        }, this.delay);
    }

    /**
     * Runs the provided function with arguments after the debounce delay.
     * Preserves the last arguments passed.
     * 
     * @param fn - Function to execute after delay
     * @param args - Arguments to pass to the function
     */
    runWithArgs<T extends any[]>(fn: (...args: T) => void, ...args: T): void {
        this.lastArgs = args;
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            fn(...(this.lastArgs as T));
            this.timeout = null;
            this.lastArgs = null;
        }, this.delay);
    }

    /**
     * Cancels any pending debounced function execution.
     */
    cancel(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
            this.lastArgs = null;
        }
    }

    /**
     * Returns whether there is a pending debounced function.
     */
    isPending(): boolean {
        return this.timeout !== null;
    }

    /**
     * Immediately executes the pending function if one exists, then cancels the timeout.
     * 
     * @param fn - Function to execute immediately
     */
    flush(fn?: () => void): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
            if (fn) fn();
            this.lastArgs = null;
        }
    }
}
