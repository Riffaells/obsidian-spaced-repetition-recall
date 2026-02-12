import { CardSortType, NoteSortType, SidebarViewMode, SortType } from "../../gui/sidebar/types";
import { DataLocation } from "../../dataStore/dataLocation";
import { FlashcardRule } from "../../parser/rule-based/types";

export interface SRSettings {
    // flashcards
    responseOptionBtnsText: Record<string, string[]>;

    /**
     * Unified flashcard tag rules (v3)
     * Replaces flashcardTags, headerCardCustomTags
     */
    flashcardRules: FlashcardRule[];

    convertFoldersToDecks: boolean;
    burySiblingCards: boolean;
    burySiblingCardsByNoteReview: boolean;
    multiClozeCard: boolean;
    cardBlockID: boolean;
    randomizeCardOrder: boolean;
    flashcardCardOrder: string;
    flashcardDeckOrder: string;
    convertHighlightsToClozes: boolean;
    convertBoldTextToClozes: boolean;
    convertCurlyBracketsToClozes: boolean;
    clozePatterns: string[];
    singleLineCardSeparator: string;
    singleLineReversedCardSeparator: string;
    multilineCardSeparator: string;
    multilineReversedCardSeparator: string;
    multilineCardEndMarker: string;
    editLaterTag: string;
    intervalShowHide: boolean;

    // notes
    enableNoteReviewPaneOnStartup: boolean;
    tagsToReview: string[];
    noteFoldersToIgnore: string[];
    tagsToIgnore: string[];
    openRandomNote: boolean;
    autoNextNote: boolean;
    showCompactReviewButtons: boolean;
    compactReviewButtonsCollapsed?: boolean;
    compactReviewButtonsPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    compactReviewButtonsAutoHide: boolean;
    compactReviewButtonsAutoHideDelay: number; // seconds
    compactReviewButtonsIcons: {
        hard: string;
        good: string;
        easy: string;
    };
    compactReviewButtonsUndoTimeout: number; // milliseconds
    mixDue: number;
    mixNew: number;
    mixCardNote: boolean;
    mixCard: number;
    mixNote: number;
    reviewResponseFloatBar: boolean;
    responseBarPositionPercentage: number;
    reviewingNoteDirectly: boolean;
    disableFileMenuReviewOptions: boolean;
    maxNDaysNotesReviewQueue: number;

    // UI preferences
    showRibbonIcon: boolean;
    showStatusBar: boolean;
    initiallyExpandAllSubdecksInTree: boolean;
    showContextInCards: boolean;
    showIntervalInReviewButtons: boolean;
    flashcardHeightPercentage: number;
    flashcardWidthPercentage: number;
    flashcardEasyText: string;
    flashcardGoodText: string;
    flashcardHardText: string;
    reviewButtonDelay: number;
    openViewInNewTab: boolean;
    sidebarDateFormat: string;
    sidebarShowRelativeDays: boolean;
    sidebarSortOrder: SortType;
    sidebarNoteSortOrder: NoteSortType;
    sidebarCardSortOrder: CardSortType;
    sidebarViewMode: SidebarViewMode;
    sidebarInitialGroupsLimit: number;
    sidebarInitialNotesLimit: number;
    sidebarSmartGroups: boolean;
    showNextReviewInNotice: boolean;

    // Deck icon customization
    deckIconStyles: Record<string, {
        icon?: string;
        iconColor?: string;
        textColor?: string;
        backgroundColor?: string;
        borderColor?: string;
        emoji?: string;
    }>;

    // algorithm
    algorithm: string;
    baseEase: number;
    lapsesIntervalChange: number;
    easyBonus: number;
    loadBalance: boolean;
    maximumInterval: number;
    maxLinkFactor: number;

    // storage
    dataStore: string;
    cardCommentOnSameLine: boolean;

    // logging
    showSchedulingDebugMessages: boolean;
    showParserDebugMessages: boolean;

    // trackfile: https://github.com/martin-jw/obsidian-recall/blob/main/src/settings.ts
    dataLocation: DataLocation;
    customFolder: string;
    maxNewPerDay: number;
    repeatItems: boolean;
    trackedNoteToDecks: boolean;
    untrackWithReviewTag: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    algorithmSettings: any;

    previousRelease: string;
}
