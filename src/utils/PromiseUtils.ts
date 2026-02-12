/**
 * Promise utilities for advanced async operations.
 * 
 * Features:
 * - Timeout handling
 * - Parallel execution with concurrency control
 * - Promise pooling and batching
 * - Cancellable promises
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(fetchData(), 5000);
 * const results = await promiseAllSettled([p1, p2, p3]);
 * ```
 */

/**
 * Execute promise with timeout.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError?: Error,
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(
                () => reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`)),
                timeoutMs,
            ),
        ),
    ]);
}

/**
 * Delay execution for specified milliseconds.
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute promises in parallel with concurrency limit.
 */
export async function promiseAllWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number,
): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const [index, task] of tasks.entries()) {
        const promise = task().then((result) => {
            results[index] = result;
        });

        executing.push(promise);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(
                executing.findIndex((p) => p === promise),
                1,
            );
        }
    }

    await Promise.all(executing);
    return results;
}

/**
 * Execute promises in batches.
 */
export async function promiseAllInBatches<T>(
    tasks: (() => Promise<T>)[],
    batchSize: number,
): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map((task) => task()));
        results.push(...batchResults);
    }

    return results;
}

/**
 * Promise.allSettled polyfill for older environments.
 */
export async function promiseAllSettled<T>(
    promises: Promise<T>[],
): Promise<Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: any }>> {
    return Promise.all(
        promises.map((promise) =>
            promise
                .then((value) => ({ status: "fulfilled" as const, value }))
                .catch((reason) => ({ status: "rejected" as const, reason })),
        ),
    );
}

/**
 * Execute promises sequentially.
 */
export async function promiseSequential<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];

    for (const task of tasks) {
        results.push(await task());
    }

    return results;
}

/**
 * Retry promise with exponential backoff.
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options?: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
        shouldRetry?: (error: any) => boolean;
    },
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 1000,
        maxDelayMs = 10000,
        backoffMultiplier = 2,
        shouldRetry = () => true,
    } = options || {};

    let lastError: any;
    let currentDelay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt >= maxAttempts || !shouldRetry(error)) {
                throw error;
            }

            await delay(Math.min(currentDelay, maxDelayMs));
            currentDelay *= backoffMultiplier;
        }
    }

    throw lastError;
}

/**
 * Create a cancellable promise.
 */
export interface CancellablePromise<T> extends Promise<T> {
    cancel: () => void;
    isCancelled: () => boolean;
}

export function makeCancellable<T>(promise: Promise<T>): CancellablePromise<T> {
    let cancelled = false;
    let rejectFn: (reason?: any) => void;

    const wrappedPromise = new Promise<T>((resolve, reject) => {
        rejectFn = reject;

        promise
            .then((value) => {
                if (!cancelled) {
                    resolve(value);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    reject(error);
                }
            });
    }) as CancellablePromise<T>;

    wrappedPromise.cancel = () => {
        cancelled = true;
        rejectFn?.(new Error("Promise cancelled"));
    };

    wrappedPromise.isCancelled = () => cancelled;

    return wrappedPromise;
}

/**
 * Debounce promise execution.
 */
export function debouncePromise<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delayMs: number,
): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let latestResolve: ((value: any) => void) | null = null;
    let latestReject: ((reason: any) => void) | null = null;

    return ((...args: Parameters<T>) => {
        return new Promise((resolve, reject) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            latestResolve = resolve;
            latestReject = reject;

            timeoutId = setTimeout(async () => {
                try {
                    const result = await fn(...args);
                    latestResolve?.(result);
                } catch (error) {
                    latestReject?.(error);
                }
            }, delayMs);
        });
    }) as T;
}

/**
 * Throttle promise execution.
 */
export function throttlePromise<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delayMs: number,
): T {
    let lastExecution = 0;
    let pendingPromise: Promise<any> | null = null;

    return ((...args: Parameters<T>) => {
        const now = Date.now();

        if (now - lastExecution >= delayMs) {
            lastExecution = now;
            return fn(...args);
        }

        if (!pendingPromise) {
            pendingPromise = delay(delayMs - (now - lastExecution)).then(() => {
                lastExecution = Date.now();
                pendingPromise = null;
                return fn(...args);
            });
        }

        return pendingPromise;
    }) as T;
}

/**
 * Execute function with retry on specific errors.
 */
export async function retryOnError<T>(
    fn: () => Promise<T>,
    errorTypes: (new (...args: any[]) => Error)[],
    maxAttempts: number = 3,
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            const shouldRetry = errorTypes.some((ErrorType) => error instanceof ErrorType);

            if (!shouldRetry || attempt >= maxAttempts) {
                throw error;
            }

            await delay(1000 * attempt);
        }
    }

    throw lastError!;
}

/**
 * Race promises with a default value on timeout.
 */
export async function raceWithDefault<T>(
    promise: Promise<T>,
    timeoutMs: number,
    defaultValue: T,
): Promise<T> {
    try {
        return await withTimeout(promise, timeoutMs);
    } catch {
        return defaultValue;
    }
}

/**
 * Map array with async function and concurrency control.
 */
export async function mapAsync<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = Infinity,
): Promise<R[]> {
    if (concurrency === Infinity) {
        return Promise.all(items.map(fn));
    }

    return promiseAllWithConcurrency(
        items.map((item, index) => () => fn(item, index)),
        concurrency,
    );
}

/**
 * Filter array with async predicate.
 */
export async function filterAsync<T>(
    items: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
): Promise<T[]> {
    const results = await Promise.all(items.map(predicate));
    return items.filter((_, index) => results[index]);
}

/**
 * Find first item matching async predicate.
 */
export async function findAsync<T>(
    items: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
): Promise<T | undefined> {
    for (let i = 0; i < items.length; i++) {
        if (await predicate(items[i], i)) {
            return items[i];
        }
    }
    return undefined;
}
