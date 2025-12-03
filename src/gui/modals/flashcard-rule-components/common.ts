import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { t } from "src/lang/helpers";

export function renderCommonSettings(
    containerEl: HTMLElement,
    rule: FlashcardTagRule
): void {
    const section = containerEl.createDiv("rule-modal-section");
    
    // Name
    new Setting(section).setName(t("RULE_NAME")).addText((text) => {
        text.setValue(rule.name).setPlaceholder(t("RULE_NAME_PLACEHOLDER"));
        text.onChange(v => rule.name = v);
    });

    // Tag Matching
    new Setting(section)
        .setName(t("TAG"))
        .setDesc(t("TAG_DESC"))
        .addText((text) => {
            text.setValue(rule.tagExact || "").setPlaceholder(t("TAG_PLACEHOLDER"));
            text.onChange(v => rule.tagExact = v);
        });
        
    // Priority & Enabled
    const metaDiv = section.createDiv("sr-flex-row");
    metaDiv.style.display = "flex";
    metaDiv.style.gap = "20px";
    metaDiv.style.alignItems = "center";
    
    new Setting(metaDiv)
        .setName(t("PRIORITY"))
        .setDesc(t("PRIORITY_HINT"))
        .addText((text) => {
            text.inputEl.type = "number";
            text.setValue(String(rule.priority));
            text.onChange(v => rule.priority = parseInt(v) || 0);
        });

    new Setting(metaDiv)
        .setName(t("ENABLED"))
        .addToggle((toggle) => {
            toggle.setValue(rule.enabled);
            toggle.onChange(v => rule.enabled = v);
        });
}
