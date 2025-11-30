import { HeadingInfo, HeaderCardConfig } from "./types";

/**
 * Filters headings based on configuration to determine which should become flashcards
 */
export class HeadingMatcher {
    /**
     * Filters headings according to the provided configuration
     * @param headings Array of all headings in the note
     * @param config Configuration specifying which headings to match
     * @returns Array of headings that match the configuration
     */
    matchHeadings(headings: HeadingInfo[], config: HeaderCardConfig): HeadingInfo[] {
        // If config is disabled, return empty array
        if (!config.enabled) {
            return [];
        }

        // Filter headings that match the configuration
        return headings.filter(heading => this.matchesConfig(heading, config));
    }

    /**
     * Checks if an individual heading matches the configuration criteria
     * @param heading The heading to check
     * @param config The configuration to match against
     * @returns true if the heading matches, false otherwise
     */
    private matchesConfig(heading: HeadingInfo, config: HeaderCardConfig): boolean {
        // Check if heading level is in the configured levels
        const levelMatches = config.headingLevels.includes(heading.level);
        if (!levelMatches) {
            return false;
        }

        // Check mode-specific criteria
        if (config.mode === "qa") {
            // In 'qa' mode, only headings ending with "?" are matched
            return heading.isQuestion;
        } else if (config.mode === "all") {
            // In 'all' mode, all headings of the specified levels are matched
            return true;
        }

        // Unknown mode - default to false
        return false;
    }
}
