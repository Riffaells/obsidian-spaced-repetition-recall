import { Platform } from "obsidian";
import { t } from "src/lang/helpers";
import { NoteSortType, SidebarViewMode, SortType } from "src/gui/sidebar/types";
import { algorithms } from "src/algorithms/algorithms_switch";
import { DataLocation } from "src/dataStore/dataLocation";
import { DEFAULT_responseOptionBtnsText } from "src/gui/settings-views/algorithmSetting";
import { SRSettings } from "./SRSettings";

export const DEFAULT_SETTINGS: SRSettings = {
    // flashcards
    responseOptionBtnsText: DEFAULT_responseOptionBtnsText,

    // Unified flashcard tag rules (v3)
    flashcardRules: [
        // Default inline rule
        {
            id: "default-inline-flashcards",
            name: "Inline Flashcards",
            tagPattern: "^#flashcards$",
            enabled: true,
            priority: 0,
            type: "inline",
            config: {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            },
        },
        // Header-based rules with regex (h1-h6)
        {
            id: "default-header-levels",
            name: "Header Levels (h1-h6)",
            tagPattern: "^#flashcards/h[1-6]$",
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
            id: "default-header-ranges",
            name: "Header Ranges (h1-h3, h2-h4, etc.)",
            tagPattern: "^#flashcards/h[1-6]-h[1-6]$",
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
            id: "default-multiline-flashcards",
            name: "Multiline Flashcards",
            tagPattern: "^#flashcards$",
            enabled: true,
            priority: 0,
            type: "multiline",
            config: {
                questionLinePattern: "",
                stopCondition: { type: "separator", separator: "?" },
            },
        },
        // Default cloze rule
        {
            id: "default-cloze-flashcards",
            name: "Cloze Flashcards",
            tagPattern: "^#flashcards$",
            enabled: true,
            priority: 0,
            type: "inline",
            config: {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
                cloze: {
                    enabled: true,
                    patterns: [{ pattern: "==[123;;]answer[;;hint]==" }],
                },
            },
        },
    ],

    convertFoldersToDecks: false,
    burySiblingCards: false,
    burySiblingCardsByNoteReview: false,
    multiClozeCard: false,
    cardBlockID: false,
    randomizeCardOrder: null,
    flashcardCardOrder: "DueFirstRandom",
    flashcardDeckOrder: "PrevDeckComplete_Sequential",

    convertHighlightsToClozes: true,
    convertBoldTextToClozes: false,
    convertCurlyBracketsToClozes: false,
    clozePatterns: ["==[123;;]answer[;;hint]=="],
    singleLineCardSeparator: "::",
    singleLineReversedCardSeparator: ":::",
    multilineCardSeparator: "?",
    multilineReversedCardSeparator: "??",
    multilineCardEndMarker: "",
    editLaterTag: "#edit-later",
    intervalShowHide: true,

    // notes
    enableNoteReviewPaneOnStartup: true,
    tagsToReview: ["#review"],
    noteFoldersToIgnore: ["**/*.excalidraw.md"],
    tagsToIgnore: [],
    openRandomNote: false,
    autoNextNote: false,
    showCompactReviewButtons: true,
    compactReviewButtonsCollapsed: false,
    compactReviewButtonsPosition: "top-right",
    compactReviewButtonsAutoHide: false,
    compactReviewButtonsAutoHideDelay: 5,
    compactReviewButtonsIcons: {
        hard: "x",
        good: "minus",
        easy: "check",
    },
    mixDue: 3,
    mixNew: 2,
    mixCardNote: false,
    mixCard: 4,
    mixNote: 1,
    reviewResponseFloatBar: false,
    responseBarPositionPercentage: 5,
    reviewingNoteDirectly: false,
    disableFileMenuReviewOptions: false,
    maxNDaysNotesReviewQueue: 365,

    // UI settings
    showRibbonIcon: true,
    showStatusBar: true,
    initiallyExpandAllSubdecksInTree: false,
    showContextInCards: true,
    showIntervalInReviewButtons: true,
    flashcardHeightPercentage: Platform.isMobile ? 100 : 80,
    flashcardWidthPercentage: Platform.isMobile ? 100 : 40,
    flashcardEasyText: t("EASY"),
    flashcardGoodText: t("GOOD"),
    flashcardHardText: t("HARD"),
    reviewButtonDelay: 0,
    openViewInNewTab: false,
    sidebarDateFormat: "ddd MMM DD.YY",
    sidebarShowRelativeDays: true,
    sidebarSortOrder: SortType.DATE_ASC,
    sidebarNoteSortOrder: NoteSortType.DEFAULT,
    sidebarViewMode: SidebarViewMode.Notes,

    // algorithm
    baseEase: 250,
    lapsesIntervalChange: 0.5,
    easyBonus: 1.3,
    loadBalance: true,
    maximumInterval: 36525,
    maxLinkFactor: 1.0,

    // storage
    // dataStore: DataStoreName.NOTES,
    dataStore: "NOTES",
    cardCommentOnSameLine: false,

    // logging
    showSchedulingDebugMessages: false,
    showParserDebugMessages: false,

    // trackfile: https://github.com/martin-jw/obsidian-recall/blob/main/src/settings.ts
    dataLocation: DataLocation.SaveOnNoteFile,
    customFolder: "",
    maxNewPerDay: -1,
    repeatItems: false,
    trackedNoteToDecks: false,
    untrackWithReviewTag: false,
    algorithm: Object.keys(algorithms)[0],
    algorithmSettings: { algorithm: Object.values(algorithms)[0].settings },
    previousRelease: "0.0.0",
};
