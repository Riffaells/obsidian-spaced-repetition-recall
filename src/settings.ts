import { Platform } from "obsidian";
import { t } from "src/lang/helpers";
import { NoteSortType, SidebarViewMode, SortType } from "./gui/sidebar/types";
import { algorithms } from "./algorithms/algorithms_switch";
import { DataLocation } from "./dataStore/dataLocation";
import { DEFAULT_responseOptionBtnsText } from "./settings/algorithmSetting";
import { pathMatchesPattern } from "src/utils/fs";
import { HeaderCardConfig, FlashcardTagRule } from "./parser/header-based/types";

export interface SRSettings {
    // flashcards
    responseOptionBtnsText: Record<string, string[]>;

    /**
     * Unified flashcard tag rules (v3)
     * Replaces flashcardTags, headerCardCustomTags
     */
    flashcardTagRules: FlashcardTagRule[];
    
    /**
     * @deprecated Use flashcardTagRules instead
     * Kept for migration purposes
     */
    flashcardTags?: string[];
    
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
    
    // header-based flashcards
    /**
     * @deprecated Use flashcardTagRules instead
     * Kept for migration purposes
     */
    enableHeaderBasedCards?: boolean;
    
    /** 
     * Base configuration for header-based flashcards.
     * Used as default when header config is not specified in rule
     * @deprecated Will be merged into flashcardTagRules
     */
    headerCardBaseConfig?: {
        headingLevels: number[];        // [2] by default
        mode: "qa" | "all";             // "qa" by default
        nestingMode: "nested" | "flat"; // "nested" by default
    };
    
    /**
     * @deprecated Use flashcardTagRules instead
     * Kept for migration purposes
     */
    headerCardCustomTags?: Record<string, HeaderCardConfig>;
    
    /**
     * @deprecated Use includeParents in flashcardTagRules instead
     */
    headerCardShowContext?: boolean;
    
    // notes
    enableNoteReviewPaneOnStartup: boolean;
    tagsToReview: string[];
    noteFoldersToIgnore: string[];
    tagsToIgnore: string[];
    openRandomNote: boolean;
    autoNextNote: boolean;
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

