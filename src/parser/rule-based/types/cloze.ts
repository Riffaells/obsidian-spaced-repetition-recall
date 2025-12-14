/**
 * Cloze deletion configuration types
 *
 * @module parser/rule-based/types/cloze
 */

/**
 * Defines a pattern to identify cloze deletions in text.
 * Supports complex formats like: ==[id;;]answer[;;hint]==
 */
export interface ClozePattern {
    /**
     * Regular expression string.
     * Should ideally use named capture groups for advanced parsing:
     * - (?<answer>...) - The text to hide
     * - (?<hint>...) - Optional hint
     * - (?<id>...) - Optional explicit ID
     */
    pattern: string;

    /** Priority of this pattern if multiple patterns match the same text */
    priority?: number;
}

/**
 * Configuration for processing cloze deletions within a card.
 * Can be attached to Header, Inline, or Multiline rules.
 */
export interface ClozeSettings {
    /**
     * Whether to process cloze deletions in the found content.
     */
    enabled: boolean;

    /**
     * Specific patterns to use for this rule.
     * If undefined, the plugin should use global default patterns.
     */
    patterns?: ClozePattern[];
}
