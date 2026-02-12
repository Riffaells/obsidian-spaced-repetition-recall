/**
 * Type definitions for settings categories.
 * This provides better organization and type safety for settings.
 */

import { FlashcardRule } from "../../parser/rule-based/types";
import { DataLocation } from "../../dataStore/dataLocation";
import {
    CardSortType,
    NoteSortType,
    SidebarViewMode,
    SortType,
} from "../../gui/sidebar/types";
import { CompactButtonPosition } from "./SettingsConstants";

// ============================================================================
// Flashcard Settings
// ============================================================================

export interface FlashcardSettings {
    // Response button text per algorithm
    responseOptionBtnsText: Record<string, string[]>;

    // Unified flashcard tag rules (v3)
    flashcardRules: FlashcardRule[];

    // Deck and card behavior
    convertFoldersToDecks: boolean;
    burySiblingCards: boolean;
    burySiblingCardsByNoteReview: boolean;
    multiClozeCard: boolean;
    cardBlockID: boolean;
    randomizeCardOrder: boolean | null;
    flashcardCardOrder: string;
    flashcardDeckOrder: string;

    // Cloze settings
    convertHighlightsToClozes: boolean;
    convertBoldTextToClozes: boolean;
    convertCurlyBracketsToClozes: boolean;
    clozePatterns: string[];

    // Separators
    singleLineCardSeparator: string;
    singleLineReversedCardSeparator: string;
    multilineCardSeparator: string;
    multilineReversedCardSeparator: string;
    multilineCardEndMarker: string;

    // Tags
    editLaterTag: string;

    // Display
    intervalShowHide: boolean;
}

// ============================================================================
// Note Review Settings
// ============================================================================

export interface NoteReviewSettings {
    // Startup
    enableNoteReviewPaneOnStartup: boolean;

    // Tags and folders
    tagsToReview: string[];
    noteFoldersToIgnore: string[];
    tagsToIgnore: string[];

    // Behavior
    openRandomNote: boolean;
    autoNextNote: boolean;

    // Compact review buttons
    showCompactReviewButtons: boolean;
    compactReviewButtonsCollapsed?: boolean;
    compactReviewButtonsPosition: CompactButtonPosition;
    compactReviewButtonsAutoHide: boolean;
    compactReviewButtonsAutoHideDelay: number; // seconds
    compactReviewButtonsIcons: {
        hard: string;
        good: string;
        easy: string;
    };
    compactReviewButtonsUndoTimeout: number; // milliseconds

    // Queue mixing
    mixDue: number;
    mixNew: number;
    mixCardNote: boolean;
    mixCard: number;
    mixNote: number;

    // Float bar
    reviewResponseFloatBar: boolean;
    responseBarPositionPercentage: number;

    // Direct review
    reviewingNoteDirectly: boolean;
    disableFileMenuReviewOptions: boolean;

    // Limits
    maxNDaysNotesReviewQueue: number;
}

// ============================================================================
// UI Preferences
// ============================================================================

export interface UIPreferences {
    // Visibility
    showRibbonIcon: boolean;
    showStatusBar: boolean;

    // Deck tree
    initiallyExpandAllSubdecksInTree: boolean;

    // Card display
    showContextInCards: boolean;
    showIntervalInReviewButtons: boolean;
    flashcardHeightPercentage: number;
    flashcardWidthPercentage: number;

    // Button text
    flashcardEasyText: string;
    flashcardGoodText: string;
    flashcardHardText: string;
    reviewButtonDelay: number;

    // View behavior
    openViewInNewTab: boolean;

    // Sidebar
    sidebarDateFormat: string;
    sidebarShowRelativeDays: boolean;
    sidebarSortOrder: SortType;
    sidebarNoteSortOrder: NoteSortType;
    sidebarCardSortOrder: CardSortType;
    sidebarViewMode: SidebarViewMode;
    sidebarInitialGroupsLimit: number;
    sidebarInitialNotesLimit: number;
    sidebarSmartGroups: boolean;

    // Notifications
    showNextReviewInNotice: boolean;
}

// ============================================================================
// Algorithm Settings
// ============================================================================

export interface AlgorithmSettings {
    algorithm: string;
    baseEase: number;
    lapsesIntervalChange: number;
    easyBonus: number;
    loadBalance: boolean;
    maximumInterval: number;
    maxLinkFactor: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    algorithmSettings: any;
}

// ============================================================================
// Storage Settings
// ============================================================================

export interface StorageSettings {
    dataStore: string;
    cardCommentOnSameLine: boolean;
    dataLocation: DataLocation;
    customFolder: string;
}

// ============================================================================
// Tracking Settings
// ============================================================================

export interface TrackingSettings {
    maxNewPerDay: number;
    repeatItems: boolean;
    trackedNoteToDecks: boolean;
    untrackWithReviewTag: boolean;
}

// ============================================================================
// Debug Settings
// ============================================================================

export interface DebugSettings {
    showSchedulingDebugMessages: boolean;
    showParserDebugMessages: boolean;
}

// ============================================================================
// Metadata
// ============================================================================

export interface SettingsMetadata {
    previousRelease: string;
}
