import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";

export function renderCommonSettings(
    containerEl: HTMLElement,
    rule: FlashcardTagRule
): void {
    const section = containerEl.createDiv("rule-modal-section");
    
    // Name
    new Setting(section).setName("Rule Name").addText((text) => {
        text.setValue(rule.name).setPlaceholder("e.g., Exam Questions");
        text.onChange(v => rule.name = v);
    });

    // Tag Matching
    new Setting(section)
        .setName("Tag")
        .setDesc("Exact tag (e.g., #flashcards) or Regex")
        .addText((text) => {
            text.setValue(rule.tagExact || "").setPlaceholder("#flashcards");
            text.onChange(v => rule.tagExact = v);
        });
        
    // Priority & Enabled
    const metaDiv = section.createDiv("sr-flex-row");
    metaDiv.style.display = "flex";
    metaDiv.style.gap = "20px";
    metaDiv.style.alignItems = "center";
    
    new Setting(metaDiv)
        .setName("Priority")
        .setDesc("0-100")
        .addText((text) => {
            text.inputEl.type = "number";
            text.setValue(String(rule.priority));
            text.onChange(v => rule.priority = parseInt(v) || 0);
        });

    new Setting(metaDiv)
        .setName("Enabled")
        .addToggle((toggle) => {
            toggle.setValue(rule.enabled);
            toggle.onChange(v => rule.enabled = v);
        });
}
