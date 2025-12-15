/**
 * Header rule settings component
 * Structure: Header is Question, Content is Answer
 */

import { Setting } from "obsidian";
import { HeaderRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

/**
 * Render header-specific settings
 */
export function renderHeaderSettings(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    // Selection section
    const selectionSection = containerEl.createDiv("sr-section");
    selectionSection.createEl("h4", { text: t("SELECTION_SETTINGS") });

    // Header levels
    renderHeaderLevels(selectionSection, rule);

    // Strict priority
    new Setting(selectionSection)
        .setName(t("STRICT_PRIORITY"))
        .setDesc(t("STRICT_PRIORITY_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(rule.config.selection.strictPriority).onChange((value) => {
                rule.config.selection.strictPriority = value;
            }),
        );

    // Limit strategy
    renderLimitStrategy(selectionSection, rule);

    // Content section
    const contentSection = containerEl.createDiv("sr-section");
    contentSection.createEl("h4", { text: t("CONTENT_SETTINGS") });

    // Content scope
    new Setting(contentSection)
        .setName(t("CONTENT_SCOPE"))
        .setDesc(t("CONTENT_SCOPE_DESC"))
        .addDropdown((dropdown) =>
            dropdown
                .addOption("full-section", t("FULL_SECTION"))
                .addOption("first-paragraph", t("FIRST_PARAGRAPH"))
                .setValue(rule.config.content.scope)
                .onChange((value: "full-section" | "first-paragraph") => {
                    rule.config.content.scope = value;
                }),
        );

    // Include subheaders
    new Setting(contentSection)
        .setName(t("INCLUDE_SUBHEADERS"))
        .setDesc(t("INCLUDE_SUBHEADERS_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(rule.config.content.includeSubheaders).onChange((value) => {
                rule.config.content.includeSubheaders = value;
            }),
        );

    // Strip tags
    new Setting(contentSection)
        .setName(t("STRIP_TAGS"))
        .setDesc(t("STRIP_TAGS_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(rule.config.content.stripTags).onChange((value) => {
                rule.config.content.stripTags = value;
            }),
        );
}

/**
 * Render header level checkboxes
 */
function renderHeaderLevels(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    const setting = new Setting(containerEl)
        .setName(t("HEADER_LEVELS"))
        .setDesc(t("HEADER_LEVELS_DESC"));

    const levelsContainer = setting.controlEl.createDiv("sr-header-levels");

    for (let level = 1; level <= 6; level++) {
        const checkbox = levelsContainer.createEl("label", { cls: "sr-header-level-checkbox" });
        
        const input = checkbox.createEl("input", { type: "checkbox" });
        input.checked = rule.config.selection.levels.includes(level);
        input.addEventListener("change", () => {
            if (input.checked) {
                if (!rule.config.selection.levels.includes(level)) {
                    rule.config.selection.levels.push(level);
                    rule.config.selection.levels.sort((a, b) => a - b);
                }
            } else {
                rule.config.selection.levels = rule.config.selection.levels.filter(
                    (l) => l !== level,
                );
            }
        });

        checkbox.createSpan({ text: `H${level}` });
    }
}

/**
 * Render limit strategy settings
 */
function renderLimitStrategy(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    const setting = new Setting(containerEl)
        .setName(t("LIMIT_STRATEGY"))
        .setDesc(t("LIMIT_STRATEGY_DESC"));

    const controlsContainer = setting.controlEl.createDiv("sr-limit-strategy");

    // Type dropdown
    const currentType = rule.config.selection.limit?.type || "none";
    
    const typeDropdown = controlsContainer.createEl("select");
    typeDropdown.createEl("option", { value: "none", text: t("NO_LIMIT") });
    typeDropdown.createEl("option", { value: "count", text: t("COUNT_LIMIT") });
    typeDropdown.createEl("option", { value: "range", text: t("RANGE_LIMIT") });
    typeDropdown.createEl("option", { value: "random", text: t("RANDOM_LIMIT") });
    typeDropdown.value = currentType;

    const inputsContainer = controlsContainer.createDiv("sr-limit-inputs");

    const renderInputs = () => {
        inputsContainer.empty();
        const type = typeDropdown.value;

        if (type === "count") {
            renderCountInputs(inputsContainer, rule);
        } else if (type === "range") {
            renderRangeInputs(inputsContainer, rule);
        } else if (type === "random") {
            renderRandomInputs(inputsContainer, rule);
        } else {
            delete rule.config.selection.limit;
        }
    };

    typeDropdown.addEventListener("change", renderInputs);
    renderInputs();
}

/**
 * Render count limit inputs
 */
function renderCountInputs(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    const limit = rule.config.selection.limit;
    const mode = limit?.type === "count" ? limit.mode : "first";
    const count = limit?.type === "count" ? limit.count : 3;

    // Mode dropdown
    const modeSelect = containerEl.createEl("select");
    modeSelect.createEl("option", { value: "first", text: t("FIRST") });
    modeSelect.createEl("option", { value: "last", text: t("LAST") });
    modeSelect.value = mode;

    // Count input
    const countInput = containerEl.createEl("input", { type: "number" });
    countInput.value = String(count);
    countInput.min = "1";

    const updateLimit = () => {
        rule.config.selection.limit = {
            type: "count",
            mode: modeSelect.value as "first" | "last",
            count: Math.max(1, parseInt(countInput.value) || 1),
        };
    };

    modeSelect.addEventListener("change", updateLimit);
    countInput.addEventListener("input", updateLimit);
    updateLimit();
}

/**
 * Render range limit inputs
 */
function renderRangeInputs(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    const limit = rule.config.selection.limit;
    const start = limit?.type === "range" ? limit.start : 0;
    const end = limit?.type === "range" ? limit.end : 3;

    containerEl.createSpan({ text: t("FROM") });
    const startInput = containerEl.createEl("input", { type: "number" });
    startInput.value = String(start);
    startInput.min = "0";

    containerEl.createSpan({ text: t("TO") });
    const endInput = containerEl.createEl("input", { type: "number" });
    endInput.value = String(end);
    endInput.min = "1";

    const updateLimit = () => {
        rule.config.selection.limit = {
            type: "range",
            start: Math.max(0, parseInt(startInput.value) || 0),
            end: Math.max(1, parseInt(endInput.value) || 1),
        };
    };

    startInput.addEventListener("input", updateLimit);
    endInput.addEventListener("input", updateLimit);
    updateLimit();
}

/**
 * Render random limit inputs
 */
function renderRandomInputs(
    containerEl: HTMLElement,
    rule: HeaderRule,
): void {
    const limit = rule.config.selection.limit;
    const count = limit?.type === "random" ? limit.count : 3;

    containerEl.createSpan({ text: t("COUNT") });
    const countInput = containerEl.createEl("input", { type: "number" });
    countInput.value = String(count);
    countInput.min = "1";

    const updateLimit = () => {
        rule.config.selection.limit = {
            type: "random",
            count: Math.max(1, parseInt(countInput.value) || 1),
        };
    };

    countInput.addEventListener("input", updateLimit);
    updateLimit();
}
