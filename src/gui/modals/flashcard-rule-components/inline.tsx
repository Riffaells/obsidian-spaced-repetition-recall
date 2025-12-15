/**
 * Inline rule settings component
 * Structure: "Term :: Definition"
 */

import { Setting } from "obsidian";
import { InlineRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

/**
 * Render inline-specific settings
 */
export function renderInlineSettings(
    containerEl: HTMLElement,
    rule: InlineRule,
): void {
    // Separator
    new Setting(containerEl)
        .setName(t("SEPARATOR"))
        .setDesc(t("SEPARATOR_DESC"))
        .addText((text) =>
            text
                .setPlaceholder("::")
                .setValue(rule.config.separator || "::")
                .onChange((value) => {
                    rule.config.separator = value || "::";
                }),
        );

    // Reverse separator
    new Setting(containerEl)
        .setName(t("SEPARATOR_REVERSE"))
        .setDesc(t("SEPARATOR_REVERSE_DESC"))
        .addText((text) =>
            text
                .setPlaceholder(":::")
                .setValue(rule.config.separatorReverse || "")
                .onChange((value) => {
                    if (value.trim()) {
                        rule.config.separatorReverse = value;
                    } else {
                        delete rule.config.separatorReverse;
                    }
                }),
        );

    // Start of line only
    new Setting(containerEl)
        .setName(t("START_OF_LINE_ONLY"))
        .setDesc(t("START_OF_LINE_ONLY_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(rule.config.startOfLineOnly).onChange((value) => {
                rule.config.startOfLineOnly = value;
            }),
        );
}
