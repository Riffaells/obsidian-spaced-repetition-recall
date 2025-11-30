/**
 * TagResolver - Parses and resolves tags from notes to create header-based flashcard configurations
 * 
 * This module handles:
 * - Predefined tag resolution (#flashcards/h1, #flashcards/h2-h3, #flashcards/qa, etc.)
 * - Custom tag resolution with regex pattern support
 * - Composite tag parsing (#flashcards/h2/qa/last-3)
 * - Positional selector extraction (first-N, last-N, nth-N)
 * - Configuration merging from multiple tags
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

/**
 * Default base configuration used when no tags provide specific settings
 */
const DEFAULT_BASE_CONFIG: HeaderCardConfig = {
    headingLevels: [2],
    nestingMode: "nested",
    mode: "qa",
    enabled: true,
};

/**
 * TagResolver resolves note tags into a unified configuration for header-based flashcard parsing.
 * 
 * It supports:
 * - Predefined tags like #flashcards/h1, #flashcards/h2-h3, #flashcards/qa, #flashcards/nested
 * - Custom tags defined in settings with optional regex patterns
 * - Composite tags like #flashcards/h2/qa/last-3
 * - Positional selectors like first-3, last-2, nth-5
 */
export class TagResolver {
    private predefinedTags: Map<string, HeaderCardConfig>;
    private customTags: Map<string, HeaderCardConfig>;
    private regexPatterns: TagPattern[];
    private baseConfig: HeaderCardConfig;

    /**
     * Creates a new TagResolver instance
     * 
     * @param predefinedTags Map of predefined tag names to their configurations
     * @param customTags Map of custom tag names/patterns to their configurations
     * @param baseConfig Base configuration to use as defaults
     */
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


    /**
     * Compiles regex patterns from custom tags that contain regex syntax
     * 
     * @param customTags Map of custom tag names/patterns to their configurations
     * @returns Array of compiled TagPattern objects
     */
    private compileRegexPatterns(customTags: Map<string, HeaderCardConfig>): TagPattern[] {
        const patterns: TagPattern[] = [];
        
        for (const [tagPattern, config] of customTags) {
            // Check if the tag contains regex-like syntax (brackets)
            if (this.isRegexPattern(tagPattern)) {
                try {
                    const regex = this.convertToRegex(tagPattern);
                    patterns.push({ pattern: regex, config });
                } catch (e) {
                    // Invalid regex pattern - skip it
                    console.warn(`Invalid regex pattern in custom tag: ${tagPattern}`, e);
                }
            }
        }
        
        return patterns;
    }

    /**
     * Checks if a tag pattern contains regex syntax
     * 
     * @param pattern Tag pattern to check
     * @returns true if the pattern contains regex syntax
     */
    private isRegexPattern(pattern: string): boolean {
        // Check for bracket notation like [123] or [2-4]
        return /\[.+\]/.test(pattern);
    }

    /**
     * Converts a tag pattern with bracket notation to a proper regex
     * 
     * Examples:
     * - #flashcards/h[123] -> /^#flashcards\/h[123]$/
     * - #вопросы/h[2-4] -> /^#вопросы\/h[2-4]$/
     * 
     * @param pattern Tag pattern to convert
     * @returns Compiled RegExp
     */
    private convertToRegex(pattern: string): RegExp {
        // Escape special regex characters except brackets
        const escaped = pattern
            .replace(/[.*+?^${}()|\\]/g, '\\$&')
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']');
        
