import { SRSettings } from "./SRSettings";
import { FlashcardRule } from "../../parser/rule-based/types";

export class SettingsMigration {
    /**
     * Migrate settings to the latest version.
     * @returns true if settings were modified and need saving.
     */
    static migrate(settings: SRSettings): boolean {
        let modified = false;

        // Migrate Flashcard Rules
        if (settings.flashcardRules) {
            for (const rule of settings.flashcardRules) {
                if (this.migrateRule(rule as any)) {
                    modified = true;
                }
            }
        }

        return modified;
    }

    private static migrateRule(rule: any): boolean {
        let modified = false;

        // Migrate tagExact -> tagPattern
        if (rule.tagExact && !rule.tagPattern) {
            // Escape regex characters in the exact tag
            const escapedTag = rule.tagExact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            rule.tagPattern = `^${escapedTag}$`;
            delete rule.tagExact;
            modified = true;
        }

        // If type is already set, assume it's migrated (or at least partially)
        if (rule.type) {
            return modified;
        }

        // Migrate specific rule types
        if (rule.headerRules) {
            rule.type = "header";
            rule.config = {
                selection: {
                    levels: rule.headerRules.headingLevels || [1, 2, 3, 4, 5, 6],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: rule.headerRules.nestingMode === "nested",
                    stripTags: false,
                },
            };
            delete rule.headerRules;
            modified = true;
        } else if (rule.inlineRules) {
            rule.type = "inline";
            rule.config = {
                separator: rule.inlineRules.separator || "::",
                separatorReverse: rule.inlineRules.reversedSeparator || ":::",
                startOfLineOnly: false,
            };
            delete rule.inlineRules;
            modified = true;
        } else if (rule.multilineRules) {
            rule.type = "multiline";
            rule.config = {
                questionLinePattern: "", // Default to empty (matches anything if not strict)
                stopCondition: {
                    type: "separator",
                    separator: rule.multilineRules.separator || "?",
                },
            };
            delete rule.multilineRules;
            modified = true;
        } else if (rule.clozeRules) {
            rule.type = "inline";
            rule.config = {
                separator: "::", // Default separator for inline context
                separatorReverse: ":::",
                startOfLineOnly: false,
                cloze: {
                    enabled: true,
                    patterns: (rule.clozeRules.patterns || []).map((p: string) => ({ pattern: p })),
                },
            };
            delete rule.clozeRules;
            modified = true;
        } else {
            // Fallback for unknown rules: default to inline
            rule.type = "inline";
            rule.config = {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            };
            modified = true;
        }

        return modified;
    }
}
