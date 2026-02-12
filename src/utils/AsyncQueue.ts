/**
 * Async queue for managing sequential execution of async operations.
 * Ensures operations are executed one at a time in order.
 * 
 * @example
 * ```typescript
 * const queue = new AsyncQueue();
 * 
 * // Add operations to queue
 * queue.enqueue(async () => {
 *   await saveFile(file1);
 * });
 * 
 * queue.enqueue(async () => {
 *   await saveFile(file2);
 * });
 * ```
 */
export class AsyncQueue {
    private queue: Array<() => Promise<void>> = [];
    private processing: boolean = false;
    private maxConcurrent: number;
    private currentlyRunning: number = 0;

    constructor(maxConcurrent: number = 1) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Adds an async operation to the queue.
     * 
     * @param operation - Async function to execute
     * @returns Promise that resolves when the operation completes
     */
    async enqueue<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.process();
        });
    }

    /**
     * Processes the queue.
     */
    private async process(): Promise<void> {
        if (this.currentlyRunning >= this.maxConcurrent) {
            return;
        }

        const operation = this.queue.shift();
        if (!operation) {
            return;
        }

        this.currentlyRunning++;
        try {
            await operation();
        } finally {
            this.currentlyRunning--;
            // Process next item
            if (this.queue.length > 0) {
                this.process();
            }
        }
    }

    /**
     * Returns the number of pending operations.
     */
    size(): number {
        return this.queue.length;
    }

    /**
     * Checks if the queue is empty.
     */
    isEmpty(): boolean {
        return this.queue.length === 0 && this.currentlyRunning === 0;
    }

    /**
     * Clears all pending operations.
     */
    clear(): void {
        this.queue = [];
    }

    /**
     * Waits for all operations to complete.
     */
    async waitForEmpty(): Promise<void> {
        while (!this.isEmpty()) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
}

/**
 * Priority queue for async operations.
 * Operations with higher priority are executed first.
 */
export class PriorityAsyncQueue {
    private queue: Array<{ priority: number; operation: () => Promise<void> }> = [];
    private processing: boolean = false;

    /**
     * Adds an async operation to the queue with a priority.
     * 
     * @param operation - Async function to execute
     * @param priority - Priority (higher = executed first)
     * @returns Promise that resolves when the operation completes
     */
    async enqueue<T>(operation: () => Promise<T>, priority: number = 0): Promise<T> {
        return new Promise((resolve, reject) => {
            const wrappedOperation = async () => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            this.queue.push({ priority, operation: wrappedOperation });
            this.queue.sort((a, b) => b.priority - a.priority);
            this.process();
        });
    }

    /**
     * Processes the queue.
     */
    private async process(): Promise<void> {
        if (this.processing) {
            return;
        }

        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item) {
                await item.operation();
            }
        }
        this.processing = false;
    }

    /**
     * Returns the number of pending operations.
     */
    size(): number {
        return this.queue.length;
    }

    /**
     * Checks if the queue is empty.
     */
    isEmpty(): boolean {
        return this.queue.length === 0 && !this.processing;
    }

    /**
     * Clears all pending operations.
     */
    clear(): void {
        this.queue = [];
    }
}

/**
 * Batch processor for grouping multiple operations together.
 * Useful for reducing the number of expensive operations (e.g., file writes).
 * 
 * @example
 * ```typescript
 * const batcher = new BatchProcessor(
 *   async (items) => {
 *     await saveMultipleFiles(items);
 *   },
 *   { maxSize: 10, maxWait: 1000 }
 * );
 * 
 * batcher.add(file1);
 * batcher.add(file2);
 * // Files will be saved together after 1 second or when 10 files are queued
 * ```
 */
export class BatchProcessor<T> {
    private batch: T[] = [];
    private timer: ReturnType<typeof setTimeout> | null = null;
    private processFn: (items: T[]) => Promise<void>;
    private maxSize: number;
    private maxWait: number;

    constructor(
        processFn: (items: T[]) => Promise<void>,
        options: { maxSize?: number; maxWait?: number } = {},
    ) {
        this.processFn = processFn;
        this.maxSize = options.maxSize || 100;
        this.maxWait = options.maxWait || 1000;
    }

    /**
     * Adds an item to the batch.
     */
    add(item: T): void {
        this.batch.push(item);

        if (this.batch.length >= this.maxSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.maxWait);
        }
    }

    /**
     * Immediately processes all pending items.
     */
    async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.batch.length === 0) {
            return;
        }

        const items = [...this.batch];
        this.batch = [];

        try {
            await this.processFn(items);
        } catch (error) {
            console.error("Batch processing failed", error);
        }
    }

    /**
     * Returns the number of pending items.
     */
    size(): number {
        return this.batch.length;
    }

    /**
     * Clears all pending items without processing.
     */
    clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.batch = [];
    }
}
