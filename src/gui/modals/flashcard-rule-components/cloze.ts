import { Setting } from "obsidian";
import { InlineRule } from "src/parser/rule-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderClozeTab(
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
    if (!rule.config.cloze) {
        rule.config.cloze = {
            enabled: true,
            patterns: [],
        };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_CLOZE") });

    new Setting(section)
        .setName(t("PATTERNS"))
        .setDesc(t("PATTERNS_DESC"))
        .addTextArea((text) => {
            const patterns = rule.config.cloze?.patterns || [];
            text.setValue(patterns.map((p) => p.pattern).join("\n"));
            text.inputEl.rows = 5;
            text.inputEl.style.width = "100%";
            text.onChange((v) => {
                if (!rule.config.cloze) return;
                rule.config.cloze.patterns = v
                    .split("\n")
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0)
                    .map((p) => ({ pattern: p }));
            });
        });

    renderButtons(containerEl, onSave, onCancel, isEditMode);
}
