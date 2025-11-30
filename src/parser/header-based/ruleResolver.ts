/**
 * Rule resolution and merging logic
 * Implements the merge algorithm for combining multiple FlashcardTagRule configurations
 */

import { FlashcardTagRule, RuleId, ResolvedHeaderConfig, PositionalSelector } from "./types";

/**
 * Compiled regex pattern for tag matching
 */
interface CompiledPattern {
    ruleId: RuleId;
    pattern: RegExp;
    rule: FlashcardTagRule;
}

/**
 * Rule resolver - manages tag matching and config merging
 */
export class RuleResolver {
    private exactMatches: Map<string, FlashcardTagRule[]> = new Map();
    private patterns: CompiledPattern[] = [];
    private allRules: FlashcardTagRule[];

    constructor(rules: FlashcardTagRule[]) {
        this.allRules = rules.filter((r) => r.enabled);
        this.indexRules(this.allRules);
    }

    /**
     * Index rules for efficient lookup
     */
    private indexRules(rules: FlashcardTagRule[]): void {
        for (const rule of rules) {
            if (rule.tagExact) {
                // Exact match - index by exact tag
                const existing = this.exactMatches.get(rule.tagExact) || [];
                existing.push(rule);
                this.exactMatches.set(rule.tagExact, existing);
            } else if (rule.tagPattern) {
                // Pattern match - compile regex once
                try {
                    const pattern = new RegExp(rule.tagPattern, rule.patternFlags || "");
                    this.patterns.push({
                        ruleId: rule.id,
                        pattern,
                        rule,
                    });
                } catch (e) {
                    console.error(`Invalid regex pattern in rule ${rule.id}: ${rule.tagPattern}`, e);
                }
            }
        }
    }

    /**
     * Find all rules matching a given tag (optimized)
     */
    findMatchingRules(tag: string): FlashcardTagRule[] {
        const matches: FlashcardTagRule[] = [];

        // Fast path: exact match
        const exactRules = this.exactMatches.get(tag);
        if (exactRules) {
            matches.push(...exactRules);
        }

        // Check hierarchical matches (e.g., #flashcards matches #flashcards/math)
        // Only check tags that could be parents
        const slashIndex = tag.indexOf("/");
        if (slashIndex > 0) {
            let currentTag = tag;
            while (currentTag.length > 0) {
                const lastSlash = currentTag.lastIndexOf("/");
                if (lastSlash === -1) break;
                
                currentTag = currentTag.substring(0, lastSlash);
                const parentRules = this.exactMatches.get(currentTag);
                if (parentRules) {
                    matches.push(...parentRules);
                }
            }
        }

        // Check pattern matches
        for (const { rule, pattern } of this.patterns) {
            if (pattern.test(tag)) {
                matches.push(rule);
            }
        }

        return matches;
    }

    /**
     * Get matching header rules for given tags (helper to avoid duplication)
     */
    private getMatchingHeaderRules(tags: string[]): FlashcardTagRule[] {
        const seen = new Set<RuleId>();
        const headerRules: FlashcardTagRule[] = [];

        for (const tag of tags) {
            const matches = this.findMatchingRules(tag);
            for (const rule of matches) {
                // Deduplicate and filter header rules
                if (!seen.has(rule.id) && rule.source === "header" && rule.headerRules) {
                    seen.add(rule.id);
                    headerRules.push(rule);
                }
            }
        }

        return headerRules;
    }

    /**
     * Merge multiple rules into a single resolved configuration
     * 
     * Merge algorithm:
     * 1. Collect all matching header rules (deduplicated)
     * 2. Sort by priority (higher = stronger)
     * 3. Merge fields according to strategy:
     *    - mode: last by priority wins
     *    - nestingMode: last by priority wins
     *    - qaSeparator: highest priority wins
     *    - includeParents: max()
     */
    mergeRules(tags: string[]): ResolvedHeaderConfig | null {
        const headerRules = this.getMatchingHeaderRules(tags);

        if (headerRules.length === 0) {
            return null;
        }

        // Sort by priority (descending) - stable sort
        headerRules.sort((a, b) => b.priority - a.priority);

        // Merge configuration
        const ruleIds: RuleId[] = headerRules.map((r) => r.id);
        
        // Take values from highest priority rule
        const highestPriority = headerRules[0].headerRules!;
        
        // includeParents: max across all rules
        const includeParents = Math.max(
            ...headerRules.map((r) => r.headerRules!.includeParents),
        );

        return {
            ruleIds,
            nestingMode: highestPriority.nestingMode,
            cardMode: highestPriority.cardMode,
            includeParents,
            qaSeparator: highestPriority.qaSeparator || "?",
        };
    }

