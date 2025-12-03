import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderHeaderTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void
): void {
    if (!rule.headerRules) {
        rule.headerRules = {
            headingLevels: [2],
            nestingMode: "nested",
            cardMode: "qa",
            qaSeparator: "?",
            selectors: [], // default value
            includeParents: 1, // default value
        };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_HEADER") });

    // Heading Levels
    const levelsSetting = new Setting(section)
        .setName(t("HEADING_LEVELS"))
        .setDesc(t("HEADING_LEVELS_DESC"));

    const levelsContainer = levelsSetting.controlEl.createDiv();
    levelsContainer.style.display = "flex";
    levelsContainer.style.gap = "8px";
    
    for (let level = 1; level <= 6; level++) {
        const label = levelsContainer.createEl("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";

        const checkbox = label.createEl("input", { type: "checkbox" });
        checkbox.checked = rule.headerRules.headingLevels.includes(level);
        checkbox.setAttribute("data-level", String(level));
        checkbox.addEventListener("change", () => {
            const levelStr = checkbox.getAttribute("data-level");
            if (levelStr) {
                const levelNum = parseInt(levelStr);
                if (checkbox.checked) {
                    if (!rule.headerRules.headingLevels.includes(levelNum)) {
                        rule.headerRules.headingLevels.push(levelNum);
                        rule.headerRules.headingLevels.sort();
                    }
                } else {
                    rule.headerRules.headingLevels = rule.headerRules.headingLevels.filter(
                        (l) => l !== levelNum
                    );
                }
            }
        });

        label.createSpan({ text: `H${level}` });
    }

    // Nesting Mode
    new Setting(section)
        .setName(t("NESTING_MODE"))
        .addDropdown((dropdown) => {
            dropdown
                .addOption("nested", t("NESTING_MODE_NESTED"))
                .addOption("flat", t("NESTING_MODE_FLAT"))
                .setValue(rule.headerRules.nestingMode)
                .onChange((value) => {
                    rule.headerRules.nestingMode = value as any;
                });
        });

    // Card Mode
    new Setting(section)
        .setName(t("CARD_MODE"))
        .addDropdown((dropdown) => {
            dropdown
                .addOption("qa", t("CARD_MODE_QA"))
                .addOption("visual", t("CARD_MODE_VISUAL"))
                .addOption("cloze", t("CARD_MODE_CLOZE"))
                .setValue(rule.headerRules.cardMode)
                .onChange((value) => {
                    rule.headerRules.cardMode = value as any;
                });
        });
        
    // QA Separator
    new Setting(section)
        .setName(t("QA_SEPARATOR"))
        .addText((text) => {
            text.setValue(rule.headerRules.qaSeparator);
            text.onChange((value) => {
                rule.headerRules.qaSeparator = value;
            });
        });

    renderButtons(containerEl, onSave, onCancel);
}
