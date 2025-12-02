/**
 * TagResolver - Parses and resolves tags from notes to create header-based flashcard configurations
 *
 * @module parser/header-based/TagResolver
 */

import { mergeConfigs } from "./config";
import {
    HeaderCardConfig,
    PositionalSelector,
    ResolvedTagConfig,
    TagPattern,
} from "./types";

const DEFAULT_BASE_CONFIG: HeaderCardConfig = {
    headingLevels: [2],
    nestingMode: "nested",
    mode: "qa",
    enabled: true,
};

export class TagResolver {
    private predefinedTags: Map<string, HeaderCardConfig>;
    private customTags: Map<string, HeaderCardConfig>;
    private regexPatterns: TagPattern[];
    private baseConfig: HeaderCardConfig;

    constructor(
        predefinedTags: Map<string, HeaderCardConfig>,
        customTags: Map<string, HeaderCardConfig>,
        baseConfig: HeaderCardConfig = DEFAULT_BASE_CONFIG,
    ) {
        this.predefinedTags = predefinedTags;
        this.customTags = customTags;
        this.baseConfig = baseConfig;
        this.regexPatterns = this.compileRegexPatterns(customTags);
    }

    private compileRegexPatterns(customTags: Map<string, HeaderCardConfig>): TagPattern[] {
        const patterns: TagPattern[] = [];

        for (const [tagPattern, config] of customTags) {
            if (this.isRegexPattern(tagPattern)) {
                try {
                    const regex = this.convertToRegex(tagPattern);
                    patterns.push({ pattern: regex, config });
                } catch (e) {
                    console.warn(`Invalid regex pattern: ${tagPattern}`, e);
                }
            }
        }

        return patterns;
    }

    private isRegexPattern(pattern: string): boolean {
        return pattern.startsWith('^') || /\[.+\]/.test(pattern);
    }

    private convertToRegex(pattern: string): RegExp {
        if (pattern.startsWith('^')) {
            return new RegExp(pattern);
        }

        // Escape special chars except brackets
        let escaped = '';
        let inBracket = false;
        
        for (let i = 0; i < pattern.length; i++) {
            const char = pattern[i];
            if (char === '[') {
                inBracket = true;
                escaped += char;
            } else if (char === ']') {
                inBracket = false;
                escaped += char;
            } else if (!inBracket && /[.*+?^${}()|\\]/.test(char)) {
                escaped += '\\' + char;
            } else {
                escaped += char;
            }
        }

        return new RegExp(`^${escaped}$`);
    }

    resolve(noteTags: string[]): ResolvedTagConfig {
        const configs: HeaderCardConfig[] = [];
        const positionalSelectors: PositionalSelector[] = [];
        const processedTags = new Set<string>();

        for (const tag of noteTags) {
            if (this.predefinedTags.has(tag)) {
                configs.push(this.predefinedTags.get(tag)!);
                processedTags.add(tag);
                continue;
            }

            if (this.customTags.has(tag) && !this.isRegexPattern(tag)) {
                configs.push(this.customTags.get(tag)!);
                processedTags.add(tag);
                continue;
            }

            let matchedRegex = false;
            for (const { pattern, config } of this.regexPatterns) {
                if (pattern.test(tag)) {
                    configs.push(config);
                    matchedRegex = true;
                    processedTags.add(tag);
                    break;
                }
            }
            if (matchedRegex) continue;

            const compositeResult = this.parseCompositeTag(tag);
            if (compositeResult) {
                if (compositeResult.config) {
                    configs.push(compositeResult.config);
                }
                if (compositeResult.positionalSelector) {
                    positionalSelectors.push(compositeResult.positionalSelector);
                }
                processedTags.add(tag);
            }
        }

        const unprocessedTags = noteTags.filter(tag => !processedTags.has(tag));
        const extractedSelectors = this.extractPositionalSelectors(unprocessedTags);
        const allPositionalSelectors = [...positionalSelectors, ...extractedSelectors];

        if (configs.length === 0) {
            return {
                headingLevels: this.baseConfig.headingLevels,
                mode: this.baseConfig.mode,
                nestingMode: this.baseConfig.nestingMode,
                positionalSelectors: allPositionalSelectors,
                enabled: allPositionalSelectors.length > 0,
            };
        }

        const merged = mergeConfigs(configs);

        return {
            headingLevels: merged.headingLevels,
            mode: merged.mode,
            nestingMode: merged.nestingMode,
            positionalSelectors: allPositionalSelectors,
            enabled: merged.enabled,
        };
    }

    matchesPattern(tag: string, pattern: RegExp): boolean {
        return pattern.test(tag);
    }

