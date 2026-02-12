/**
 * Configuration types for different card extraction methods
 *
 * @module parser/rule-based/types/configs
 */

import { ClozeSettings } from "./cloze";
import { HeaderLimit } from "./selection-strategies";

/**
 * Configuration for creating flashcards from Headers.
 * Structure: Header is Question, Content is Answer.
 */
export interface HeaderConfig {
    selection: {
        /** Markdown header levels to target (1-6) */
        levels: number[];

        /**
         * If true, prioritizes higher levels.
         * Example: If H1 exists, ignore H2. If no H1, look for H2.
         */
        strictPriority: boolean;

        /** Optional filter to limit the number of selected headers */
        limit?: HeaderLimit;
    };

    content: {
        /** How much text to grab: everything until next header, or just first paragraph */
        scope: "full-section" | "first-paragraph";

        /** Whether to include subsections in the answer */
        includeSubheaders: boolean;

        /** Whether to remove HTML/Markdown tags from the output */
        stripTags: boolean;
    };

    /** Optional cloze processing settings */
    cloze?: ClozeSettings;
}

/**
 * Configuration for Inline flashcards.
 * Structure: "Term :: Definition"
 */
export interface InlineConfig {
    /** The separator string (e.g., "::") */
    separator: string;

    /** If defined, creates a reverse card with this separator (e.g., ":::") */
    separatorReverse?: string;

    /** If true, the pattern must match from the start of the line */
    startOfLineOnly: boolean;

    /**
     * Optional: Alternative separators for context-aware lines (lists, callouts).
     * When a line is detected as a list or callout, these separators will be tried
     * in addition to the main separator.
     * Example: ["-", "|", "?"] allows "- Q - A", "- Q | A", "- Q ? A"
     */
    contextAwareSeparators?: string[];

    /** Optional cloze processing settings */
    cloze?: ClozeSettings;
}

/**
 * Configuration for Multiline/Block flashcards.
 * Structure: Question block followed by Answer block.
 */
export interface MultilineConfig {
    /** Regex to identify a line acting as a question */
    questionLinePattern: string;

    /** Condition to determine where the answer ends */
    stopCondition:
        | { type: "blank-line" }
        | { type: "separator"; separator: string }
        | { type: "next-question" }
        | { type: "custom-pattern"; pattern: string };

    /** Optional cloze processing settings */
    cloze?: ClozeSettings;
}
