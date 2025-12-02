import { Platform } from "obsidian";
import { t } from "src/lang/helpers";
import { NoteSortType, SidebarViewMode, SortType } from "./gui/sidebar/types";
import { algorithms } from "./algorithms/algorithms_switch";
import { DataLocation } from "./dataStore/dataLocation";
import { DEFAULT_responseOptionBtnsText } from "./settings/algorithmSetting";
import { pathMatchesPattern } from "src/utils/fs";
import { FlashcardTagRule } from "./parser/header-based/types";

export interface SRSettings {
    // flashcards
    responseOptionBtnsText: Record<string, string[]>;

    /**
     * Unified flashcard tag rules (v3)
     * Replaces flashcardTags, headerCardCustomTags
     */
    flashcardTagRules: FlashcardTagRule[];
    
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
    compactReviewButtonIcons: {
        hard: string;
        good: string;
        easy: string;
    };
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
    sidebarViewMode: SidebarViewMode;

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

export const DEFAULT_SETTINGS: SRSettings = {
    // flashcards
    responseOptionBtnsText: DEFAULT_responseOptionBtnsText,

    // Unified flashcard tag rules (v3)
    flashcardTagRules: [
        // Default inline rule
        {
            id: "default-inline-flashcards",
            name: "Inline Flashcards",
            tagExact: "#flashcards",
            enabled: true,
            priority: 0,
            source: "inline",
            inlineRules: {
                separator: "::",
            },
        },
        // Header-based rules with regex (h1-h6)
        {
            id: "default-header-levels",
            name: "Header Levels (h1-h6)",
            tagPattern: "^#flashcards/h[1-6]$",
            patternFlags: "",
            enabled: true,
            priority: 0,
            source: "header",
            headerRules: {
                headingLevels: [1, 2, 3, 4, 5, 6],
                nestingMode: "nested",
                selectors: [],
                includeParents: 1,
                cardMode: "qa",
                qaSeparator: "?",
            },
        },
        // Header-based rules with regex (ranges like h2-h3, h1-h4, etc.)
        {
            id: "default-header-ranges",
            name: "Header Ranges (h1-h3, h2-h4, etc.)",
            tagPattern: "^#flashcards/h[1-6]-h[1-6]$",
            patternFlags: "",
            enabled: true,
            priority: 0,
            source: "header",
            headerRules: {
                headingLevels: [1, 2, 3, 4, 5, 6],
                nestingMode: "nested",
                selectors: [],
                includeParents: 1,
                cardMode: "qa",
                qaSeparator: "?",
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
    compactReviewButtonIcons: {
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

// Migration code removed - no longer needed for beta version

export class SettingsUtil {
    // Cache compiled regex patterns to avoid recompiling
    private static patternCache = new Map<string, RegExp>();

    // Cache of valid flashcard tags found in the vault
    private static validTagCache: Set<string> | null = null;

    /**
     * Check if a tag matches any enabled flashcard rule (optimized)
     */
    static isFlashcardTag(settings: SRSettings, tag: string): boolean {
        // Fast path: check enabled rules only
        for (const rule of settings.flashcardTagRules) {
            if (!rule.enabled) continue;

            if (rule.tagExact) {
                if (SettingsUtil.tagMatchesRule(tag, rule.tagExact)) {
                    return true;
                }
            } else if (rule.tagPattern) {
                const pattern = SettingsUtil.getCompiledPattern(
                    rule.id,
                    rule.tagPattern,
                    rule.patternFlags,
                );
                if (pattern && pattern.test(tag)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get all flashcard rules that match a given tag
     */
    static getMatchingFlashcardRules(settings: SRSettings, tag: string): FlashcardTagRule[] {
        const matches: FlashcardTagRule[] = [];

        for (const rule of settings.flashcardTagRules) {
            if (!rule.enabled) continue;

            if (rule.tagExact) {
                if (SettingsUtil.tagMatchesRule(tag, rule.tagExact)) {
                    matches.push(rule);
                }
            } else if (rule.tagPattern) {
                const pattern = SettingsUtil.getCompiledPattern(
                    rule.id,
                    rule.tagPattern,
                    rule.patternFlags,
                );
                if (pattern && pattern.test(tag)) {
                    matches.push(rule);
                }
            }
        }

        return matches;
    }

    /**
     * Get compiled regex pattern from cache or compile new one
     */
    private static getCompiledPattern(
        ruleId: string,
        patternSource: string,
        flags?: string,
    ): RegExp | null {
        const cacheKey = `${ruleId}:${patternSource}:${flags || ""}`;
        
        let pattern = SettingsUtil.patternCache.get(cacheKey);
        if (!pattern) {
            try {
                pattern = new RegExp(patternSource, flags || "");
                SettingsUtil.patternCache.set(cacheKey, pattern);
            } catch (e) {
                console.error(`Invalid regex pattern in rule ${ruleId}:`, e);
                return null;
            }
        }
        
        return pattern;
    }

    /**
     * Clear pattern cache (call when rules are updated)
     */
    static clearPatternCache(): void {
        SettingsUtil.patternCache.clear();
        SettingsUtil.validTagCache = null;
    }

    /**
     * Build the cache of valid flashcard tags from the vault
     * This optimizes scanning by pre-calculating which tags match our rules
     */
    static buildTagCache(app: any, settings: SRSettings): void {
        const cache = new Set<string>();
        // Get all unique tags from the metadata cache
        // @ts-ignore
        const allTags = app.metadataCache.getTags();
        
        for (const tag of Object.keys(allTags)) {
            if (SettingsUtil.isFlashcardTag(settings, tag)) {
                cache.add(tag);
            }
        }
        
        SettingsUtil.validTagCache = cache;
        console.log(`SR: Built tag cache with ${cache.size} valid tags`);
    }

    /**
     * Check if a tag matches any enabled flashcard rule using the cache
     * Falls back to normal check if cache is not built
     */
    static isFlashcardTagCached(settings: SRSettings, tag: string): boolean {
        if (SettingsUtil.validTagCache) {
            return SettingsUtil.validTagCache.has(tag);
        }
        return SettingsUtil.isFlashcardTag(settings, tag);
    }

    /**
     * Get all enabled inline flashcard tags
     */
    static getInlineFlashcardTags(settings: SRSettings): string[] {
        const tags: string[] = [];
        for (const rule of settings.flashcardTagRules) {
            if (rule.enabled && rule.source === "inline" && rule.tagExact) {
                tags.push(rule.tagExact);
            }
        }
        return tags;
    }

    /**
     * Get all enabled header-based flashcard tags
     */
    static getHeaderFlashcardTags(settings: SRSettings): string[] {
        const tags: string[] = [];
        for (const rule of settings.flashcardTagRules) {
            if (rule.enabled && rule.source === "header" && rule.tagExact) {
                tags.push(rule.tagExact);
            }
        }
        return tags;
    }

    /**
     * Check if tag matches a rule pattern (supports hierarchical tags)
     */
    private static tagMatchesRule(tag: string, ruleTag: string): boolean {
        // Exact match or hierarchical match (e.g., #flashcards/math matches #flashcards)
        return tag === ruleTag || tag.startsWith(ruleTag + "/");
    }

    static isPathInNoteIgnoreFolder(settings: SRSettings, path: string): boolean {
        return settings.noteFoldersToIgnore.some((folder) => pathMatchesPattern(path, folder));
    }

    static isAnyTagANoteReviewTag(settings: SRSettings, tags: string[]): boolean {
        for (const tag of tags) {
            if (
                settings.tagsToReview.some(
                    (tagToReview) => tag === tagToReview || tag.startsWith(tagToReview + "/"),
                )
            ) {
                return true;
            }
        }
        return false;
    }

    // Given a list of tags, return the subset that is in settings.tagsToReview
    static filterForNoteReviewTag(settings: SRSettings, tags: string[]): string[] {
        const result: string[] = [];
        for (const tagToReview of settings.tagsToReview) {
            if (tags.some((tag) => tag === tagToReview || tag.startsWith(tagToReview + "/"))) {
                result.push(tagToReview);
            }
        }
        return result;
    }
}
