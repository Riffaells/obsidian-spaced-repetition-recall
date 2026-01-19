/**
 * Multiline rule settings component
 * Structure: Question block followed by Answer block
 */

import { Setting } from "obsidian";
import { MultilineRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

/**
 * Render multiline-specific settings
 */
export function renderMultilineSettings(containerEl: HTMLElement, rule: MultilineRule): void {
    // Question line pattern
    new Setting(containerEl)
        .setName(t("QUESTION_LINE_PATTERN"))
        .setDesc(t("QUESTION_LINE_PATTERN_DESC"))
        .addText((text) =>
            text
                .setPlaceholder("^Q:")
                .setValue(rule.config.questionLinePattern)
                .onChange((value) => {
                    rule.config.questionLinePattern = value;
                }),
        )
        .then((setting) => {
            setting.controlEl.querySelector("input")?.addClass("sr-monospace");
        });

    // Stop condition
    renderStopCondition(containerEl, rule);
}

/**
 * Render stop condition settings
 */
function renderStopCondition(containerEl: HTMLElement, rule: MultilineRule): void {
    const setting = new Setting(containerEl)
        .setName(t("STOP_CONDITION"))
        .setDesc(t("STOP_CONDITION_DESC"));

    const controlsContainer = setting.controlEl.createDiv("sr-stop-condition");

    // Type dropdown
    const currentType = rule.config.stopCondition.type;

    const typeDropdown = controlsContainer.createEl("select");
    typeDropdown.createEl("option", { value: "blank-line", text: t("BLANK_LINE") });
    typeDropdown.createEl("option", { value: "separator", text: t("SEPARATOR") });
    typeDropdown.createEl("option", { value: "next-question", text: t("NEXT_QUESTION") });
    typeDropdown.createEl("option", { value: "custom-pattern", text: t("CUSTOM_PATTERN") });
    typeDropdown.value = currentType;

    const inputsContainer = controlsContainer.createDiv("sr-stop-inputs");

    const renderInputs = () => {
        inputsContainer.empty();
        const type = typeDropdown.value;

        if (type === "blank-line") {
            rule.config.stopCondition = { type: "blank-line" };
        } else if (type === "separator") {
            renderSeparatorInput(inputsContainer, rule);
        } else if (type === "next-question") {
            rule.config.stopCondition = { type: "next-question" };
        } else if (type === "custom-pattern") {
            renderCustomPatternInput(inputsContainer, rule);
        }
    };

    typeDropdown.addEventListener("change", renderInputs);
    renderInputs();
}

/**
 * Render separator input
 */
function renderSeparatorInput(containerEl: HTMLElement, rule: MultilineRule): void {
    const separator =
        rule.config.stopCondition.type === "separator"
            ? rule.config.stopCondition.separator
            : "---";

    containerEl.createSpan({ text: t("SEPARATOR") + ":" });
    const input = containerEl.createEl("input", { type: "text" });
    input.value = separator;
    input.placeholder = "---";

    input.addEventListener("input", () => {
        rule.config.stopCondition = {
            type: "separator",
            separator: input.value || "---",
        };
    });

    rule.config.stopCondition = {
        type: "separator",
        separator: separator,
    };
}

/**
 * Render custom pattern input
 */
function renderCustomPatternInput(containerEl: HTMLElement, rule: MultilineRule): void {
    const pattern =
        rule.config.stopCondition.type === "custom-pattern"
            ? rule.config.stopCondition.pattern
            : "";

    containerEl.createSpan({ text: t("PATTERN") + ":" });
    const input = containerEl.createEl("input", { type: "text" });
    input.value = pattern;
    input.placeholder = "^---$";
    input.addClass("sr-monospace");

    input.addEventListener("input", () => {
        rule.config.stopCondition = {
            type: "custom-pattern",
            pattern: input.value,
        };
    });

    rule.config.stopCondition = {
        type: "custom-pattern",
        pattern: pattern,
    };
}
