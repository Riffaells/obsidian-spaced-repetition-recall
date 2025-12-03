import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";

export function renderClozeTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void
): void {
    if (!rule.clozeRules) {
        rule.clozeRules = {
            patterns: ["==[123;;]answer[;;hint]=="],
        };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: "Cloze Settings" });

    new Setting(section)
        .setName("Patterns")
        .setDesc("One pattern per line. Use {{...}} or similar syntax.")
        .addTextArea((text) => {
            text.setValue(rule.clozeRules.patterns.join("\n"));
            text.inputEl.rows = 5;
            text.inputEl.style.width = "100%";
            text.onChange(v => {
                rule.clozeRules.patterns = v.split("\n").map(p => p.trim()).filter(p => p.length > 0);
            });
        });

    renderButtons(containerEl, onSave, onCancel);
}
