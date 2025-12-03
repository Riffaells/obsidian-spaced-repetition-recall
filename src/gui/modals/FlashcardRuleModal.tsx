/**
 * Modal for creating/editing flashcard tag rules
 */

import { App, Modal, Notice, Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { validateRule } from "src/parser/header-based/ruleResolver";

export class FlashcardRuleModal extends Modal {
    private rule: FlashcardTagRule;
    private onSave: (rule: FlashcardTagRule) => void;
    private onCancel: () => void;
    private isEditMode: boolean;

    // Form state
    private nameInput: HTMLInputElement;
    private tagExactInput: HTMLInputElement;
    private tagPatternInput: HTMLInputElement;
    private patternFlagsInput: HTMLInputElement;
    private priorityInput: HTMLInputElement;
    private sourceSelect: HTMLSelectElement;
    private enabledCheckbox: HTMLInputElement;

    // Header-specific
    private headingLevelsCheckboxes: HTMLInputElement[] = [];
    private nestingModeSelect: HTMLSelectElement;
    private cardModeSelect: HTMLSelectElement;
    private includeParentsInput: HTMLInputElement;
    private qaSeparatorInput: HTMLInputElement;

    // Inline-specific
    private inlineSeparatorInput: HTMLInputElement;
    private inlineReversedSeparatorInput: HTMLInputElement;

    // Multiline-specific
    private multilineSeparatorInput: HTMLInputElement;
    private multilineReversedSeparatorInput: HTMLInputElement;
    private multilineEndMarkerInput: HTMLInputElement;

    // Cloze-specific
    private clozePatternsInput: HTMLTextAreaElement;

    constructor(
        app: App,
        rule: FlashcardTagRule,
        onSave: (rule: FlashcardTagRule) => void,
        onCancel: () => void,
        isEditMode: boolean = false,
    ) {
        super(app);
        this.rule = { ...rule };
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.isEditMode = isEditMode;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", {
            text: this.isEditMode ? "Edit Flashcard Rule" : "Create Flashcard Rule",
        });

        this.renderBasicSettings(contentEl);
        this.renderMatchingSettings(contentEl);
        this.renderSourceSettings(contentEl);
        this.renderButtons(contentEl);

        // Initial visibility update
        this.updateVisibility();
    }

    private renderBasicSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("rule-modal-section");

        // Name
        new Setting(section).setName("Rule Name").addText((text) => {
            this.nameInput = text.inputEl;
            text.setValue(this.rule.name).setPlaceholder("e.g., Exam Questions");
        });

        // Enabled
        new Setting(section).setName("Enabled").addToggle((toggle) => {
            this.enabledCheckbox = toggle.toggleEl;
            toggle.setValue(this.rule.enabled);
        });

        // Priority
        new Setting(section)
            .setName("Priority")
            .setDesc("Higher priority rules override lower priority ones (0-100)")
            .addText((text) => {
                this.priorityInput = text.inputEl;
                text.setValue(String(this.rule.priority))
                    .setPlaceholder("0");
                text.inputEl.setAttribute("type", "number");
                text.inputEl.setAttribute("min", "0");
                text.inputEl.setAttribute("max", "100");
            });
    }

    private renderMatchingSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Tag Matching" });

        // Tag exact
        new Setting(section)
            .setName("Exact Tag")
            .setDesc("Match this exact tag (e.g., #flashcards/exam)")
            .addText((text) => {
                this.tagExactInput = text.inputEl;
                text.setValue(this.rule.tagExact || "").setPlaceholder("#flashcards");
            });

        // Tag pattern
        new Setting(section)
            .setName("Regex Pattern")
            .setDesc("Or match tags using regex (advanced)")
            .addText((text) => {
                this.tagPatternInput = text.inputEl;
                text.setValue(this.rule.tagPattern || "").setPlaceholder("^#exam(/.*)?$");
            });

        // Pattern flags
        new Setting(section)
            .setName("Regex Flags")
            .setDesc("Flags for regex pattern (e.g., 'i' for case-insensitive)")
            .addText((text) => {
                this.patternFlagsInput = text.inputEl;
                text.setValue(this.rule.patternFlags || "").setPlaceholder("i");
            });
    }

    private determineInitialSource(): string {
        if (this.rule.headerRules) return "header";
        if (this.rule.multilineRules) return "multiline";
        if (this.rule.clozeRules) return "cloze";
        return "inline"; // Default
    }

    private renderSourceSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Card Source" });

        // Source type
        new Setting(section)
            .setName("Source Type")
            .setDesc("Where to extract flashcards from")
            .addDropdown((dropdown) => {
                this.sourceSelect = dropdown.selectEl;
                dropdown
                    .addOption("inline", "Inline (::)")
                    .addOption("header", "Header-Based")
                    .addOption("multiline", "Multiline (?)")
                    .addOption("cloze", "Cloze")
                    .setValue(this.determineInitialSource())
                    .onChange(() => this.updateVisibility());
            });

        // Header-specific settings
        this.renderHeaderSettings(section);

        // Inline-specific settings
        this.renderInlineSettings(section);

        // Multiline-specific settings
        this.renderMultilineSettings(section);

        // Cloze-specific settings
        this.renderClozeSettings(section);
    }

    private renderHeaderSettings(containerEl: HTMLElement): void {
        const headerSection = containerEl.createDiv("header-settings");
        headerSection.setAttribute("data-source", "header");

        // Heading levels
        const levelsSetting = new Setting(headerSection)
            .setName("Heading Levels")
            .setDesc("Which heading levels to process");

        const levelsContainer = levelsSetting.controlEl.createDiv();
        levelsContainer.style.display = "flex";
        levelsContainer.style.gap = "8px";
        levelsContainer.style.flexWrap = "wrap";

        const currentLevels = this.rule.headerRules?.headingLevels || [2];

        for (let level = 1; level <= 6; level++) {
            const label = levelsContainer.createEl("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "4px";

            const checkbox = label.createEl("input", { type: "checkbox" });
            checkbox.checked = currentLevels.includes(level);
            checkbox.setAttribute("data-level", String(level));
            this.headingLevelsCheckboxes.push(checkbox);

            label.createSpan({ text: `H${level}` });
        }

        // Nesting mode
        new Setting(headerSection)
            .setName("Nesting Mode")
            .setDesc("How to handle subheadings")
            .addDropdown((dropdown) => {
                this.nestingModeSelect = dropdown.selectEl;
                dropdown
                    .addOption("nested", "Nested (include subheadings)")
                    .addOption("flat", "Flat (stop at subheadings)")
                    .setValue(this.rule.headerRules?.nestingMode || "nested");
            });

        // Card mode
        new Setting(headerSection)
            .setName("Card Mode")
            .setDesc("How to generate cards")
            .addDropdown((dropdown) => {
                this.cardModeSelect = dropdown.selectEl;
                dropdown
                    .addOption("qa", "QA (headings with ?)")
                    .addOption("visual", "Visual (all headings)")
                    .addOption("cloze", "Cloze")
                    .setValue(this.rule.headerRules?.cardMode || "qa");
            });

        // Include parents
        new Setting(headerSection)
            .setName("Include Parents")
            .setDesc("Number of parent headings to show as context (0 = none, -1 = all)")
            .addText((text) => {
                this.includeParentsInput = text.inputEl;
                text.setValue(String(this.rule.headerRules?.includeParents || 1))
                    .inputEl.setAttribute("type", "number");
                text.inputEl.setAttribute("min", "-1");
            });

        // QA separator
        new Setting(headerSection)
            .setName("QA Separator")
            .setDesc("Separator for question/answer (regex)")
            .addText((text) => {
                this.qaSeparatorInput = text.inputEl;
                text.setValue(this.rule.headerRules?.qaSeparator || "?").setPlaceholder("?");
            });
    }

    private renderInlineSettings(containerEl: HTMLElement): void {
        const inlineSection = containerEl.createDiv("inline-settings");
        inlineSection.setAttribute("data-source", "inline");

        // Separator
        new Setting(inlineSection)
            .setName("Separator")
            .setDesc("Separator between question and answer")
            .addText((text) => {
                this.inlineSeparatorInput = text.inputEl;
                text.setValue(this.rule.inlineRules?.separator || "::").setPlaceholder("::");
            });

        // Reversed Separator
        new Setting(inlineSection)
            .setName("Reversed Separator")
            .setDesc("Separator for reversed cards")
            .addText((text) => {
                this.inlineReversedSeparatorInput = text.inputEl;
                text.setValue(this.rule.inlineRules?.reversedSeparator || ":::").setPlaceholder(":::");
            });
    }

    private renderMultilineSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("multiline-settings");
        section.setAttribute("data-source", "multiline");

        new Setting(section)
            .setName("Separator")
            .setDesc("Separator for multiline cards")
            .addText((text) => {
                this.multilineSeparatorInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.separator || "?").setPlaceholder("?");
            });

        new Setting(section)
            .setName("Reversed Separator")
            .setDesc("Separator for reversed multiline cards")
            .addText((text) => {
                this.multilineReversedSeparatorInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.reversedSeparator || "??").setPlaceholder("??");
            });

        new Setting(section)
            .setName("End Marker")
            .setDesc("Optional marker to end the card")
            .addText((text) => {
                this.multilineEndMarkerInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.endMarker || "").setPlaceholder("(empty)");
            });
    }

    private renderClozeSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("cloze-settings");
        section.setAttribute("data-source", "cloze");

        new Setting(section)
            .setName("Patterns")
            .setDesc("One pattern per line. Use {{...}} or similar syntax.")
            .addTextArea((text) => {
                this.clozePatternsInput = text.inputEl;
                const patterns = this.rule.clozeRules?.patterns || ["==[123;;]answer[;;hint]=="];
                text.setValue(patterns.join("\n"));
                text.inputEl.rows = 5;
                text.inputEl.style.width = "100%";
            });
    }

    private renderButtons(containerEl: HTMLElement): void {
        const buttonsDiv = containerEl.createDiv("modal-button-container");
        buttonsDiv.style.display = "flex";
        buttonsDiv.style.justifyContent = "flex-end";
        buttonsDiv.style.gap = "8px";
        buttonsDiv.style.marginTop = "20px";

        const cancelBtn = buttonsDiv.createEl("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
            this.onCancel();
            this.close();
        });

        const saveBtn = buttonsDiv.createEl("button");
        saveBtn.textContent = this.isEditMode ? "Save" : "Create";
        saveBtn.addClass("mod-cta");
        saveBtn.addEventListener("click", () => this.handleSave());
    }

    private updateVisibility(): void {
        const source = this.sourceSelect.value as "header" | "inline" | "multiline" | "cloze";

        const sections = ["header", "inline", "multiline", "cloze"];
        sections.forEach(s => {
            const el = this.contentEl.querySelector(`[data-source="${s}"]`) as HTMLElement;
            if (el) {
                el.style.display = source === s ? "block" : "none";
            }
        });
    }

    private handleSave(): void {
        // Collect form data
        const updatedRule: FlashcardTagRule = {
            ...this.rule,
            name: this.nameInput.value.trim(),
            enabled: this.enabledCheckbox.checked,
            priority: parseInt(this.priorityInput.value) || 0,
            tagExact: this.tagExactInput.value.trim() || undefined,
            tagPattern: this.tagPatternInput.value.trim() || undefined,
            patternFlags: this.patternFlagsInput.value.trim() || undefined,
        };

        // Validate basic fields
        if (!updatedRule.name) {
            new Notice("Rule name is required");
            return;
        }

        if (!updatedRule.tagExact && !updatedRule.tagPattern) {
            new Notice("Either exact tag or regex pattern is required");
            return;
        }

        if (updatedRule.tagExact && updatedRule.tagPattern) {
            new Notice("Cannot specify both exact tag and regex pattern");
            return;
        }

        // Collect source-specific settings
        const source = this.sourceSelect.value;
        
        // Clear other rules to ensure only one type is active per rule (optional, but cleaner)
        delete updatedRule.headerRules;
        delete updatedRule.inlineRules;
        delete updatedRule.multilineRules;
        delete updatedRule.clozeRules;

        if (source === "header") {
            const selectedLevels = this.headingLevelsCheckboxes
                .filter((cb) => cb.checked)
                .map((cb) => parseInt(cb.getAttribute("data-level")!));

            if (selectedLevels.length === 0) {
                new Notice("At least one heading level must be selected");
                return;
            }

            updatedRule.headerRules = {
                headingLevels: selectedLevels.sort((a, b) => a - b),
                nestingMode: this.nestingModeSelect.value as "nested" | "flat",
                selectors: [],
                includeParents: parseInt(this.includeParentsInput.value) || 0,
                cardMode: this.cardModeSelect.value as "qa" | "cloze" | "visual",
                qaSeparator: this.qaSeparatorInput.value || "?",
            };
        } else if (source === "inline") {
            updatedRule.inlineRules = {
                separator: this.inlineSeparatorInput.value || "::",
                reversedSeparator: this.inlineReversedSeparatorInput.value || ":::",
            };
        } else if (source === "multiline") {
            updatedRule.multilineRules = {
                separator: this.multilineSeparatorInput.value || "?",
                reversedSeparator: this.multilineReversedSeparatorInput.value || "??",
                endMarker: this.multilineEndMarkerInput.value || "",
            };
        } else if (source === "cloze") {
            const patterns = this.clozePatternsInput.value
                .split("\n")
                .map(p => p.trim())
                .filter(p => p.length > 0);
            
            updatedRule.clozeRules = {
                patterns: patterns
            };
        }

        // Validate rule
        const errors = validateRule(updatedRule);
        if (errors.length > 0) {
            new Notice(`Validation errors:\n${errors.join("\n")}`);
            return;
        }

        // Save
        this.onSave(updatedRule);
        this.close();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
