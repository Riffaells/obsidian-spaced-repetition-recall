import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

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
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_MULTILINE") });

    new Setting(section)
        .setName(t("SEPARATOR"))
        .setDesc(t("SEPARATOR_DESC_MULTILINE"))
        .addText((text) => {
            text.setValue(rule.multilineRules.separator);
            text.onChange(v => rule.multilineRules.separator = v);
        });

    new Setting(section)
        .setName(t("REVERSED_SEPARATOR"))
        .setDesc(t("REVERSED_SEPARATOR_DESC_MULTILINE"))
        .addText((text) => {
            text.setValue(rule.multilineRules.reversedSeparator);
            text.onChange(v => rule.multilineRules.reversedSeparator = v);
        });

    new Setting(section)
        .setName(t("END_MARKER"))
        .setDesc(t("END_MARKER_DESC"))
        .addText((text) => {
            text.setValue(rule.multilineRules.endMarker);
            text.setPlaceholder(t("END_MARKER_PLACEHOLDER"));
            text.onChange(v => rule.multilineRules.endMarker = v);
        });

    renderButtons(containerEl, onSave, onCancel);
}
