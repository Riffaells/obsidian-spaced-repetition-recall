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
    const tagSetting = new Setting(section)
        .setName(t("TAG_MATCHER"))
        .setDesc(t("TAG_MATCHER_DESC"));

    let tagInputType: "exact" | "pattern" = rule.tagPattern ? "pattern" : "exact";

    tagSetting.addDropdown((dropdown) => {
        dropdown
            .addOption("exact", t("EXACT_TAG"))
            .addOption("pattern", t("REGEX_PATTERN"))
            .setValue(tagInputType)
            .onChange((value: "exact" | "pattern") => {
                tagInputType = value;
                // Update placeholder and clear old values
                const textInput = tagSetting.controlEl.querySelector("input[type='text']") as HTMLInputElement;
                if (value === "exact") {
                    textInput.placeholder = t("TAG_PLACEHOLDER");
                    rule.tagPattern = undefined;
                } else {
                    textInput.placeholder = t("REGEX_PLACEHOLDER");
                    rule.tagExact = undefined;
                }
                textInput.value = "";
            });
    });

    tagSetting.addText((text) => {
        text.inputEl.style.marginLeft = "8px";
        if (tagInputType === "exact") {
            text.setValue(rule.tagExact || "").setPlaceholder(t("TAG_PLACEHOLDER"));
        } else {
            text.setValue(rule.tagPattern || "").setPlaceholder(t("REGEX_PLACEHOLDER"));
        }
        text.onChange((v) => {
            if (tagInputType === "exact") {
                rule.tagExact = v;
            } else {
                rule.tagPattern = v;
            }
        });
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
            text.setValue(String(rule.priority || 0));
            text.onChange(v => rule.priority = parseInt(v) || 0);
        });

    new Setting(metaDiv)
        .setName(t("ENABLED"))
        .addToggle((toggle) => {
            toggle.setValue(rule.enabled !== false);
            toggle.onChange(v => rule.enabled = v);
        });
}
