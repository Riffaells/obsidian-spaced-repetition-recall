/**
 * PositionalSelector - Selects headings by their position in the document
 * 
 * This module handles positional selectors like:
 * - first-N: Select the first N headings
 * - last-N: Select the last N headings
 * - nth-N: Select the Nth heading (1-based index)
 * 
 * @module parser/header-based/PositionalSelector
 */

import { HeadingInfo, PositionalSelector } from "./types";

/**
 * Utility class for applying positional selectors to headings
 */
export class PositionalSelectorUtil {
    /**
     * Applies positional selectors to a list of headings
     * 
     * When multiple selectors are provided, they are applied sequentially,
     * with each selector filtering the results of the previous one.
     * 
     * @param headings Array of headings to filter
     * @param selectors Array of positional selectors to apply
     * @returns Filtered array of headings
     */
    static applySelectors(
        headings: HeadingInfo[],
        selectors: PositionalSelector[],
    ): HeadingInfo[] {
        if (selectors.length === 0) {
            return headings;
        }

        let result = [...headings];

        for (const selector of selectors) {
            result = this.applySingleSelector(result, selector);
        }

        return result;
    }

    /**
     * Parses a positional selector from a string
     * 
     * Supported formats:
     * - "first-N" where N is a positive integer (e.g., "first-3")
     * - "last-N" where N is a positive integer (e.g., "last-2")
     * - "nth-N" where N is a positive integer (e.g., "nth-5")
     * 
     * @param selectorStr The selector string to parse
     * @returns Parsed PositionalSelector or null if invalid
     */
    static parseSelector(selectorStr: string): PositionalSelector | null {
        const match = selectorStr.match(/^(first|last|nth|nthFromEnd)-(\d+)$/);
        
        if (!match) {
            return null;
        }

        const type = match[1] as PositionalSelector["type"];
        const value = parseInt(match[2], 10);

        // Value must be positive for 'first', 'last', 'nth'
        // For 'nthFromEnd', 0 is valid (last element)
        if (value <= 0 && type !== "nthFromEnd") {
            return null;
        }

        switch (type) {
            case "first":
            case "last":
                return { type, count: value };
            case "nth":
                return { type, index: value }; // Use index for 'nth'
            case "nthFromEnd":
                return { type, offset: value }; // Use offset for 'nthFromEnd'
            default:
                return null; // Should not happen with regex
        }
    }

    /**
     * Applies a single positional selector to a list of headings
     * 
     * @param headings Array of headings to filter
     * @param selector The positional selector to apply
     * @returns Filtered array of headings
     */
    private static applySingleSelector(
        headings: HeadingInfo[],
        selector: PositionalSelector,
    ): HeadingInfo[] {
        if (headings.length === 0) {
            return [];
        }

        switch (selector.type) {
            case "first":
                // Select first N headings
                // If N > available headings, return all
                return headings.slice(0, selector.count);

            case "last":
                // Select last N headings
                // If N > available headings, return all
                return headings.slice(-selector.count);

            case "nth":
                // Select the Nth heading (1-based index)
                // If N > available headings, return empty array
                const index = selector.index - 1; // Use selector.index
                if (index >= 0 && index < headings.length) {
                    return [headings[index]];
                }
                return [];
            
            case "nthFromEnd":
                // Select Nth from end (0 = last, 1 = second to last etc.)
                const offsetIndex = headings.length - 1 - selector.offset; // Use selector.offset
                if (offsetIndex >= 0 && offsetIndex < headings.length) {
                    return [headings[offsetIndex]];
                }
                return [];
            default:
                return headings;
        }
    }
}
