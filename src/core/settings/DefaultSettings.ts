import { Platform } from "obsidian";
import { t } from "src/lang/helpers";
import { CardSortType, NoteSortType, SidebarViewMode, SortType } from "src/gui/sidebar/types";
import { algorithms } from "src/algorithms/algorithms_switch";
import { DataLocation } from "src/dataStore/dataLocation";
import { DEFAULT_responseOptionBtnsText } from "src/gui/settings-views/algorithmSetting";
import { SRSettings } from "./SRSettings";
import * as C from "./SettingsConstants";

export const DEFAULT_SETTINGS: SRSettings = {
    // flashcards
    responseOptionBtnsText: DEFAULT_responseOptionBtnsText,

    // Unified flashcard tag rules (v3)
    flashcardRules: [
        // Default inline rule
        {
            id: C.DEFAULT_RULE_IDS.INLINE,
            name: "Inline Flashcards",
            tagPattern: `^${C.DEFAULT_TAGS.FLASHCARDS}$`,
            enabled: true,
            priority: 0,
            type: "inline",
            config: {
                separator: C.FLASHCARD_SEPARATORS.SINGLE_LINE,
                separatorReverse: C.FLASHCARD_SEPARATORS.SINGLE_LINE_REVERSED,
                startOfLineOnly: false,
            },
        },
        // Header-based rules with regex (h1-h6)
        {
            id: C.DEFAULT_RULE_IDS.HEADER_LEVELS,
            name: "Header Levels (h1-h6)",
            tagPattern: `^${C.DEFAULT_TAGS.FLASHCARDS}/h[1-6]$`,
            enabled: true,
            priority: 0,
            type: "header",
            config: {
                selection: {
                    levels: [1, 2, 3, 4, 5, 6],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            },
        },
        // Header-based rules with regex (ranges like h2-h3, h1-h4, etc.)
        {
            id: C.DEFAULT_RULE_IDS.HEADER_RANGES,
            name: "Header Ranges (h1-h3, h2-h4, etc.)",
            tagPattern: `^${C.DEFAULT_TAGS.FLASHCARDS}/h[1-6]-h[1-6]$`,
            enabled: true,
            priority: 0,
            type: "header",
            config: {
                selection: {
                    levels: [1, 2, 3, 4, 5, 6],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: true,
                    stripTags: false,
                },
            },
        },
        // Default multiline rule
        {
            id: C.DEFAULT_RULE_IDS.MULTILINE,
            name: "Multiline Flashcards",
            tagPattern: `^${C.DEFAULT_TAGS.FLASHCARDS}$`,
            enabled: true,
            priority: 0,
            type: "multiline",
            config: {
                questionLinePattern: "",
                stopCondition: { 
                    type: "separator", 
                    separator: C.FLASHCARD_SEPARATORS.MULTILINE,
                },
            },
        },
        // Default cloze rule
        {
            id: C.DEFAULT_RULE_IDS.CLOZE,
            name: "Cloze Flashcards",
            tagPattern: `^${C.DEFAULT_TAGS.FLASHCARDS}$`,
            enabled: true,
            priority: 0,
            type: "inline",
            config: {
                separator: C.FLASHCARD_SEPARATORS.SINGLE_LINE,
                separatorReverse: C.FLASHCARD_SEPARATORS.SINGLE_LINE_REVERSED,
                startOfLineOnly: false,
                cloze: {
                    enabled: true,
                    patterns: [{ pattern: C.CLOZE_PATTERNS.DEFAULT }],
                },
            },
        },
    ],

    convertFoldersToDecks: false,
    burySiblingCards: false,
    burySiblingCardsByNoteReview: false,
    multiClozeCard: false,
    cardBlockID: false,
    randomizeCardOrder: false,
    flashcardCardOrder: C.FLASHCARD_ORDER.CARD.DUE_FIRST_RANDOM,
    flashcardDeckOrder: C.FLASHCARD_ORDER.DECK.PREV_DECK_COMPLETE_SEQUENTIAL,

    convertHighlightsToClozes: true,
    convertBoldTextToClozes: false,
    convertCurlyBracketsToClozes: false,
    clozePatterns: C.DEFAULT_CLOZE_PATTERNS,
    singleLineCardSeparator: C.FLASHCARD_SEPARATORS.SINGLE_LINE,
    singleLineReversedCardSeparator: C.FLASHCARD_SEPARATORS.SINGLE_LINE_REVERSED,
    multilineCardSeparator: C.FLASHCARD_SEPARATORS.MULTILINE,
    multilineReversedCardSeparator: C.FLASHCARD_SEPARATORS.MULTILINE_REVERSED,
    multilineCardEndMarker: C.FLASHCARD_SEPARATORS.MULTILINE_END_MARKER,
    editLaterTag: C.DEFAULT_TAGS.EDIT_LATER,
    intervalShowHide: true,

    // notes
    enableNoteReviewPaneOnStartup: true,
    tagsToReview: [C.DEFAULT_TAGS.REVIEW],
    noteFoldersToIgnore: [C.FILE_PATTERNS.EXCALIDRAW],
    tagsToIgnore: [],
    openRandomNote: false,
    autoNextNote: false,
    showCompactReviewButtons: true,
    compactReviewButtonsCollapsed: false,
    compactReviewButtonsPosition: C.COMPACT_BUTTON_POSITIONS.TOP_RIGHT,
    compactReviewButtonsAutoHide: false,
    compactReviewButtonsAutoHideDelay: C.TIMING_CONSTANTS.COMPACT_BUTTON_AUTO_HIDE_DELAY / 1000, // Convert to seconds
    compactReviewButtonsIcons: {
        hard: C.COMPACT_BUTTON_ICONS.HARD,
        good: C.COMPACT_BUTTON_ICONS.GOOD,
        easy: C.COMPACT_BUTTON_ICONS.EASY,
    },
    compactReviewButtonsUndoTimeout: C.TIMING_CONSTANTS.COMPACT_BUTTON_UNDO_TIMEOUT,
    mixDue: C.QUEUE_MIX_DEFAULTS.DUE,
    mixNew: C.QUEUE_MIX_DEFAULTS.NEW,
    mixCardNote: false,
    mixCard: C.QUEUE_MIX_DEFAULTS.CARD,
    mixNote: C.QUEUE_MIX_DEFAULTS.NOTE,
    reviewResponseFloatBar: false,
    responseBarPositionPercentage: C.RESPONSE_BAR_POSITION.DEFAULT_PERCENTAGE,
    reviewingNoteDirectly: false,
    disableFileMenuReviewOptions: false,
    maxNDaysNotesReviewQueue: C.NOTE_REVIEW_SETTINGS.MAX_DAYS_REVIEW_QUEUE,

    // UI settings
    showRibbonIcon: true,
    showStatusBar: true,
    initiallyExpandAllSubdecksInTree: false,
    showContextInCards: true,
    showIntervalInReviewButtons: true,
    flashcardHeightPercentage: Platform.isMobile 
        ? C.FLASHCARD_DIMENSIONS.MOBILE.HEIGHT 
        : C.FLASHCARD_DIMENSIONS.DESKTOP.HEIGHT,
    flashcardWidthPercentage: Platform.isMobile 
        ? C.FLASHCARD_DIMENSIONS.MOBILE.WIDTH 
        : C.FLASHCARD_DIMENSIONS.DESKTOP.WIDTH,
    flashcardEasyText: t("EASY"),
    flashcardGoodText: t("GOOD"),
    flashcardHardText: t("HARD"),
    reviewButtonDelay: C.TIMING_CONSTANTS.REVIEW_BUTTON_DELAY,
    openViewInNewTab: false,
    sidebarDateFormat: C.SIDEBAR_DATE_FORMATS.DEFAULT,
    sidebarShowRelativeDays: true,
    sidebarSortOrder: SortType.DATE_ASC,
    sidebarNoteSortOrder: NoteSortType.DEFAULT,
    sidebarCardSortOrder: CardSortType.DEFAULT,
    sidebarViewMode: SidebarViewMode.Notes,
    sidebarInitialGroupsLimit: C.SIDEBAR_LIMITS.INITIAL_GROUPS,
    sidebarInitialNotesLimit: C.SIDEBAR_LIMITS.INITIAL_NOTES,
    sidebarSmartGroups: false,
    showNextReviewInNotice: true,

    // Deck icon customization - empty by default, users can add their own
    deckIconStyles: {},

    // algorithm
    baseEase: C.ALGORITHM_PARAMS.BASE_EASE,
    lapsesIntervalChange: C.ALGORITHM_PARAMS.LAPSES_INTERVAL_CHANGE,
    easyBonus: C.ALGORITHM_PARAMS.EASY_BONUS,
    loadBalance: true,
    maximumInterval: C.ALGORITHM_PARAMS.MAXIMUM_INTERVAL,
    maxLinkFactor: C.ALGORITHM_PARAMS.MAX_LINK_FACTOR,

    // storage
    dataStore: C.DATA_STORAGE.NOTES,
    cardCommentOnSameLine: false,

    // logging
    showSchedulingDebugMessages: false,
    showParserDebugMessages: false,

    // trackfile: https://github.com/martin-jw/obsidian-recall/blob/main/src/settings.ts
    dataLocation: DataLocation.SaveOnNoteFile,
    customFolder: "",
    maxNewPerDay: C.NOTE_REVIEW_SETTINGS.MAX_NEW_PER_DAY_UNLIMITED,
    repeatItems: false,
    trackedNoteToDecks: false,
    untrackWithReviewTag: false,
    algorithm: Object.keys(algorithms)[0],
    algorithmSettings: { algorithm: Object.values(algorithms)[0].settings },
    previousRelease: "0.0.0",
};
