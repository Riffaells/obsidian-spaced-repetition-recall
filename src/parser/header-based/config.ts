import { HeaderCardConfig } from "./types";

/**
 * Merges multiple HeaderCardConfig objects into a single configuration.
 * 
 * Merging rules:
 * - headingLevels: Union of all arrays (unique values, sorted ascending)
 * - nestingMode: Last value wins
 * - mode: "all" wins if ANY config has mode "all" (permissive priority), otherwise last wins
 * - enabled: true if ANY config has enabled: true (permissive wins)
 * 
 * @param configs Array of configurations to merge
 * @returns Merged configuration
 * 
 * @example
 * // #flashcards/h2 + #flashcards/h3/flat
 * mergeConfigs([
 *   { headingLevels: [2], nestingMode: "nested", mode: "qa", enabled: true },
 *   { headingLevels: [3], nestingMode: "flat", mode: "qa", enabled: true }
 * ]);
 * // Result: { headingLevels: [2, 3], nestingMode: "flat", mode: "qa", enabled: true }
 * 
 * @example
 * // #flashcards/qa + #flashcards/all - "all" wins regardless of order
 * mergeConfigs([
 *   { headingLevels: [2], nestingMode: "nested", mode: "qa", enabled: true },
 *   { headingLevels: [3], nestingMode: "nested", mode: "all", enabled: true }
 * ]);
 * // Result: { headingLevels: [2, 3], nestingMode: "nested", mode: "all", enabled: true }
 */
export function mergeConfigs(configs: HeaderCardConfig[]): HeaderCardConfig {
    if (configs.length === 0) {
        throw new Error("Cannot merge empty config array");
    }
    
    if (configs.length === 1) {
        return { ...configs[0] };
    }
    
    // Start with the first config as base
    const result: HeaderCardConfig = {
        headingLevels: [],
        nestingMode: configs[0].nestingMode,
        mode: configs[0].mode,
        enabled: false,
    };
    
    // Collect all heading levels (union)
    const levelSet = new Set<number>();
    for (const config of configs) {
        for (const level of config.headingLevels) {
            levelSet.add(level);
        }
    }
    result.headingLevels = Array.from(levelSet).sort((a, b) => a - b);
    
    // nestingMode: Last value wins
    for (const config of configs) {
        result.nestingMode = config.nestingMode;
    }
    
    // mode: "all" wins if ANY config has mode "all" (permissive priority)
    // Otherwise, last value wins
    const hasAllMode = configs.some(config => config.mode === "all");
    if (hasAllMode) {
        result.mode = "all";
    } else {
        // Last value wins when no "all" mode is present
        for (const config of configs) {
            result.mode = config.mode;
        }
    }
    
    // enabled: true if ANY config has enabled: true (permissive priority)
    result.enabled = configs.some(config => config.enabled);
    
    return result;
}
