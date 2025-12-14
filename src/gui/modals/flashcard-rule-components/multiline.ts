import { Setting } from "obsidian";
import { MultilineRule } from "src/parser/rule-based/types";
import { renderCommonSettings } from "./common";
import { renderButtons } from "./buttons";
import { t } from "src/lang/helpers";

export function renderMultilineTab(
    containerEl: HTMLElement,
    rule: MultilineRule,
    onSave: () => void,
    onCancel: () => void,
    isEditMode: boolean,
): void {
    rule.type = "multiline";
    if (!rule.config) {
        rule.config = {
            questionLinePattern: "",
            stopCondition: { type: "blank-line" },
        };
    }
    if (!rule.config.stopCondition) {
        rule.config.stopCondition = { type: "blank-line" };
    }

    renderCommonSettings(containerEl, rule);

    const section = containerEl.createDiv("rule-modal-section");
    section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_MULTILINE") });

    // Question Line Pattern
    new Setting(section)
        .setName("Question Line Pattern")
        .setDesc("Regex pattern to identify the question line")
        .addText((text) => {
            text.setValue(rule.config.questionLinePattern);
            text.setPlaceholder("^Q: (.*)");
            text.onChange((v) => (rule.config.questionLinePattern = v));
        });

    // Stop Condition
    const stopConditionSetting = new Setting(section)
        .setName("Stop Condition")
        .setDesc("When does the answer block end?");

    const updateStopConditionUI = () => {
        // Clear existing extra inputs
        const container = stopConditionSetting.controlEl;
        const existingInput = container.querySelector("input");
        if (existingInput) existingInput.remove();

        const type = rule.config.stopCondition.type;

        if (type === "separator") {
            const input = container.createEl("input", { type: "text" });
            input.placeholder = "Separator (e.g. ---)";
            input.value = (rule.config.stopCondition as any).separator || "";
            input.onchange = () => {
                if (rule.config.stopCondition.type === "separator") {
                    rule.config.stopCondition.separator = input.value;
                }
            };
        } else if (type === "custom-pattern") {
            const input = container.createEl("input", { type: "text" });
            input.placeholder = "Regex Pattern";
            input.value = (rule.config.stopCondition as any).pattern || "";
            input.onchange = () => {
                if (rule.config.stopCondition.type === "custom-pattern") {
                    rule.config.stopCondition.pattern = input.value;
                }
            };
        }
    };

    stopConditionSetting.addDropdown((dropdown) => {
        dropdown
            .addOption("blank-line", "Blank Line")
            .addOption("separator", "Separator Line")
            .addOption("next-question", "Next Question")
            .addOption("custom-pattern", "Custom Pattern")
            .setValue(rule.config.stopCondition.type)
            .onChange((v: any) => {
                if (v === "separator") {
                    rule.config.stopCondition = { type: "separator", separator: "---" };
                } else if (v === "custom-pattern") {
                    rule.config.stopCondition = { type: "custom-pattern", pattern: "" };
                } else {
                    rule.config.stopCondition = { type: v };
                }
                updateStopConditionUI();
            });
    });

    updateStopConditionUI();

    renderButtons(containerEl, onSave, onCancel, isEditMode);
}
