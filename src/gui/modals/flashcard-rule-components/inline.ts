import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";

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
    section.createEl("h3", { text: "Inline Settings" });

    new Setting(section)
        .setName("Separator")
        .setDesc("Separator between question and answer")
        .addText((text) => {
            text.setValue(rule.inlineRules.separator);
            text.onChange(v => rule.inlineRules.separator = v);
        });

    new Setting(section)
        .setName("Reversed Separator")
        .setDesc("Separator for reversed cards")
        .addText((text) => {
            text.setValue(rule.inlineRules.reversedSeparator);
            text.onChange(v => rule.inlineRules.reversedSeparator = v);
        });

    renderButtons(containerEl, onSave, onCancel);
}