    // Legacy fields (kept for backward compatibility)
    flashcardTags: ["#flashcards"],
    enableHeaderBasedCards: false,
    headerCardBaseConfig: {
        headingLevels: [2],
        mode: "qa",
        nestingMode: "nested",
    },
    headerCardCustomTags: {},
    headerCardShowContext: true,
    
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

export function upgradeSettings(settings: SRSettings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsAny = settings as any;

    // Legacy migration: v1 → v2 (for users who haven't upgraded yet)
    // This must run BEFORE flashcardTagRules migration as flashcardTagRules migration might initialize headerCardBaseConfig
    if (settingsAny.headerCardDefaultConfig != null && settings.headerCardBaseConfig == null) {
        settings.headerCardBaseConfig = {
            headingLevels: settingsAny.headerCardDefaultConfig.headingLevels != null ? settingsAny.headerCardDefaultConfig.headingLevels : [2],
            mode: settingsAny.headerCardDefaultConfig.mode != null ? settingsAny.headerCardDefaultConfig.mode : "qa",
            nestingMode: settingsAny.headerCardDefaultConfig.nestingMode != null ? settingsAny.headerCardDefaultConfig.nestingMode : "nested",
        };
        delete settingsAny.headerCardDefaultConfig;
        console.log("Migrated headerCardDefaultConfig to headerCardBaseConfig");
    }

    if (
        settings.randomizeCardOrder != null &&
        settings.flashcardCardOrder == null &&
        settings.flashcardDeckOrder == null
    ) {
        console.log(`loadPluginData: Upgrading settings: ${settings.randomizeCardOrder}`);
        settings.flashcardCardOrder = settings.randomizeCardOrder
            ? "DueFirstRandom"
            : "DueFirstSequential";
        settings.flashcardDeckOrder = "PrevDeckComplete_Sequential";

        // After the upgrade, we don't need the old attribute any more
        settings.randomizeCardOrder = null;
    }

    if (settings.clozePatterns == null) {
        settings.clozePatterns = [];

        if (settings.convertHighlightsToClozes)
            settings.clozePatterns.push("==[123;;]answer[;;hint]==");

        if (settings.convertBoldTextToClozes)
            settings.clozePatterns.push("**[123;;]answer[;;hint]**");

        if (settings.convertCurlyBracketsToClozes)
            settings.clozePatterns.push("{{[123;;]answer[;;hint]}}");
    }

    if (settings.sidebarSortOrder == null) {
        settings.sidebarSortOrder = SortType.DATE_ASC;
    }
    if (settings.sidebarNoteSortOrder == null) {
        settings.sidebarNoteSortOrder = NoteSortType.DEFAULT;
    }
    if (settings.sidebarViewMode == null) {
        settings.sidebarViewMode = SidebarViewMode.Notes;
    }

    // Validate sidebarViewMode - default to Notes if invalid
    if (
        settings.sidebarViewMode !== SidebarViewMode.Notes &&
        settings.sidebarViewMode !== SidebarViewMode.FlashCards
    ) {
        console.log(`Invalid sidebarViewMode: ${settings.sidebarViewMode}, defaulting to Notes`);
        settings.sidebarViewMode = SidebarViewMode.Notes;
    }

    // Migrate to unified flashcard tag rules (v3)
    if (settings.flashcardTagRules == null) {
        console.log("Migrating to unified flashcard tag rules (v3)");
        const rules: FlashcardTagRule[] = [];
        let ruleCounter = 0;
        
        // Ensure old fields have defaults for backward compatibility
        if (settings.flashcardTags == null) {
            settings.flashcardTags = DEFAULT_SETTINGS.flashcardTags || ["#flashcards"];
        }
        if (settings.enableHeaderBasedCards == null) {
            settings.enableHeaderBasedCards = false;
        }
        if (settings.headerCardBaseConfig == null) {
            settings.headerCardBaseConfig = {
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            };
        }
        if (settings.headerCardCustomTags == null) {
            settings.headerCardCustomTags = {};
        }
        if (settings.headerCardShowContext == null) {
            settings.headerCardShowContext = true;
        }
        
        // Migrate old flashcardTags (inline cards)
        if (settings.flashcardTags && settings.flashcardTags.length > 0) {
            for (const tag of settings.flashcardTags) {
                rules.push({
                    id: `migrated-inline-${ruleCounter++}`,
                    name: `Inline: ${tag}`,
                    tagExact: tag,
                    enabled: true,
                    priority: 0,
                    source: "inline",
                    inlineRules: {
                        separator: "::",
                    },
                });
            }
            console.log(`Migrated ${settings.flashcardTags.length} inline flashcard tags`);
        }
        
        // Migrate header-based cards
        const showContext = settings.headerCardShowContext ?? true;
        
        // Migrate custom header tags
        if (settings.headerCardCustomTags) {
            for (const [tag, config] of Object.entries(settings.headerCardCustomTags)) {
                if (config.enabled) {
                    const cardMode = config.mode === "qa" ? "qa" : "visual";
                    rules.push({
                        id: `migrated-header-${ruleCounter++}`,
                        name: `Header: ${tag}`,
                        tagExact: tag,
                        enabled: true,
                        priority: 0,
                        source: "header",
                        headerRules: {
                            headingLevels: config.headingLevels,
                            nestingMode: config.nestingMode,
                            selectors: [], // No positional selectors in old config
                            includeParents: showContext ? 1 : 0,
                            cardMode: cardMode as "qa" | "cloze" | "visual",
                            qaSeparator: "?",
                        },
                    });
                }
            }
            console.log(`Migrated ${Object.keys(settings.headerCardCustomTags).length} header-based tags`);
        }
        
        settings.flashcardTagRules = rules.length > 0 ? rules : DEFAULT_SETTINGS.flashcardTagRules;
        
        // Keep old properties for backward compatibility with legacy parser
        // They will be removed in a future version after full migration to new parser
        // DO NOT delete these fields yet - legacy code still uses them
    }
    
    if (settingsAny.headerCardDefaultConfig != null && settings.headerCardBaseConfig == null) {
        settings.headerCardBaseConfig = {
            headingLevels: settingsAny.headerCardDefaultConfig.headingLevels != null ? settingsAny.headerCardDefaultConfig.headingLevels : [2],
            mode: settingsAny.headerCardDefaultConfig.mode != null ? settingsAny.headerCardDefaultConfig.mode : "qa",
            nestingMode: settingsAny.headerCardDefaultConfig.nestingMode != null ? settingsAny.headerCardDefaultConfig.nestingMode : "nested",
        };
        delete settingsAny.headerCardDefaultConfig;
        console.log("Migrated headerCardDefaultConfig to headerCardBaseConfig");
    }
}

export class SettingsUtil {
    // Cache compiled regex patterns to avoid recompiling
    private static patternCache = new Map<string, RegExp>();

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
