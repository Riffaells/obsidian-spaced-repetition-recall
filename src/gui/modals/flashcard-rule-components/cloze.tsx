/**
 * Cloze settings component
 * Can be attached to any rule type
 */

import { Setting } from "obsidian";
import { FlashcardRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

/**
 * Render cloze settings (optional for all rule types)
 */
export function renderClozeSettings(containerEl: HTMLElement, rule: FlashcardRule): void {
    const clozeSection = containerEl.createDiv("sr-cloze-section");
    clozeSection.createEl("h4", { text: t("CLOZE_SETTINGS") });

    // Get config based on rule type
    const config = rule.config;

    // Cloze enabled toggle
    const enabled = config.cloze?.enabled || false;

    new Setting(clozeSection)
        .setName(t("ENABLE_CLOZE"))
        .setDesc(t("ENABLE_CLOZE_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(enabled).onChange((value) => {
                if (value) {
                    if (!config.cloze) {
                        config.cloze = {
                            enabled: true,
                            patterns: [{ pattern: "==(.+?)==" }],
                        };
                    } else {
                        config.cloze.enabled = true;
                    }
                } else {
                    if (config.cloze) {
                        config.cloze.enabled = false;
                    }
                }
                renderPatterns();
            }),
        );

    // Patterns container
    const patternsContainer = clozeSection.createDiv("sr-cloze-patterns");

    const renderPatterns = () => {
        patternsContainer.empty();

        if (!config.cloze?.enabled) {
            return;
        }

        new Setting(patternsContainer)
            .setName(t("CLOZE_PATTERNS"))
            .setDesc(t("CLOZE_PATTERNS_DESC"))
            .addTextArea((textarea) => {
                const patterns = config.cloze?.patterns || [];
                const patternStrings = patterns.map((p) => p.pattern);
                textarea.setValue(patternStrings.join("\n"));
                textarea.setPlaceholder("==(.+?)==\n{{(.+?)}}");
                textarea.inputEl.addClass("sr-monospace");
                textarea.inputEl.rows = 4;

                textarea.onChange((value) => {
                    const lines = value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);

                    if (!config.cloze) {
                        config.cloze = { enabled: true };
                    }
                    config.cloze.patterns =
                        lines.length > 0 ? lines.map((pattern) => ({ pattern })) : undefined;
                });
            });
    };

    renderPatterns();
}
