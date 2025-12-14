/**
 * Selection strategies for header-based flashcard extraction
 *
 * @module parser/rule-based/types/selection-strategies
 */

/** Limit strategy: Take the first N items */
export interface LimitCount {
    type: "count";
    mode: "first" | "last";
    count: number;
}

/** Limit strategy: Take a specific range (e.g., 2-5) */
export interface LimitRange {
    type: "range";
    start: number;
    end: number;
}

/** Limit strategy: Take N random items */
export interface LimitRandom {
    type: "random";
    count: number;
}

/** Discriminated union for all limit strategies */
export type HeaderLimit = LimitCount | LimitRange | LimitRandom;
