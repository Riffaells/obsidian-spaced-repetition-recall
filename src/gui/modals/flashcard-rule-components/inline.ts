import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderInlineTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void
): void {
    if (!rule.inlineRules) {
        rule.inlineRules = {
            separator: "::",
            reversedSeparator: ":::",
        };
    }

    renderCommonSettings(containerEl, rule);
    
    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_INLINE") });

    new Setting(section)
        .setName(t("SEPARATOR"))
        .setDesc(t("SEPARATOR_DESC_INLINE"))
        .addText((text) => {
            text.setValue(rule.inlineRules.separator);
            text.onChange(v => rule.inlineRules.separator = v);
        });

    new Setting(section)
        .setName(t("REVERSED_SEPARATOR"))
        .setDesc(t("REVERSED_SEPARATOR_DESC_INLINE"))
        .addText((text) => {
            text.setValue(rule.inlineRules.reversedSeparator);
            text.onChange(v => rule.inlineRules.reversedSeparator = v);
        });

    renderButtons(containerEl, onSave, onCancel);
}
