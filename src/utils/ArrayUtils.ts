/**
 * Array utility functions for common operations.
 * Provides functional programming helpers and performance optimizations.
 */

/**
 * Chunks an array into smaller arrays of specified size.
 * 
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Groups array elements by a key function.
 * 
 * @example
 * ```typescript
 * const items = [{ type: 'a', val: 1 }, { type: 'b', val: 2 }, { type: 'a', val: 3 }];
 * groupBy(items, item => item.type) // { a: [...], b: [...] }
 * ```
 */
export function groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K,
): Record<K, T[]> {
    const result = {} as Record<K, T[]>;
    for (const item of array) {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
    }
    return result;
}

/**
 * Creates a map from array using key and value functions.
 * 
 * @example
 * ```typescript
 * const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
 * toMap(items, i => i.id, i => i.name) // Map { 1 => 'a', 2 => 'b' }
 * ```
 */
export function toMap<T, K, V>(
    array: T[],
    keyFn: (item: T) => K,
    valueFn: (item: T) => V,
): Map<K, V> {
    const map = new Map<K, V>();
    for (const item of array) {
        map.set(keyFn(item), valueFn(item));
    }
    return map;
}

/**
 * Removes duplicates from array based on a key function.
 * 
 * @example
 * ```typescript
 * const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
 * uniqueBy(items, i => i.id) // [{ id: 1 }, { id: 2 }]
 * ```
 */
export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
    const seen = new Set<K>();
    const result: T[] = [];
    for (const item of array) {
        const key = keyFn(item);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}

/**
 * Removes duplicates from array (primitive values).
 */
export function unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}

/**
 * Partitions array into two arrays based on predicate.
 * 
 * @example
 * ```typescript
 * partition([1, 2, 3, 4], x => x % 2 === 0) // [[2, 4], [1, 3]]
 * ```
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const pass: T[] = [];
    const fail: T[] = [];
    for (const item of array) {
        if (predicate(item)) {
            pass.push(item);
        } else {
            fail.push(item);
        }
    }
    return [pass, fail];
}

/**
 * Finds the first item matching predicate and returns its index.
 * Returns -1 if not found.
 */
export function findIndex<T>(array: T[], predicate: (item: T, index: number) => boolean): number {
    for (let i = 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}

/**
 * Finds the last item matching predicate.
 */
export function findLast<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
    return undefined;
}

/**
 * Sums array elements using a value function.
 * 
 * @example
 * ```typescript
 * const items = [{ val: 1 }, { val: 2 }, { val: 3 }];
 * sumBy(items, i => i.val) // 6
 * ```
 */
export function sumBy<T>(array: T[], valueFn: (item: T) => number): number {
    let sum = 0;
    for (const item of array) {
        sum += valueFn(item);
    }
    return sum;
}

/**
 * Counts items matching predicate.
 */
export function countBy<T>(array: T[], predicate: (item: T) => boolean): number {
    let count = 0;
    for (const item of array) {
        if (predicate(item)) {
            count++;
        }
    }
    return count;
}

/**
 * Flattens nested arrays one level deep.
 */
export function flatten<T>(array: T[][]): T[] {
    return array.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Flattens nested arrays recursively.
 */
export function flattenDeep<T>(array: any[]): T[] {
    const result: T[] = [];
    for (const item of array) {
        if (Array.isArray(item)) {
            result.push(...(flattenDeep<T>(item) as T[]));
        } else {
            result.push(item as T);
        }
    }
    return result;
}

/**
 * Takes first N elements from array.
 */
export function take<T>(array: T[], count: number): T[] {
    return array.slice(0, Math.max(0, count));
}

/**
 * Takes last N elements from array.
 */
export function takeLast<T>(array: T[], count: number): T[] {
    return array.slice(Math.max(0, array.length - count));
}

/**
 * Drops first N elements from array.
 */
export function drop<T>(array: T[], count: number): T[] {
    return array.slice(Math.max(0, count));
}

/**
 * Drops last N elements from array.
 */
export function dropLast<T>(array: T[], count: number): T[] {
    return array.slice(0, Math.max(0, array.length - count));
}

/**
 * Shuffles array using Fisher-Yates algorithm.
 * Returns a new array, doesn't modify original.
 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Returns random element from array.
 */
export function sample<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns N random elements from array.
 */
export function sampleSize<T>(array: T[], count: number): T[] {
    const shuffled = shuffle(array);
    return take(shuffled, count);
}

/**
 * Checks if arrays are equal (shallow comparison).
 */
export function arrayEquals<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Checks if arrays are equal using custom comparator.
 */
export function arrayEqualsBy<T>(
    a: T[],
    b: T[],
    compareFn: (itemA: T, itemB: T) => boolean,
): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (!compareFn(a[i], b[i])) return false;
    }
    return true;
}

/**
 * Computes intersection of two arrays.
 */
export function intersection<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return a.filter((item) => setB.has(item));
}

/**
 * Computes difference of two arrays (items in A but not in B).
 */
export function difference<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return a.filter((item) => !setB.has(item));
}

/**
 * Computes union of two arrays (removes duplicates).
 */
export function union<T>(a: T[], b: T[]): T[] {
    return unique([...a, ...b]);
}

/**
 * Zips two arrays together.
 * 
 * @example
 * ```typescript
 * zip([1, 2, 3], ['a', 'b', 'c']) // [[1, 'a'], [2, 'b'], [3, 'c']]
 * ```
 */
export function zip<T, U>(a: T[], b: U[]): [T, U][] {
    const length = Math.min(a.length, b.length);
    const result: [T, U][] = [];
    for (let i = 0; i < length; i++) {
        result.push([a[i], b[i]]);
    }
    return result;
}

/**
 * Creates an array of numbers from start to end (inclusive).
 * 
 * @example
 * ```typescript
 * range(1, 5) // [1, 2, 3, 4, 5]
 * range(0, 10, 2) // [0, 2, 4, 6, 8, 10]
 * ```
 */
export function range(start: number, end: number, step: number = 1): number[] {
    const result: number[] = [];
    if (step > 0) {
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
    } else if (step < 0) {
        for (let i = start; i >= end; i += step) {
            result.push(i);
        }
    }
    return result;
}

/**
 * Moves an item from one index to another.
 */
export function move<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...array];
    const [item] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, item);
    return result;
}

/**
 * Inserts item at index.
 */
export function insert<T>(array: T[], index: number, item: T): T[] {
    const result = [...array];
    result.splice(index, 0, item);
    return result;
}

/**
 * Removes item at index.
 */
export function removeAt<T>(array: T[], index: number): T[] {
    const result = [...array];
    result.splice(index, 1);
    return result;
}

/**
 * Replaces item at index.
 */
export function replaceAt<T>(array: T[], index: number, item: T): T[] {
    const result = [...array];
    result[index] = item;
    return result;
}
