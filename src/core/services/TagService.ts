import { App } from "obsidian";
import { SRSettings } from "../settings/SRSettings";
import { FlashcardRule } from "../../parser/rule-based/types";
import { pathMatchesPattern } from "../../utils/fs";

export class TagService {
    // Cache compiled regex patterns to avoid recompiling
    private static patternCache = new Map<string, RegExp>();

    // Cache of valid flashcard tags found in the vault
    private static validTagCache: Set<string> | null = null;

    /**
     * Check if a tag matches any enabled flashcard rule (optimized)
     */
    static isFlashcardTag(settings: SRSettings, tag: string): boolean {
        // Fast path: check enabled rules only
        for (const rule of settings.flashcardRules) {
            if (!rule.enabled) continue;

            if (rule.tagPattern) {
                const pattern = TagService.getCompiledPattern(rule.id, rule.tagPattern);
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
    static getMatchingFlashcardRules(settings: SRSettings, tag: string): FlashcardRule[] {
        const matches: FlashcardRule[] = [];

        for (const rule of settings.flashcardRules) {
            if (!rule.enabled) continue;

            if (rule.tagPattern) {
                const pattern = TagService.getCompiledPattern(rule.id, rule.tagPattern);
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

        let pattern = TagService.patternCache.get(cacheKey);
        if (!pattern) {
            try {
                pattern = new RegExp(patternSource, flags || "");
                TagService.patternCache.set(cacheKey, pattern);
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
        TagService.patternCache.clear();
        TagService.validTagCache = null;
    }

    /**
     * Build the cache of valid flashcard tags from the vault
     * This optimizes scanning by pre-calculating which tags match our rules
     */
    static buildTagCache(app: App, settings: SRSettings): void {
        const cache = new Set<string>();
        // Get all unique tags from the metadata cache
        const allTags = app.metadataCache.getTags();

        for (const tag of Object.keys(allTags)) {
            if (TagService.isFlashcardTag(settings, tag)) {
                cache.add(tag);
            }
        }

        TagService.validTagCache = cache;
        console.log(`SR: Built tag cache with ${cache.size} valid tags`);
    }

    /**
     * Check if a tag matches any enabled flashcard rule using the cache
     * Falls back to normal check if cache is not built
     */
    static isFlashcardTagCached(settings: SRSettings, tag: string): boolean {
        if (TagService.validTagCache) {
            return TagService.validTagCache.has(tag);
        }
        return TagService.isFlashcardTag(settings, tag);
    }

    /**
     * Get all enabled inline flashcard tag patterns
     */
    static getInlineFlashcardTags(settings: SRSettings): string[] {
        const patterns: string[] = [];
        for (const rule of settings.flashcardRules) {
            if (rule.enabled && rule.type === "inline") {
                patterns.push(rule.tagPattern);
            }
        }
        return patterns;
    }

    /**
     * Get all enabled header-based flashcard tag patterns
     */
    static getHeaderFlashcardTags(settings: SRSettings): string[] {
        const patterns: string[] = [];
        for (const rule of settings.flashcardRules) {
            if (rule.enabled && rule.type === "header") {
                patterns.push(rule.tagPattern);
            }
        }
        return patterns;
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
