/**
 * Constants for settings to avoid hardcoded values throughout the codebase.
 * This file centralizes all default values, limits, and configuration options.
 */

// ============================================================================
// Review Response Options
// ============================================================================

export const REVIEW_RESPONSE_OPTIONS = {
    RESET: "reset",
    AGAIN: "again",
    BLACKOUT: "blackout",
    INCORRECT: "incorrect",
    INCORRECT_EASY: "incorrect_easy",
    HARD: "hard",
    GOOD: "good",
    EASY: "easy",
} as const;

export type ReviewResponseOption =
    (typeof REVIEW_RESPONSE_OPTIONS)[keyof typeof REVIEW_RESPONSE_OPTIONS];

// ============================================================================
// Algorithm Names
// ============================================================================

export const ALGORITHM_NAMES = {
    DEFAULT: "Default",
    FSRS: "Fsrs",
    ANKI: "Anki",
    SM2: "SM2",
} as const;

export type AlgorithmName = (typeof ALGORITHM_NAMES)[keyof typeof ALGORITHM_NAMES];

// ============================================================================
// Flashcard Separators
// ============================================================================

export const FLASHCARD_SEPARATORS = {
    SINGLE_LINE: "::",
    SINGLE_LINE_REVERSED: ":::",
    MULTILINE: "?",
    MULTILINE_REVERSED: "??",
    MULTILINE_END_MARKER: "",
} as const;

// ============================================================================
// Cloze Patterns
// ============================================================================

export const CLOZE_PATTERNS = {
    DEFAULT: "==[123;;]answer[;;hint]==",
} as const;

export const DEFAULT_CLOZE_PATTERNS = [CLOZE_PATTERNS.DEFAULT];

// ============================================================================
// Tags
// ============================================================================

export const DEFAULT_TAGS = {
    FLASHCARDS: "#flashcards",
    REVIEW: "#review",
    EDIT_LATER: "#edit-later",
} as const;

// ============================================================================
// Compact Review Button Icons
// ============================================================================

export const COMPACT_BUTTON_ICONS = {
    HARD: "x",
    GOOD: "minus",
    EASY: "check",
} as const;

// ============================================================================
// Compact Review Button Positions
// ============================================================================

export const COMPACT_BUTTON_POSITIONS = {
    TOP_RIGHT: "top-right",
    TOP_LEFT: "top-left",
    BOTTOM_RIGHT: "bottom-right",
    BOTTOM_LEFT: "bottom-left",
} as const;

export type CompactButtonPosition =
    (typeof COMPACT_BUTTON_POSITIONS)[keyof typeof COMPACT_BUTTON_POSITIONS];

// ============================================================================
// Sidebar Settings
// ============================================================================

export const SIDEBAR_DATE_FORMATS = {
    DEFAULT: "ddd MMM DD.YY",
    ISO: "YYYY-MM-DD",
    US: "MM/DD/YYYY",
    EU: "DD/MM/YYYY",
} as const;

// ============================================================================
// Flashcard Dimensions (Percentage)
// ============================================================================

export const FLASHCARD_DIMENSIONS = {
    DESKTOP: {
        HEIGHT: 80,
        WIDTH: 40,
    },
    MOBILE: {
        HEIGHT: 100,
        WIDTH: 100,
    },
} as const;

// ============================================================================
// Timing Constants (milliseconds)
// ============================================================================

export const TIMING_CONSTANTS = {
    COMPACT_BUTTON_AUTO_HIDE_DELAY: 5000, // 5 seconds
    COMPACT_BUTTON_UNDO_TIMEOUT: 5000, // 5 seconds
    REVIEW_BUTTON_DELAY: 0, // No delay by default
} as const;

// ============================================================================
// Queue Mix Ratios
// ============================================================================

export const QUEUE_MIX_DEFAULTS = {
    DUE: 3,
    NEW: 2,
    CARD: 4,
    NOTE: 1,
} as const;

// ============================================================================
// Algorithm Parameters
// ============================================================================

export const ALGORITHM_PARAMS = {
    BASE_EASE: 250,
    LAPSES_INTERVAL_CHANGE: 0.5,
    EASY_BONUS: 1.3,
    MAXIMUM_INTERVAL: 36525, // ~100 years in days
    MAX_LINK_FACTOR: 1.0,
} as const;

// ============================================================================
// Sidebar Limits
// ============================================================================

export const SIDEBAR_LIMITS = {
    INITIAL_GROUPS: 20,
    INITIAL_NOTES: 10,
} as const;

// ============================================================================
// Note Review Settings
// ============================================================================

export const NOTE_REVIEW_SETTINGS = {
    MAX_DAYS_REVIEW_QUEUE: 365,
    MAX_NEW_PER_DAY_UNLIMITED: -1,
} as const;

// ============================================================================
// Flashcard Order Options
// ============================================================================

export const FLASHCARD_ORDER = {
    CARD: {
        DUE_FIRST_RANDOM: "DueFirstRandom",
        DUE_FIRST_SEQUENTIAL: "DueFirstSequential",
        NEW_FIRST_RANDOM: "NewFirstRandom",
        NEW_FIRST_SEQUENTIAL: "NewFirstSequential",
    },
    DECK: {
        PREV_DECK_COMPLETE_SEQUENTIAL: "PrevDeckComplete_Sequential",
        PREV_DECK_COMPLETE_RANDOM: "PrevDeckComplete_Random",
    },
} as const;

// ============================================================================
// Response Bar Position
// ============================================================================

export const RESPONSE_BAR_POSITION = {
    DEFAULT_PERCENTAGE: 5,
    MIN: 0,
    MAX: 100,
} as const;

// ============================================================================
// File Patterns
// ============================================================================

export const FILE_PATTERNS = {
    EXCALIDRAW: "**/*.excalidraw.md",
} as const;

// ============================================================================
// Data Storage Options
// ============================================================================

export const DATA_STORAGE = {
    NOTES: "NOTES",
    JSON: "JSON",
} as const;

// ============================================================================
// Default Flashcard Rule IDs
// ============================================================================

export const DEFAULT_RULE_IDS = {
    INLINE: "default-inline-flashcards",
    HEADER_LEVELS: "default-header-levels",
    HEADER_RANGES: "default-header-ranges",
    MULTILINE: "default-multiline-flashcards",
    CLOZE: "default-cloze-flashcards",
} as const;

// ============================================================================
// Header Levels
// ============================================================================

export const HEADER_LEVELS = {
    ALL: [1, 2, 3, 4, 5, 6],
    MIN: 1,
    MAX: 6,
} as const;
