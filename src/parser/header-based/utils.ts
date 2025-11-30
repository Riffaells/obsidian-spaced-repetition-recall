import { HeaderCardConfig } from "./types";

/**
 * Generates predefined tags for header-based flashcards.
 * 
 * This function creates a comprehensive set of predefined tags based on the base configuration.
 * The generated tags include:
 * - Individual level tags: #flashcards/h1, #flashcards/h2, ..., #flashcards/h6
 * - Common range tags: #flashcards/h2-h3, #flashcards/h1-h3, #flashcards/h3-h5, etc.
 * - Mode tags: #flashcards/qa, #flashcards/all
 * - Nesting mode tags: #flashcards/nested, #flashcards/flat
 * 
 * @param baseConfig The base configuration to use for generating predefined tags
 * @returns A Map of tag names to their configurations
 * 
 * @example
 * const baseConfig = {
 *   headingLevels: [2],
 *   mode: "qa",
 *   nestingMode: "nested"
 * };
 * const tags = generatePredefinedTags(baseConfig);
 * // tags.get("#flashcards/h2") => { headingLevels: [2], mode: "qa", nestingMode: "nested", enabled: true }
 */
export function generatePredefinedTags(baseConfig: {
    headingLevels: number[];
    mode: "qa" | "all";
    nestingMode: "nested" | "flat";
}): Map<string, HeaderCardConfig> {
    const tags = new Map<string, HeaderCardConfig>();
    
    // Generate individual level tags (h1-h6)
    // Requirements: 1.1-1.6
    for (let level = 1; level <= 6; level++) {
        tags.set(`#flashcards/h${level}`, {
            headingLevels: [level],
            nestingMode: baseConfig.nestingMode,
            mode: baseConfig.mode,
            enabled: true,
        });
    }
    
    // Generate common range tags
    // Requirements: 2.1-2.3
    const commonRanges = [
        { start: 2, end: 3, tag: "#flashcards/h2-h3" },  // h2-h3
        { start: 1, end: 3, tag: "#flashcards/h1-h3" },  // h1-h3
        { start: 3, end: 5, tag: "#flashcards/h3-h5" },  // h3-h5
    ];
    
    for (const range of commonRanges) {
        const levels: number[] = [];
        for (let level = range.start; level <= range.end; level++) {
            levels.push(level);
        }
        
        tags.set(range.tag, {
            headingLevels: levels,
            nestingMode: baseConfig.nestingMode,
            mode: baseConfig.mode,
            enabled: true,
        });
    }
    
    // Generate mode tags (qa, all)
    // Requirements: 3.1-3.2
    tags.set("#flashcards/qa", {
        headingLevels: baseConfig.headingLevels,
        nestingMode: baseConfig.nestingMode,
        mode: "qa",
        enabled: true,
    });
    
    tags.set("#flashcards/all", {
        headingLevels: baseConfig.headingLevels,
        nestingMode: baseConfig.nestingMode,
        mode: "all",
        enabled: true,
    });
    
    // Generate nesting mode tags (nested, flat)
    // Requirements: 4.1-4.2
    tags.set("#flashcards/nested", {
        headingLevels: baseConfig.headingLevels,
        nestingMode: "nested",
        mode: baseConfig.mode,
        enabled: true,
    });
    
    tags.set("#flashcards/flat", {
        headingLevels: baseConfig.headingLevels,
        nestingMode: "flat",
        mode: baseConfig.mode,
        enabled: true,
    });
    
    return tags;
}