    extractPositionalSelectors(tags: string[]): PositionalSelector[] {
        const selectors: PositionalSelector[] = [];

        for (const tag of tags) {
            const match = tag.match(/^#[^/]+\/(first|last|nth|nthFromEnd)-(\d+)$/);
            if (match) {
                const type = match[1] as PositionalSelector["type"];
                const value = parseInt(match[2], 10);
                if (value > 0 || (type === "nthFromEnd" && value === 0)) {
                    switch (type) {
                        case "first":
                        case "last":
                            selectors.push({ type, count: value });
                            break;
                        case "nth":
                            selectors.push({ type, index: value });
                            break;
                        case "nthFromEnd":
                            selectors.push({ type, offset: value });
                            break;
                    }
                }
            }
        }

        return selectors;
    }

    parseCompositeTag(tag: string): {
        config: HeaderCardConfig | null;
        positionalSelector: PositionalSelector | null;
    } | null {
        if (!tag.startsWith('#') || !tag.includes('/')) {
            return null;
        }

        const parts = tag.split('/');
        if (parts.length < 2) {
            return null;
        }

        const config: HeaderCardConfig = {
            headingLevels: [],
            nestingMode: this.baseConfig.nestingMode,
            mode: this.baseConfig.mode,
            enabled: true,
        };

        let positionalSelector: PositionalSelector | null = null;
        let hasValidComponent = false;

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i].toLowerCase();

            if (/^h[1-6]$/.test(part)) {
                const level = parseInt(part[1], 10);
                if (!config.headingLevels.includes(level)) {
                    config.headingLevels.push(level);
                }
                hasValidComponent = true;
            } else if (/^h[1-6]-h[1-6]$/.test(part)) {
                const matches = part.match(/h(\d)-h(\d)/);
                if (matches) {
                    const start = parseInt(matches[1], 10);
                    const end = parseInt(matches[2], 10);
                    for (let level = Math.min(start, end); level <= Math.max(start, end); level++) {
                        if (!config.headingLevels.includes(level)) {
                            config.headingLevels.push(level);
                        }
                    }
                    hasValidComponent = true;
                }
            } else if (part === "qa" || part === "all") {
                config.mode = part;
                hasValidComponent = true;
            } else if (part === "nested" || part === "flat") {
                config.nestingMode = part;
                hasValidComponent = true;
            } else if (/^(first|last|nth|nthFromEnd)-\d+$/.test(part)) {
                const selectorMatch = part.match(/^(first|last|nth|nthFromEnd)-(\d+)$/);
                if (selectorMatch) {
                    const type = selectorMatch[1] as PositionalSelector["type"];
                    const value = parseInt(selectorMatch[2], 10);
                    if (value > 0 || (type === "nthFromEnd" && value === 0)) {
                        switch (type) {
                            case "first":
                            case "last":
                                positionalSelector = { type, count: value };
                                break;
                            case "nth":
                                positionalSelector = { type, index: value };
                                break;
                            case "nthFromEnd":
                                positionalSelector = { type, offset: value };
                                break;
                        }
                        hasValidComponent = true;
                    }
                }
            }
        }

        if (!hasValidComponent) {
            return null;
        }

        config.headingLevels.sort((a, b) => a - b);

        return {
            config: config.headingLevels.length > 0 || 
                    config.mode !== this.baseConfig.mode || 
                    config.nestingMode !== this.baseConfig.nestingMode
                ? config
                : null,
            positionalSelector,
        };
    }
}


export function generatePredefinedTags(
    baseConfig: HeaderCardConfig = DEFAULT_BASE_CONFIG,
    tagPrefix: string = "#flashcards",
): Map<string, HeaderCardConfig> {
    const tags = new Map<string, HeaderCardConfig>();

    for (let level = 1; level <= 6; level++) {
        tags.set(`${tagPrefix}/h${level}`, {
            headingLevels: [level],
            nestingMode: baseConfig.nestingMode,
            mode: baseConfig.mode,
            enabled: true,
        });
    }

    const ranges: [number, number][] = [[2, 3], [1, 3], [3, 5], [2, 4], [1, 6]];

    for (const [start, end] of ranges) {
        const levels: number[] = [];
        for (let l = start; l <= end; l++) {
            levels.push(l);
        }
        tags.set(`${tagPrefix}/h${start}-h${end}`, {
            headingLevels: levels,
            nestingMode: baseConfig.nestingMode,
            mode: baseConfig.mode,
            enabled: true,
        });
    }

    tags.set(`${tagPrefix}/qa`, {
        headingLevels: [],
        nestingMode: baseConfig.nestingMode,
        mode: "qa",
        enabled: true,
    });

    tags.set(`${tagPrefix}/all`, {
        headingLevels: [],
        nestingMode: baseConfig.nestingMode,
        mode: "all",
        enabled: true,
    });

    tags.set(`${tagPrefix}/nested`, {
        headingLevels: [],
        nestingMode: "nested",
        mode: baseConfig.mode,
        enabled: true,
    });

    tags.set(`${tagPrefix}/flat`, {
        headingLevels: [],
        nestingMode: "flat",
        mode: baseConfig.mode,
        enabled: true,
    });

    return tags;
}
