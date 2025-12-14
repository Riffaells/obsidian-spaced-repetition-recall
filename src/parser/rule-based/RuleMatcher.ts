/**
 * RuleMatcher
 *
 * Evaluates whether a flashcard rule applies to a given context by checking:
 * - Tag pattern matching (with regex)
 * - Scope conditions (folder path, ancestor header)
 * - Variable extraction from tag patterns using named capture groups
 * - Type conversion for variables (string → boolean, number)
 *
 * @module parser/rule-based/RuleMatcher
 */

import { FlashcardRule, TagVarValue } from "./types";

/**
 * Context information for rule matching
 */
export interface MatchContext {
    /** All Obsidian tags found in the note */
    tags: string[];

    /** File path of the note being parsed */
    folderPath: string;

    /** Hierarchical path of ancestor headers (for scoped matching) */
    ancestorHeaders: string[];
}

/**
 * Result of a successful rule match
 */
export interface RuleMatch {
    /** The rule that matched */
    rule: FlashcardRule;

    /** Variables extracted from tag patterns */
    vars: Record<string, TagVarValue>;
}

/**
 * Evaluates whether rules apply to given contexts
 */
export class RuleMatcher {
    /** Cache for compiled regex patterns to avoid recompilation */
    private regexCache: Map<string, RegExp> = new Map();

    /**
     * Check if a rule applies to the given context
     *
     * @param rule - The flashcard rule to evaluate
     * @param context - The context to match against
     * @returns RuleMatch if the rule applies, null otherwise
     */
    match(rule: FlashcardRule, context: MatchContext): RuleMatch | null {
        // Check if rule is enabled
        if (!rule.enabled) {
            return null;
        }

        // Check tag pattern matching and extract variables
        const tagMatchResult = this.matchTagPattern(rule.tagPattern, context.tags);
        if (!tagMatchResult) {
            return null;
        }

        // Check scope conditions (all must match - AND logic)
        if (rule.scope) {
            // Check folder path condition
            if (rule.scope.folderPath) {
                if (!this.matchFolderPath(rule.scope.folderPath, context.folderPath)) {
                    return null;
                }
            }

            // Check ancestor header condition
            if (rule.scope.ancestorHeader) {
                if (!this.matchAncestorHeader(rule.scope.ancestorHeader, context.ancestorHeaders)) {
                    return null;
                }
            }
        }

        // All conditions passed - return match with extracted variables
        return {
            rule,
            vars: tagMatchResult.vars,
        };
    }

    /**
     * Match tag pattern against note tags and extract variables
     *
     * @param tagPattern - Regex pattern to match tags
     * @param tags - Array of tags from the note
     * @returns Object with extracted vars if any tag matches, null otherwise
     */
    private matchTagPattern(
        tagPattern: string,
        tags: string[],
    ): { vars: Record<string, TagVarValue> } | null {
        const regex = this.getOrCompileRegex(tagPattern);

        // Try to match against each tag (OR logic)
        for (const tag of tags) {
            const match = regex.exec(tag);
            if (match) {
                // Extract variables from named capture groups
                const vars = this.extractVariables(match);
                return { vars };
            }
        }

        return null;
    }

    /**
     * Match folder path against the pattern
     *
     * @param folderPathPattern - Regex pattern to match folder path
     * @param folderPath - The actual folder path
     * @returns True if the folder path matches the pattern
     */
    private matchFolderPath(folderPathPattern: string, folderPath: string): boolean {
        const regex = this.getOrCompileRegex(folderPathPattern);
        return regex.test(folderPath);
    }

    /**
     * Match ancestor header pattern against ancestor headers
     *
     * @param ancestorHeaderPattern - Regex pattern to match ancestor headers
     * @param ancestorHeaders - Array of ancestor header texts
     * @returns True if any ancestor header matches the pattern
     */
    private matchAncestorHeader(ancestorHeaderPattern: string, ancestorHeaders: string[]): boolean {
        const regex = this.getOrCompileRegex(ancestorHeaderPattern);

        // Check if any ancestor header matches (OR logic for multiple ancestors)
        return ancestorHeaders.some((header) => regex.test(header));
    }

    /**
     * Extract variables from regex match using named capture groups
     *
     * @param match - The regex match result
     * @returns Record of variable names to values with type conversion
     */
    private extractVariables(match: RegExpExecArray): Record<string, TagVarValue> {
        const vars: Record<string, TagVarValue> = {};

        if (match.groups) {
            for (const [name, value] of Object.entries(match.groups)) {
                if (value !== undefined) {
                    vars[name] = this.convertVariableType(value);
                }
            }
        }

        return vars;
    }

    /**
     * Convert string variable to appropriate type (boolean, number, or string)
     *
     * @param value - The string value to convert
     * @returns Converted value as TagVarValue
     */
    private convertVariableType(value: string): TagVarValue {
        // Try boolean conversion
        if (value === "true") {
            return true;
        }
        if (value === "false") {
            return false;
        }

        // Try number conversion
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() !== "") {
            return numValue;
        }

        // Default to string
        return value;
    }

    /**
     * Get a compiled regex from cache or compile and cache it
     *
     * @param pattern - The regex pattern string
     * @returns Compiled RegExp object
     */
    private getOrCompileRegex(pattern: string): RegExp {
        let regex = this.regexCache.get(pattern);

        if (!regex) {
            try {
                regex = new RegExp(pattern);
                this.regexCache.set(pattern, regex);
            } catch (error) {
                // If regex compilation fails, create a regex that never matches
                // This allows graceful degradation
                regex = /(?!)/; // Negative lookahead that never matches
                this.regexCache.set(pattern, regex);
            }
        }

        return regex;
    }

    /**
     * Clear the regex cache (useful for testing or memory management)
     */
    clearCache(): void {
        this.regexCache.clear();
    }
}
