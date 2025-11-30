/**
 * Utility functions for working with unified flashcard tag rules
 */

import { FlashcardTagRule, PositionalSelector } from "src/parser/header-based/types";

// Counter for generating unique IDs
let ruleIdCounter = 0;

/**
 * Generate a unique rule ID
 * Uses timestamp + counter for guaranteed uniqueness
 */
function generateRuleId(): string {
    return `rule-${Date.now()}-${++ruleIdCounter}`;
}

/**
 * Create a default inline flashcard rule
 */
export function createInlineRule(tag: string, name?: string): FlashcardTagRule {
    return {
        id: generateRuleId(),
        name: name || `Inline: ${tag}`,
        tagExact: tag,
        enabled: true,
        priority: 0,
        source: "inline",
        inlineRules: {
            separator: "::",
        },
    };
}

/**
 * Create a default header-based flashcard rule
 */
export function createHeaderRule(
    tag: string,
    levels: number[] = [2],
    name?: string,
    options?: {
        mode?: "qa" | "cloze" | "visual";
        nesting?: "flat" | "nested";
        includeParents?: number;
        selectors?: PositionalSelector[];
    }
): FlashcardTagRule {
    return {
        id: generateRuleId(),
        name: name || `Header: ${tag}`,
        tagExact: tag,
        enabled: true,
        priority: 0,
        source: "header",
        headerRules: {
            headingLevels: levels,
            nestingMode: options?.nesting ?? "nested",
            selectors: options?.selectors || [],
            includeParents: options?.includeParents ?? 1,
            cardMode: options?.mode ?? "qa",
            qaSeparator: "?",
        },
    };
}

/**
 * Parse tag suffix to extract configuration hints
 * Examples:
 * - "#exam/h2" → level 2
 * - "#exam/h1-3" → levels [1, 2, 3]
 * - "#exam/last-2" → last 2 headings (positional selector)
 * - "#exam/first-5" → first 5 headings
 */
export function parseTagSuffix(tag: string): {
    baseTag: string;
    levels?: number[];
    selectors?: PositionalSelector[];
} {
    const parts = tag.split("/");
    if (parts.length < 2) {
        return { baseTag: tag };
    }

    const baseTag = parts.slice(0, -1).join("/");
    const suffix = parts[parts.length - 1];

    // Check for heading level: h1, h2, etc.
    const levelMatch = suffix.match(/^h(\d)$/);
    if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        if (level >= 1 && level <= 6) {
            return {
                baseTag,
                levels: [level],
            };
        }
    }

    // Check for heading range: h1-3, h2-4, etc.
    const rangeMatch = suffix.match(/^h(\d)-(\d)$/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (start >= 1 && end <= 6 && start <= end) {
            const levels: number[] = [];
            for (let i = start; i <= end; i++) {
                levels.push(i);
            }
            return {
                baseTag,
                levels,
            };
        }
    }

    // Check for position-based: last-2, first-5, nth-3
    const positionMatch = suffix.match(/^(first|last|nth)-(\d+)$/);
    if (positionMatch) {
        const type = positionMatch[1] as "first" | "last" | "nth";
        const count = parseInt(positionMatch[2]);
        
        if (type === "first" || type === "last") {
            return {
                baseTag,
                selectors: [{ type, count }],
            };
        } else if (type === "nth") {
            return {
                baseTag,
                selectors: [{ type, index: count }],
            };
        }
    }

    return { baseTag: tag };
}
