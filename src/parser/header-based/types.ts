/**
 * Type definitions for header-based flashcard parsing
 * 
 * @module parser/header-based/types
 */

/**
 * Configuration for header-based flashcard parsing
 */
export interface HeaderCardConfig {
    /** Array of heading levels to process (1-6 for h1-h6) */
    headingLevels: number[];
    
    /** How to handle nested content under headings */
    nestingMode: "nested" | "flat";
    
    /** Which headings to convert to cards */
    mode: "qa" | "all";
    
    /** Whether this configuration is enabled */
    enabled: boolean;
}

/**
 * Information about a heading found in the note
 */
export interface HeadingInfo {
    /** Heading level (1-6 for h1-h6) */
    level: number;
    
    /** Text content of the heading (without # symbols) */
    text: string;
    
    /** Line number in the note (0-based) */
    lineNumber: number;
    
    /** Whether the heading ends with "?" */
    isQuestion: boolean;
    
    /** Path of parent headings for context */
    context: string[];
    
    /** Index among headings of the same level (0-based, optional) */
    index?: number;
}

/**
 * Defines the boundaries of content for a flashcard answer
 */
export interface ContentBoundary {
    /** Line number where the answer starts (after the heading) */
    startLine: number;
    
    /** Line number where the answer ends (before next heading) */
    endLine: number;
    
    /** Whether the answer includes subheadings */
    includesSubheadings: boolean;
}

/**
 * Resolved configuration after merging multiple tags
 * This is the final configuration used for parsing after all tags are processed
 */
export interface ResolvedTagConfig {
    /** Combined heading levels from all matching tags (union) */
    headingLevels: number[];
    
    /** Recognition mode: "qa" for headings with "?", "all" for all headings */
    mode: "qa" | "all";
    
    /** Nesting mode: "nested" includes subheadings, "flat" stops at first subheading */
    nestingMode: "nested" | "flat";
    
    /** Positional selectors to filter headings by position */
    positionalSelectors: PositionalSelector[];
    
    /** Whether this configuration is active */
    enabled: boolean;
}

/**
 * Positional selector for filtering headings by their position in the document
 * Examples: first-3 (first 3 headings), last-2 (last 2 headings), nth-5 (5th heading)
 */
export interface PositionalSelector {
    /** Type of positional selection */
    type: "first" | "last" | "nth";
    
    /** 
     * Count for first/last selectors, or 1-based index for nth selector
     * For first-3: count = 3 (select first 3 headings)
     * For last-2: count = 2 (select last 2 headings)
     * For nth-5: count = 5 (select the 5th heading, 1-based)
     */
    count: number;
}

/**
 * Parsed QA format content from under a heading
 * Used for the extended QA format where question and answer are separate paragraphs
 */
export interface QAContent {
    /** The question text (first non-empty line ending with "?") */
    question: string;
    
    /** The answer text (first paragraph after the question) */
    answer: string;
    
    /** Line number where the question starts (0-based) */
    questionLineStart: number;
    
    /** Line number where the answer starts (0-based) */
    answerLineStart: number;
    
    /** Line number where the answer ends (0-based) */
    answerLineEnd: number;
}

/**
 * Tag pattern for regex-based tag matching
 * Allows custom tags to match multiple tag variations using regex
 */
export interface TagPattern {
    /** Compiled regex pattern for matching tags */
    pattern: RegExp;
    
    /** Configuration to apply when the pattern matches */
    config: HeaderCardConfig;
}

/**
 * Options for the HeaderBasedCardParser
 */
export interface HeaderBasedCardParserOptions {
    /** Whether header-based card parsing is enabled */
    enableHeaderCards: boolean;
    
    /** Map of predefined tag names to their configurations */
    predefinedTags: Map<string, HeaderCardConfig>;
    
    /** Map of custom tag names/patterns to their configurations */
    customTags: Map<string, HeaderCardConfig>;
    
    /** Whether to show heading context in cards */
    showContext: boolean;
}
