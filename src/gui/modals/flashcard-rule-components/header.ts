import { Setting } from "obsidian";
import { HeaderRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

export function renderHeaderTab(
    containerEl: HTMLElement,
    rule: HeaderRule,
    onUpdate: () => void,
): void {
    rule.type = "header";
    if (!rule.config) {
        rule.config = {
            selection: {
                levels: [],
                strictPriority: false,
            },
            content: {
                scope: "full-section",
                includeSubheaders: true,
                stripTags: false,
            },
        };
    }
    if (!rule.config.selection) {
        rule.config.selection = {
            levels: [],
            strictPriority: false,
        };
    }
    if (!rule.config.content) {
        rule.config.content = {
            scope: "full-section",
            includeSubheaders: true,
            stripTags: false,
        };
    }

    const section = containerEl.createDiv("sr-rule-section");

    // --- Selection Settings ---
    section.createEl("h3", { text: "Selection Settings" });

    // Heading Levels
    new Setting(section)
        .setName(t("HEADING_LEVELS"))
        .setDesc(t("HEADING_LEVELS_DESC"))
        .addText((text) => {
            text.inputEl.style.display = "none";
        });

    const levelsContainer = section.createDiv("sr-heading-levels");
    [1, 2, 3, 4, 5, 6].forEach((level) => {
        const checkbox = levelsContainer.createEl("input", {
            type: "checkbox",
            attr: { "data-level": level },
        });
        checkbox.checked = rule.config.selection.levels.includes(level);

        const label = levelsContainer.createEl("label");
        label.textContent = `H${level}`;
        label.prepend(checkbox);

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                if (!rule.config.selection.levels.includes(level)) {
                    rule.config.selection.levels.push(level);
                }
            } else {
                rule.config.selection.levels = rule.config.selection.levels.filter(
                    (l) => l !== level,
                );
            }
        });
    });

    // Strict Priority
    new Setting(section)
        .setName("Strict Priority")
        .setDesc("Prioritize higher heading levels (e.g. if H1 exists, ignore H2)")
        .addToggle((toggle) => {
            toggle.setValue(rule.config.selection.strictPriority);
            toggle.onChange((v) => (rule.config.selection.strictPriority = v));
        });

    // --- Content Settings ---
    section.createEl("h3", { text: "Content Settings" });

    // Scope
    new Setting(section)
        .setName("Content Scope")
        .setDesc("How much content to include in the flashcard answer")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("full-section", "Full Section (until next header)")
                .addOption("first-paragraph", "First Paragraph Only")
                .setValue(rule.config.content.scope)
                .onChange((v: "full-section" | "first-paragraph") => {
                    rule.config.content.scope = v;
                });
        });

    // Include Subheaders
    new Setting(section)
        .setName("Include Subheaders")
        .setDesc("Include content from subsections in the answer")
        .addToggle((toggle) => {
            toggle.setValue(rule.config.content.includeSubheaders);
            toggle.onChange((v) => (rule.config.content.includeSubheaders = v));
        });

    // Strip Tags
    new Setting(section)
        .setName("Strip Tags")
        .setDesc("Remove HTML/Markdown tags from the output")
        .addToggle((toggle) => {
            toggle.setValue(rule.config.content.stripTags);
            toggle.onChange((v) => (rule.config.content.stripTags = v));
        });
}
