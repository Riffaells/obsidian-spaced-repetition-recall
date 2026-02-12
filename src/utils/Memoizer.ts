/**
 * Memoization utility for caching function results to improve performance.
 * Useful for expensive computations that are called repeatedly with the same arguments.
 * 
 * @example
 * ```typescript
 * const memoizer = new Memoizer<string, number>();
 * const expensiveCalc = memoizer.memoize((key: string) => {
 *   // expensive computation
 *   return key.length * 1000;
 * });
 * ```
 */
export class Memoizer<K, V> {
    private cache: Map<K, V> = new Map();
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    /**
     * Wraps a function with memoization.
     * 
     * @param fn - Function to memoize
     * @returns Memoized version of the function
     */
    memoize(fn: (key: K) => V): (key: K) => V {
        return (key: K): V => {
            if (this.cache.has(key)) {
                return this.cache.get(key)!;
            }

            const result = fn(key);
            this.set(key, result);
            return result;
        };
    }

    /**
     * Manually sets a value in the cache.
     */
    set(key: K, value: V): void {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Gets a value from the cache.
     */
    get(key: K): V | undefined {
        return this.cache.get(key);
    }

    /**
     * Checks if a key exists in the cache.
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Clears the entire cache.
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Removes a specific key from the cache.
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Returns the current cache size.
     */
    size(): number {
        return this.cache.size;
    }
}

/**
 * Simple function memoization decorator for single-argument functions.
 * 
 * @example
 * ```typescript
 * const fibonacci = memoize((n: number): number => {
 *   if (n <= 1) return n;
 *   return fibonacci(n - 1) + fibonacci(n - 2);
 * });
 * ```
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
    const cache = new Map<T, R>();
    return (arg: T): R => {
        if (cache.has(arg)) {
            return cache.get(arg)!;
        }
        const result = fn(arg);
        cache.set(arg, result);
        return result;
    };
}

/**
 * Memoization with custom key generation for multi-argument functions.
 * 
 * @example
 * ```typescript
 * const add = memoizeBy(
 *   (a: number, b: number) => a + b,
 *   (a, b) => `${a}-${b}`
 * );
 * ```
 */
export function memoizeBy<T extends any[], R>(
    fn: (...args: T) => R,
    keyFn: (...args: T) => string,
): (...args: T) => R {
    const cache = new Map<string, R>();
    return (...args: T): R => {
        const key = keyFn(...args);
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}