    /**
     * Get all heading levels from matching rules (union)
     */
    getHeadingLevels(tags: string[]): number[] {
        const headerRules = this.getMatchingHeaderRules(tags);
        
        if (headerRules.length === 0) {
            return [];
        }

        // Union of all heading levels using Set for deduplication
        const levelsSet = new Set<number>();
        for (const rule of headerRules) {
            for (const level of rule.headerRules!.headingLevels) {
                levelsSet.add(level);
            }
        }

        // Return sorted unique levels
        return Array.from(levelsSet).sort((a, b) => a - b);
    }

    /**
     * Get all positional selectors from matching rules (concatenated)
     */
    getPositionalSelectors(tags: string[]): PositionalSelector[] {
        const headerRules = this.getMatchingHeaderRules(tags);
        
        if (headerRules.length === 0) {
            return [];
        }

        // Sort by priority (descending)
        headerRules.sort((a, b) => b.priority - a.priority);

        // Concatenate all selectors
        const selectors: PositionalSelector[] = [];
        for (const rule of headerRules) {
            if (rule.headerRules!.selectors.length > 0) {
                selectors.push(...rule.headerRules!.selectors);
            }
        }

        return selectors;
    }
}

/**
 * Validate a flashcard tag rule
 */
export function validateRule(rule: FlashcardTagRule): string[] {
    const errors: string[] = [];

    if (!rule.id) {
        errors.push("Rule ID is required");
    }

    if (!rule.name) {
        errors.push("Rule name is required");
    }

    // Must have either tagExact or tagPattern
    if (!rule.tagExact && !rule.tagPattern) {
        errors.push("Either tagExact or tagPattern must be specified");
    }

    // Cannot have both
    if (rule.tagExact && rule.tagPattern) {
        errors.push("Cannot specify both tagExact and tagPattern");
    }

    // Validate tagExact format
    if (rule.tagExact && !rule.tagExact.startsWith("#")) {
        errors.push("tagExact must start with #");
    }

    // Validate tagPattern
    if (rule.tagPattern) {
        try {
            new RegExp(rule.tagPattern, rule.patternFlags || "");
        } catch (e) {
            errors.push(`Invalid regex pattern: ${e}`);
        }
    }

    // Validate header rules
    if (rule.source === "header") {
        if (!rule.headerRules) {
            errors.push("headerRules is required for header source");
        } else {
            const { headingLevels, selectors, includeParents } = rule.headerRules;

            // Validate heading levels
            if (!headingLevels || headingLevels.length === 0) {
                errors.push("At least one heading level is required");
            } else {
                for (const level of headingLevels) {
                    if (level < 1 || level > 6) {
                        errors.push(`Invalid heading level: ${level} (must be 1-6)`);
                    }
                }
            }

            // Validate selectors
            if (selectors) {
                for (const selector of selectors) {
                    if (selector.type === "first" || selector.type === "last") {
                        if (selector.count < 1) {
                            errors.push(`${selector.type} count must be >= 1`);
                        }
                    } else if (selector.type === "nth") {
                        if (selector.index < 1) {
                            errors.push("nth index must be >= 1 (1-based)");
                        }
                    } else if (selector.type === "nthFromEnd") {
                        if (selector.offset < 0) {
                            errors.push("nthFromEnd offset must be >= 0");
                        }
                    }
                }
            }

            // Validate includeParents
            if (includeParents < -1) {
                errors.push("includeParents must be >= -1");
            }
        }
    }

    // Validate inline rules
    if (rule.source === "inline") {
        if (!rule.inlineRules) {
            errors.push("inlineRules is required for inline source");
        } else {
            if (!rule.inlineRules.separator) {
                errors.push("inline separator is required");
            }
        }
    }

    return errors;
}
