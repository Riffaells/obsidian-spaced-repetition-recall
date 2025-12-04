import { Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderHeaderTab(
    containerEl: HTMLElement,
    rule: FlashcardTagRule,
    onSave: () => void,
    onCancel: () => void,
    isEditMode: boolean
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
                .addOption("all", t("CARD_MODE_ALL"))
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

    // Positional Selectors
    const selectorsSetting = new Setting(section)
        .setName(t("POSITIONAL_SELECTORS"))
        .setDesc(t("POSITIONAL_SELECTORS_DESC"));

    const selectorsContainer = selectorsSetting.controlEl.createDiv("sr-selectors-container");
    selectorsContainer.style.display = "flex";
    selectorsContainer.style.flexDirection = "column";
    selectorsContainer.style.gap = "8px";
    selectorsContainer.style.width = "100%";

    const renderSelectors = () => {
        selectorsContainer.empty();
        
        if (!rule.headerRules.selectors) {
            rule.headerRules.selectors = [];
        }

        rule.headerRules.selectors.forEach((selector, index) => {
            const row = selectorsContainer.createDiv("sr-selector-row");
            row.style.display = "flex";
            row.style.gap = "8px";
            row.style.alignItems = "center";

            // Type Select
            const typeSelect = row.createEl("select");
            typeSelect.addClass("dropdown");
            ["first", "last", "nth", "nthFromEnd"].forEach(type => {
                const option = typeSelect.createEl("option", { text: type, value: type });
                option.selected = selector.type === type;
            });
            typeSelect.onchange = () => {
                const newType = typeSelect.value as any;
                if (newType === "nth" || newType === "nthFromEnd") {
                    // preserve value as index/offset if possible, else default to 1/0
                    const val = 'count' in selector ? selector.count : ('index' in selector ? selector.index : selector.offset);
                    if (newType === "nth") rule.headerRules.selectors[index] = { type: "nth", index: val || 1 };
                    else rule.headerRules.selectors[index] = { type: "nthFromEnd", offset: val || 0 };
                } else {
                    const val = 'index' in selector ? selector.index : ('offset' in selector ? selector.offset : selector.count);
                    rule.headerRules.selectors[index] = { type: newType, count: val || 1 };
                }
                renderSelectors();
            };

            // Value Input
            const valueInput = row.createEl("input", { type: "number" });
            valueInput.style.width = "60px";
            
            let value = 0;
            if (selector.type === "first" || selector.type === "last") value = selector.count;
            else if (selector.type === "nth") value = selector.index;
            else if (selector.type === "nthFromEnd") value = selector.offset;
            
            valueInput.value = String(value);
            valueInput.onchange = () => {
                const val = parseInt(valueInput.value);
                if (selector.type === "first" || selector.type === "last") selector.count = val;
                else if (selector.type === "nth") selector.index = val;
                else if (selector.type === "nthFromEnd") selector.offset = val;
            };

            // Delete Button
            const deleteBtn = row.createEl("button");
            deleteBtn.textContent = "X";
            deleteBtn.onclick = () => {
                rule.headerRules.selectors.splice(index, 1);
                renderSelectors();
            };
        });

        // Add Button
        const addBtn = selectorsContainer.createEl("button");
        addBtn.textContent = "+ " + t("ADD_SELECTOR");
        addBtn.onclick = () => {
            rule.headerRules.selectors.push({ type: "first", count: 1 });
            renderSelectors();
        };
    };

    renderSelectors();

    // Include Parents
    new Setting(section)
        .setName(t("INCLUDE_PARENTS"))
        .setDesc(t("INCLUDE_PARENTS_DESC"))
        .addText((text) => {
            text.setValue(String(rule.headerRules.includeParents ?? 1));
            text.inputEl.type = "number";
            text.inputEl.min = "-1";
            text.onChange((value) => {
                rule.headerRules.includeParents = parseInt(value) || 0;
            });
        });

    renderButtons(containerEl, onSave, onCancel, isEditMode);
}
