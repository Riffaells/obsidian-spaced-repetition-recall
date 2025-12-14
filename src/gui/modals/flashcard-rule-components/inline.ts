import { Setting } from "obsidian";
import { InlineRule } from "src/parser/rule-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderInlineTab(
    containerEl: HTMLElement,
    rule: InlineRule,
    onSave: () => void,
    onCancel: () => void,
    isEditMode: boolean,
): void {
    rule.type = "inline";
    if (!rule.config) {
        rule.config = {
            separator: "::",
            separatorReverse: ":::",
            startOfLineOnly: false,
        };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_INLINE") });

    new Setting(section)
        .setName(t("SEPARATOR"))
        .setDesc(t("SEPARATOR_DESC_INLINE"))
        .addText((text) => {
            text.setValue(rule.config.separator);
            text.onChange((v) => (rule.config.separator = v));
        });

    new Setting(section)
        .setName(t("REVERSED_SEPARATOR"))
        .setDesc(t("REVERSED_SEPARATOR_DESC_INLINE"))
        .addText((text) => {
            text.setValue(rule.config.separatorReverse || "");
            text.onChange((v) => (rule.config.separatorReverse = v));
        });

    new Setting(section)
        .setName("Start of Line Only")
        .setDesc("Only match if the term starts at the beginning of the line")
        .addToggle((toggle) => {
            toggle.setValue(rule.config.startOfLineOnly);
            toggle.onChange((v) => (rule.config.startOfLineOnly = v));
        });

    renderButtons(containerEl, onSave, onCancel, isEditMode);
}
