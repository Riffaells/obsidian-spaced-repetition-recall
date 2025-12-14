import { Setting } from "obsidian";
import { FlashcardRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

export function renderCommonSettings(containerEl: HTMLElement, rule: FlashcardRule): void {
    const section = containerEl.createDiv("rule-modal-section");

    // Name
    new Setting(section).setName(t("RULE_NAME")).addText((text) => {
        text.setValue(rule.name).setPlaceholder(t("RULE_NAME_PLACEHOLDER"));
        text.onChange((v) => (rule.name = v));
    });

    // Tag Matching
    const tagSetting = new Setting(section)
        .setName(t("TAG_MATCHER"))
        .setDesc(t("TAG_MATCHER_DESC"));

    // Determine initial state based on pattern
    const isExactPattern = (p: string) => p.startsWith("^") && p.endsWith("$");
    const extractExactTag = (p: string) => p.slice(1, -1);

    let tagInputType: "exact" | "pattern" =
        rule.tagPattern && isExactPattern(rule.tagPattern) ? "exact" : "pattern";
    
    // If it's a new rule without a pattern, default to exact
    if (!rule.tagPattern) tagInputType = "exact";

    const updateTagValue = (value: string, type: "exact" | "pattern") => {
        if (type === "exact") {
            // Escape special regex characters if needed, but for simple tags usually just wrapping is enough
            // For now, simple wrapping: #tag -> ^#tag$
            rule.tagPattern = `^${value}$`;
        } else {
            rule.tagPattern = value;
        }
    };

    tagSetting.addDropdown((dropdown) => {
        dropdown
            .addOption("exact", t("EXACT_TAG"))
            .addOption("pattern", t("REGEX_PATTERN"))
            .setValue(tagInputType)
            .onChange((value: "exact" | "pattern") => {
                tagInputType = value;
                const textInput = tagSetting.controlEl.querySelector(
                    "input[type='text']",
                ) as HTMLInputElement;
                
                if (value === "exact") {
                    textInput.placeholder = t("TAG_PLACEHOLDER");
                    // Try to convert current pattern to exact if possible, else clear
                    if (rule.tagPattern && isExactPattern(rule.tagPattern)) {
                        textInput.value = extractExactTag(rule.tagPattern);
                    } else {
                        textInput.value = "";
                        rule.tagPattern = "^$";
                    }
                } else {
                    textInput.placeholder = t("REGEX_PLACEHOLDER");
                    // If switching to pattern, show the full regex
                    textInput.value = rule.tagPattern || "";
                }
            });
    });

    tagSetting.addText((text) => {
        text.inputEl.style.marginLeft = "8px";
        
        if (tagInputType === "exact") {
            text.setValue(rule.tagPattern ? extractExactTag(rule.tagPattern) : "").setPlaceholder(t("TAG_PLACEHOLDER"));
        } else {
            text.setValue(rule.tagPattern || "").setPlaceholder(t("REGEX_PLACEHOLDER"));
        }

        text.onChange((v) => {
            updateTagValue(v, tagInputType);
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
            text.onChange((v) => (rule.priority = parseInt(v) || 0));
        });

    new Setting(metaDiv).setName(t("ENABLED")).addToggle((toggle) => {
        toggle.setValue(rule.enabled !== false);
        toggle.onChange((v) => (rule.enabled = v));
    });
}
