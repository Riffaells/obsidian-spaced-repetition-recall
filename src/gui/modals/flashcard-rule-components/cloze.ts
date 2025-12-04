import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderClozeTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void,
    isEditMode: boolean
): void {
    if (!rule.clozeRules) {
        rule.clozeRules = {
            patterns: ["==[123;;]answer[;;hint]=="],
        };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_CLOZE") });

    new Setting(section)
        .setName(t("PATTERNS"))
        .setDesc(t("PATTERNS_DESC"))
        .addTextArea((text) => {
            text.setValue(rule.clozeRules.patterns.join("\n"));
            text.inputEl.rows = 5;
            text.inputEl.style.width = "100%";
            text.onChange(v => {
                rule.clozeRules.patterns = v.split("\n").map(p => p.trim()).filter(p => p.length > 0);
            });
        });

    renderButtons(containerEl, onSave, onCancel, isEditMode);
}
