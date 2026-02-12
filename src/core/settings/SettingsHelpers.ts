/**
 * Helper functions for working with settings.
 * Provides validation, transformation, and utility functions.
 */

import { SRSettings } from "./SRSettings";
import * as C from "./SettingsConstants";

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates that a percentage value is within valid range (0-100)
 */
export function validatePercentage(value: number): number {
    return Math.max(C.RESPONSE_BAR_POSITION.MIN, Math.min(C.RESPONSE_BAR_POSITION.MAX, value));
}

/**
 * Validates that a header level is within valid range (1-6)
 */
export function validateHeaderLevel(level: number): boolean {
    return level >= C.HEADER_LEVELS.MIN && level <= C.HEADER_LEVELS.MAX;
}

/**
 * Validates that all header levels in an array are valid
 */
export function validateHeaderLevels(levels: number[]): boolean {
    return levels.every(validateHeaderLevel);
}

/**
 * Validates compact button position
 */
export function isValidCompactButtonPosition(
    position: string,
): position is C.CompactButtonPosition {
    return Object.values(C.COMPACT_BUTTON_POSITIONS).includes(
        position as C.CompactButtonPosition,
    );
}

// ============================================================================
// Settings Getters
// ============================================================================

/**
 * Gets the response button text for a specific algorithm and option index
 */
export function getResponseButtonText(
    settings: SRSettings,
    algorithm: string,
    optionIndex: number,
): string {
    return settings.responseOptionBtnsText[algorithm]?.[optionIndex] || "";
}

/**
 * Gets all response button texts for a specific algorithm
 */
export function getAlgorithmResponseButtons(
    settings: SRSettings,
    algorithm: string,
): string[] {
    return settings.responseOptionBtnsText[algorithm] || [];
}

/**
 * Checks if a tag should be reviewed based on settings
 */
export function shouldReviewTag(settings: SRSettings, tag: string): boolean {
    // Check if tag is in ignore list
    if (settings.tagsToIgnore.some((ignoreTag) => tag.includes(ignoreTag))) {
        return false;
    }

    // Check if tag is in review list
    return settings.tagsToReview.some((reviewTag) => tag.includes(reviewTag));
}

/**
 * Checks if a folder path should be ignored based on settings
 */
export function shouldIgnoreFolder(settings: SRSettings, folderPath: string): boolean {
    return settings.noteFoldersToIgnore.some((pattern) => {
        // Simple pattern matching - can be enhanced with glob patterns
        return folderPath.includes(pattern.replace("**/", "").replace("*", ""));
    });
}

// ============================================================================
// Settings Transformers
// ============================================================================

/**
 * Converts seconds to milliseconds
 */
export function secondsToMilliseconds(seconds: number): number {
    return seconds * 1000;
}

/**
 * Converts milliseconds to seconds
 */
export function millisecondsToSeconds(milliseconds: number): number {
    return milliseconds / 1000;
}

/**
 * Gets the appropriate flashcard dimensions based on platform
 */
export function getFlashcardDimensions(isMobile: boolean): {
    height: number;
    width: number;
} {
    if (isMobile) {
        return {
            height: C.FLASHCARD_DIMENSIONS.MOBILE.HEIGHT,
            width: C.FLASHCARD_DIMENSIONS.MOBILE.WIDTH,
        };
    }
    return {
        height: C.FLASHCARD_DIMENSIONS.DESKTOP.HEIGHT,
        width: C.FLASHCARD_DIMENSIONS.DESKTOP.WIDTH,
    };
}

// ============================================================================
// Settings Comparison
// ============================================================================

/**
 * Checks if two settings objects have different flashcard rules
 */
export function hasFlashcardRulesChanged(
    oldSettings: SRSettings,
    newSettings: SRSettings,
): boolean {
    if (oldSettings.flashcardRules.length !== newSettings.flashcardRules.length) {
        return true;
    }

    return oldSettings.flashcardRules.some((oldRule, index) => {
        const newRule = newSettings.flashcardRules[index];
        return (
            oldRule.id !== newRule.id ||
            oldRule.enabled !== newRule.enabled ||
            oldRule.tagPattern !== newRule.tagPattern ||
            oldRule.type !== newRule.type
        );
    });
}

/**
 * Checks if algorithm-related settings have changed
 */
export function hasAlgorithmSettingsChanged(
    oldSettings: SRSettings,
    newSettings: SRSettings,
): boolean {
    return (
        oldSettings.algorithm !== newSettings.algorithm ||
        oldSettings.baseEase !== newSettings.baseEase ||
        oldSettings.lapsesIntervalChange !== newSettings.lapsesIntervalChange ||
        oldSettings.easyBonus !== newSettings.easyBonus ||
        oldSettings.maximumInterval !== newSettings.maximumInterval ||
        oldSettings.maxLinkFactor !== newSettings.maxLinkFactor
    );
}

// ============================================================================
// Settings Utilities
// ============================================================================

/**
 * Gets the default cloze pattern
 */
export function getDefaultClozePattern(): string {
    return C.CLOZE_PATTERNS.DEFAULT;
}

/**
 * Gets all default tags
 */
export function getDefaultTags(): typeof C.DEFAULT_TAGS {
    return C.DEFAULT_TAGS;
}

/**
 * Gets flashcard order options
 */
export function getFlashcardOrderOptions(): typeof C.FLASHCARD_ORDER {
    return C.FLASHCARD_ORDER;
}

/**
 * Checks if a value is a valid algorithm name
 */
export function isValidAlgorithmName(name: string): name is C.AlgorithmName {
    return Object.values(C.ALGORITHM_NAMES).includes(name as C.AlgorithmName);
}

/**
 * Gets the default response bar position percentage
 */
export function getDefaultResponseBarPosition(): number {
    return C.RESPONSE_BAR_POSITION.DEFAULT_PERCENTAGE;
}

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Validates and clamps response bar position
 */
export function validateResponseBarPosition(position: number): number {
    return clamp(position, C.RESPONSE_BAR_POSITION.MIN, C.RESPONSE_BAR_POSITION.MAX);
}
