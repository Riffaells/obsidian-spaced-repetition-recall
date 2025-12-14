/**
 * Rule definitions for flashcard extraction
 *
 * @module parser/rule-based/types/rules
 */

import { RuleId, TagVarValue } from "./primitives";
import { HeaderConfig, InlineConfig, MultilineConfig } from "./configs";

/**
 * Common metadata properties shared by all rule types.
 */
export interface RuleMeta {
    /** Unique ID */
    id: RuleId;

    /** Display name for settings UI */
    name: string;

    /** Whether this rule is active */
    enabled: boolean;

    /** Execution priority (higher number overrides lower) */
    priority: number;

    /** Regex pattern to match Obsidian tags (e.g., "#flashcards/.*") */
    tagPattern: string;

    /**
     * Variables extracted from the tag regex.
     * Record value is strictly typed (no 'any').
     */
    vars?: Record<string, TagVarValue>;

    /** Optional scoping conditions */
    scope?: {
        /** Regex matching the parent header text */
        ancestorHeader?: string;
        /** Regex matching the file path */
        folderPath?: string;
    };
}

/**
 * Rule for extracting flashcards from headers
 */
export interface HeaderRule extends RuleMeta {
    type: "header";
    config: HeaderConfig;
}

/**
 * Rule for extracting inline flashcards
 */
export interface InlineRule extends RuleMeta {
    type: "inline";
    config: InlineConfig;
}

/**
 * Rule for extracting multiline flashcards
 */
export interface MultilineRule extends RuleMeta {
    type: "multiline";
    config: MultilineConfig;
}

/**
 * The Master Type.
 * Represents any valid flashcard generation rule.
 * Use 'type' field to discriminate between rule kinds.
 */
export type FlashcardRule = HeaderRule | InlineRule | MultilineRule;