        return new RegExp(`^${escaped}$`);
    }

    /**
     * Resolves tags from a note into a unified configuration
     * 
     * @param noteTags Array of tags from the note
     * @returns Resolved configuration with merged settings and positional selectors
     */
    resolve(noteTags: string[]): ResolvedTagConfig {
        const configs: HeaderCardConfig[] = [];
        const positionalSelectors: PositionalSelector[] = [];
        const processedTags = new Set<string>();
        
        for (const tag of noteTags) {
            // 1. Check predefined tags first
            if (this.predefinedTags.has(tag)) {
                configs.push(this.predefinedTags.get(tag)!);
                processedTags.add(tag);
                continue;
            }
            
            // 2. Check exact match in custom tags (non-regex)
            if (this.customTags.has(tag) && !this.isRegexPattern(tag)) {
                configs.push(this.customTags.get(tag)!);
                processedTags.add(tag);
                continue;
            }
            
            // 3. Check regex patterns from custom tags
            let matchedRegex = false;
            for (const { pattern, config } of this.regexPatterns) {
                if (this.matchesPattern(tag, pattern)) {
                    configs.push(config);
                    matchedRegex = true;
                    processedTags.add(tag);
                    break;
                }
            }
            if (matchedRegex) continue;
            
            // 4. Try to parse as composite tag (#flashcards/h2/qa/last-3)
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
        
        // Extract positional selectors from tags that weren't processed yet
        // This handles standalone positional selector tags like #flashcards/first-3
        const unprocessedTags = noteTags.filter(tag => !processedTags.has(tag));
        const extractedSelectors = this.extractPositionalSelectors(unprocessedTags);
        const allPositionalSelectors = [...positionalSelectors, ...extractedSelectors];
        
        // If no configs found, return disabled config (unless we have positional selectors)
        if (configs.length === 0) {
            return {
                headingLevels: this.baseConfig.headingLevels,
                mode: this.baseConfig.mode,
                nestingMode: this.baseConfig.nestingMode,
                positionalSelectors: allPositionalSelectors,
                enabled: allPositionalSelectors.length > 0,
            };
        }
        
        // Merge all configs
        const merged = mergeConfigs(configs);
        
        return {
            headingLevels: merged.headingLevels,
            mode: merged.mode,
            nestingMode: merged.nestingMode,
            positionalSelectors: allPositionalSelectors,
            enabled: merged.enabled,
        };
    }


    /**
     * Checks if a tag matches a regex pattern
     * 
     * @param tag Tag to check
     * @param pattern Compiled regex pattern
     * @returns true if the tag matches the pattern
     */
    matchesPattern(tag: string, pattern: RegExp): boolean {
        return pattern.test(tag);
    }

    /**
     * Extracts positional selectors from tags
     * 
     * Looks for tags like:
     * - #flashcards/first-3
     * - #flashcards/last-2
     * - #flashcards/nth-5
     * 
     * @param tags Array of tags to search
     * @returns Array of extracted positional selectors
     */
    extractPositionalSelectors(tags: string[]): PositionalSelector[] {
        const selectors: PositionalSelector[] = [];
        
        for (const tag of tags) {
            // Match standalone positional selector tags like #flashcards/last-3, #flashcards/nth-5, #flashcards/nthFromEnd-0
            const match = tag.match(/^#[^/]+\/(first|last|nth|nthFromEnd)-(\d+)$/);
            if (match) {
                const type = match[1] as PositionalSelector["type"];
                const value = parseInt(match[2], 10);
                if (value > 0 || (type === "nthFromEnd" && value === 0)) { // Allow offset: 0 for nthFromEnd
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

    /**
     * Parses a composite tag into its components
     * 
     * Composite tags have the format: #flashcards/h2/qa/last-3
     * Components can include:
     * - Heading level: h1, h2, h3, h4, h5, h6
     * - Heading range: h2-h4, h1-h3
     * - Mode: qa, all
     * - Nesting mode: nested, flat
     * - Positional selector: first-3, last-2, nth-5
     * 
     * @param tag Tag to parse
     * @returns Parsed configuration and positional selector, or null if not a valid composite tag
     */
    parseCompositeTag(tag: string): {
        config: HeaderCardConfig | null;
        positionalSelector: PositionalSelector | null;
    } | null {
        // Must start with # and have at least one /
        if (!tag.startsWith('#') || !tag.includes('/')) {
            return null;
        }
        
        const parts = tag.split('/');
        const prefix = parts[0]; // e.g., "#flashcards"
        
        // Skip if only prefix (no components after /)
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
            
            // Single heading level: h1, h2, h3, h4, h5, h6
            if (/^h[1-6]$/.test(part)) {
                const level = parseInt(part[1], 10);
                if (!config.headingLevels.includes(level)) {
                    config.headingLevels.push(level);
                }
                hasValidComponent = true;
            }
            // Heading range: h2-h4, h1-h3
            else if (/^h[1-6]-h[1-6]$/.test(part)) {
                const matches = part.match(/h(\d)-h(\d)/);
                if (matches) {
                    const start = parseInt(matches[1], 10);
                    const end = parseInt(matches[2], 10);
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    for (let level = min; level <= max; level++) {
                        if (!config.headingLevels.includes(level)) {
                            config.headingLevels.push(level);
                        }
                    }
                    hasValidComponent = true;
                }
            }
            // Mode: qa, all
            else if (part === "qa" || part === "all") {
                config.mode = part;
                hasValidComponent = true;
            }
            // Nesting mode: nested, flat
            else if (part === "nested" || part === "flat") {
                config.nestingMode = part;
                hasValidComponent = true;
            }
            // Positional selector: first-3, last-2, nth-5, nthFromEnd-0
            else if (/^(first|last|nth|nthFromEnd)-\d+$/.test(part)) {
                const selectorMatch = part.match(/^(first|last|nth|nthFromEnd)-(\d+)$/);
                if (selectorMatch) {
                    const type = selectorMatch[1] as PositionalSelector["type"];
                    const value = parseInt(selectorMatch[2], 10);
                    if (value > 0 || (type === "nthFromEnd" && value === 0)) { // Allow offset: 0 for nthFromEnd
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
        
        // If no valid components found, this isn't a composite tag we recognize
        if (!hasValidComponent) {
            return null;
        }
        
        // Sort heading levels
        config.headingLevels.sort((a, b) => a - b);
        
        return {
            config: config.headingLevels.length > 0 || config.mode !== this.baseConfig.mode || config.nestingMode !== this.baseConfig.nestingMode
                ? config
                : null,
            positionalSelector,
        };
    }
}

/**
 * Generates predefined tags based on base configuration
 * 
 * Creates tags for:
 * - Individual heading levels: #flashcards/h1 through #flashcards/h6
 * - Common ranges: #flashcards/h2-h3, #flashcards/h1-h3, etc.
 * - Modes: #flashcards/qa, #flashcards/all
 * - Nesting modes: #flashcards/nested, #flashcards/flat
 * 
 * @param baseConfig Base configuration to use for defaults
 * @param tagPrefix Prefix for tags (default: "#flashcards")
 * @returns Map of predefined tag names to their configurations
 */
export function generatePredefinedTags(
    baseConfig: HeaderCardConfig = DEFAULT_BASE_CONFIG,
    tagPrefix: string = "#flashcards",
): Map<string, HeaderCardConfig> {
    const tags = new Map<string, HeaderCardConfig>();
    
    // Individual heading levels: h1-h6
    for (let level = 1; level <= 6; level++) {
        tags.set(`${tagPrefix}/h${level}`, {
            headingLevels: [level],
            nestingMode: baseConfig.nestingMode,
            mode: baseConfig.mode,
            enabled: true,
        });
    }
    
    // Common ranges
    const ranges: [number, number][] = [
        [2, 3],  // h2-h3
        [1, 3],  // h1-h3
        [3, 5],  // h3-h5
        [2, 4],  // h2-h4
        [1, 6],  // h1-h6 (all)
    ];
    
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
    
    // Mode tags
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
    
    // Nesting mode tags
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
