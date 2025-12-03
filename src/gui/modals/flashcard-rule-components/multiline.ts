import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";

export function renderMultilineTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void
): void {
    if (!rule.multilineRules) {
        rule.multilineRules = {
            separator: "?",
            reversedSeparator: "??",
            endMarker: "",
        };
    }

    renderCommonSettings(containerEl, rule);
    
    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: "Multiline Settings" });

    new Setting(section)
        .setName("Separator")
        .setDesc("Separator for multiline cards")
        .addText((text) => {
            text.setValue(rule.multilineRules.separator);
            text.onChange(v => rule.multilineRules.separator = v);
        });

    new Setting(section)
        .setName("Reversed Separator")
        .setDesc("Separator for reversed multiline cards")
        .addText((text) => {
            text.setValue(rule.multilineRules.reversedSeparator);
            text.onChange(v => rule.multilineRules.reversedSeparator = v);
        });

    new Setting(section)
        .setName("End Marker")
        .setDesc("Optional marker to end the card")
        .addText((text) => {
            text.setValue(rule.multilineRules.endMarker);
            text.setPlaceholder("(empty)");
            text.onChange(v => rule.multilineRules.endMarker = v);
        });

    renderButtons(containerEl, onSave, onCancel);
}
