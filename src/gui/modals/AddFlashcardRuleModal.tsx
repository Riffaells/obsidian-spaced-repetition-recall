import { App, Modal, Notice, Setting } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { createTabs, TabStructure } from "../components/tabs";
import { validateRule } from "src/parser/header-based/ruleResolver";
import {
    HeaderRules,
    InlineRules,
    MultilineRules,
    ClozeRules,
} from "src/parser/header-based/types";

type ActiveTab = "inline" | "header" | "multiline" | "cloze";

export class AddFlashcardRuleModal extends Modal {
    private onSave: (rule: FlashcardTagRule) => void;
    private onCancel: () => void;

    // State
    private rule: Partial<FlashcardTagRule>;
    private tabStructure: TabStructure;
    private activeTab: ActiveTab = "inline";
    private tagInputType: "exact" | "pattern" = "exact";

    // Form inputs
    private nameInput: HTMLInputElement;
    private tagInput: HTMLInputElement;
    private priorityInput: HTMLInputElement;
    private enabledCheckbox: HTMLInputElement;

    // Header specific
    private headingLevelsCheckboxes: HTMLInputElement[] = [];
    private nestingModeSelect: HTMLSelectElement;
    private cardModeSelect: HTMLSelectElement;
    private qaSeparatorInput: HTMLInputElement;

    // Inline specific
    private inlineSeparatorInput: HTMLInputElement;
    private inlineReversedSeparatorInput: HTMLInputElement;

    // Multiline specific
    private multilineSeparatorInput: HTMLInputElement;
    private multilineReversedSeparatorInput: HTMLInputElement;
    private multilineEndMarkerInput: HTMLInputElement;

    // Cloze specific
    private clozePatternsInput: HTMLTextAreaElement;

    constructor(app: App, onSave: (rule: FlashcardTagRule) => void, onCancel: () => void) {
        super(app);
        this.onSave = onSave;
        this.onCancel = onCancel;

        // Default rule state
        this.rule = {
            id: `rule-${Date.now()}`,
            name: "",
            enabled: true,
            priority: 0,
            tagExact: "#flashcards",
        };
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-modal");

        contentEl.createEl("h2", { text: "Add Flashcard Rule" });

        const tabsContainer = contentEl.createDiv("sr-modal-tabs");

        this.tabStructure = createTabs(
            tabsContainer,
            {
                inline: {
                    title: "Inline",
                    icon: "type",
                    contentGenerator: async (el) => this.renderInlineTab(el),
                },
                header: {
                    title: "Header",
                    icon: "heading",
                    contentGenerator: async (el) => this.renderHeaderTab(el),
                },
                multiline: {
                    title: "Multiline",
                    icon: "list",
                    contentGenerator: async (el) => this.renderMultilineTab(el),
                },
                cloze: {
                    title: "Cloze",
                    icon: "scissors",
                    contentGenerator: async (el) => this.renderClozeTab(el),
                },
            },
            "inline",
        );

        // Handle tab switching
        for (const tabId in this.tabStructure.buttons) {
            this.tabStructure.buttons[tabId].addEventListener("click", () => {
                this.activeTab = tabId as ActiveTab;
            });
        }
    }

    private renderCommonSettings(containerEl: HTMLElement): void {
        const section = containerEl.createDiv("rule-modal-section");

        // Name
        new Setting(section).setName("Rule Name").addText((text) => {
            this.nameInput = text.inputEl;
            text.setValue(this.rule.name).setPlaceholder("e.g., Exam Questions");
            text.onChange((v) => (this.rule.name = v));
        });

        // Tag Matching
        const tagSetting = new Setting(section)
            .setName("Tag Matcher")
            .setDesc("Match by exact tag or regex pattern.");

        tagSetting.addDropdown((dropdown) => {
            dropdown
                .addOption("exact", "Exact Tag")
                .addOption("pattern", "Regex Pattern")
                .setValue(this.tagInputType)
                .onChange((value: "exact" | "pattern") => {
                    this.tagInputType = value;
                    // Update placeholder and clear old values
                    if (value === "exact") {
                        this.tagInput.placeholder = "#flashcards";
                        this.rule.tagPattern = undefined;
                    } else {
                        this.tagInput.placeholder = "^#flashcards/.*";
                        this.rule.tagExact = undefined;
                    }
                    this.tagInput.value = "";
                });
        });
        
        tagSetting.addText((text) => {
            this.tagInput = text.inputEl;
            this.tagInput.style.marginLeft = "8px";
            if (this.tagInputType === 'exact') {
                text.setValue(this.rule.tagExact || "").setPlaceholder("#flashcards");
            } else {
                text.setValue(this.rule.tagPattern || "").setPlaceholder("^#flashcards/.*");
            }
            text.onChange((v) => {
                if (this.tagInputType === 'exact') {
                    this.rule.tagExact = v;
                } else {
                    this.rule.tagPattern = v;
                }
            });
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
                this.priorityInput = text.inputEl;
                text.inputEl.type = "number";
                text.setValue(String(this.rule.priority));
                text.onChange((v) => (this.rule.priority = parseInt(v) || 0));
            });

        new Setting(metaDiv).setName("Enabled").addToggle((toggle) => {
            this.enabledCheckbox = toggle.toggleEl;
            toggle.setValue(this.rule.enabled);
            toggle.onChange((v) => (this.rule.enabled = v));
        });
    }

    private async renderInlineTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Inline Settings" });

        new Setting(section)
            .setName("Separator")
            .setDesc("Separator between question and answer")
            .addText((text) => {
                this.inlineSeparatorInput = text.inputEl;
                text.setValue("::");
            });

        new Setting(section)
            .setName("Reversed Separator")
            .setDesc("Separator for reversed cards")
            .addText((text) => {
                this.inlineReversedSeparatorInput = text.inputEl;
                text.setValue(":::");
            });

        this.renderButtons(containerEl);
    }

    private async renderHeaderTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Header Settings" });

        // Heading Levels
        const levelsSetting = new Setting(section)
            .setName("Heading Levels")
            .setDesc("Which heading levels to process");

        const levelsContainer = levelsSetting.controlEl.createDiv();
        levelsContainer.style.display = "flex";
        levelsContainer.style.gap = "8px";

        this.headingLevelsCheckboxes = [];
        for (let level = 1; level <= 6; level++) {
            const label = levelsContainer.createEl("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "4px";

            const checkbox = label.createEl("input", { type: "checkbox" });
            checkbox.checked = level === 2; // Default
            checkbox.setAttribute("data-level", String(level));
            this.headingLevelsCheckboxes.push(checkbox);

            label.createSpan({ text: `H${level}` });
        }

        // Nesting Mode
        new Setting(section).setName("Nesting Mode").addDropdown((dropdown) => {
            this.nestingModeSelect = dropdown.selectEl;
            dropdown.addOption("nested", "Nested").addOption("flat", "Flat").setValue("nested");
        });

        // Card Mode
        new Setting(section).setName("Card Mode").addDropdown((dropdown) => {
            this.cardModeSelect = dropdown.selectEl;
            dropdown
                .addOption("qa", "QA (?)")
                .addOption("visual", "Visual")
                .addOption("cloze", "Cloze")
                .addOption("all", "All")
                .setValue("qa");
        });

        // QA Separator
        new Setting(section).setName("QA Separator").addText((text) => {
            this.qaSeparatorInput = text.inputEl;
            text.setValue("?");
        });

        this.renderButtons(containerEl);
    }

    private async renderMultilineTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Multiline Settings" });

        new Setting(section)
            .setName("Separator")
            .setDesc("Separator for multiline cards")
            .addText((text) => {
                this.multilineSeparatorInput = text.inputEl;
                text.setValue("?");
            });

        new Setting(section)
            .setName("Reversed Separator")
            .setDesc("Separator for reversed multiline cards")
            .addText((text) => {
                this.multilineReversedSeparatorInput = text.inputEl;
                text.setValue("??");
            });

        new Setting(section)
            .setName("End Marker")
            .setDesc("Optional marker to end the card")
            .addText((text) => {
                this.multilineEndMarkerInput = text.inputEl;
                text.setValue("");
                text.setPlaceholder("(empty)");
            });

        this.renderButtons(containerEl);
    }

    private async renderClozeTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: "Cloze Settings" });

        new Setting(section)
            .setName("Patterns")
            .setDesc("One pattern per line. Use {{...}} or similar syntax.")
            .addTextArea((text) => {
                this.clozePatternsInput = text.inputEl;
                text.setValue("==[123;;]answer[;;hint]==");
                text.inputEl.rows = 5;
                text.inputEl.style.width = "100%";
            });

        this.renderButtons(containerEl);
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
        saveBtn.textContent = "Create Rule";
        saveBtn.addClass("mod-cta");
        saveBtn.addEventListener("click", () => this.handleSave());
    }

    private handleSave(): void {
        // Clear rule-specific properties before rebuilding
        this.rule.headerRules = undefined;
        this.rule.inlineRules = undefined;
        this.rule.multilineRules = undefined;
        this.rule.clozeRules = undefined;

        // Construct specific rules based on active tab
        if (this.activeTab === "header") {
            const levels = this.headingLevelsCheckboxes
                .filter((cb) => cb.checked)
                .map((cb) => parseInt(cb.getAttribute("data-level")!));

            this.rule.headerRules = {
                headingLevels: levels,
                nestingMode: this.nestingModeSelect.value as HeaderRules["nestingMode"],
                selectors: [],
                includeParents: 1, //TODO: Add UI for this
                cardMode: this.cardModeSelect.value as HeaderRules["cardMode"],
                qaSeparator: this.qaSeparatorInput.value,
            };
        } else if (this.activeTab === "inline") {
            this.rule.inlineRules = {
                separator: this.inlineSeparatorInput.value,
                reversedSeparator: this.inlineReversedSeparatorInput.value,
            };
        } else if (this.activeTab === "multiline") {
            this.rule.multilineRules = {
                separator: this.multilineSeparatorInput.value,
                reversedSeparator: this.multilineReversedSeparatorInput.value,
                endMarker: this.multilineEndMarkerInput.value,
            };
        } else if (this.activeTab === "cloze") {
            const patterns = this.clozePatternsInput.value
                .split("\n")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);

            this.rule.clozeRules = {
                patterns: patterns,
            };
        }
        
        // Final validation
        const errors = validateRule(this.rule as FlashcardTagRule);
        if (errors.length > 0) {
            new Notice("Please fix the following errors:\n" + errors.join("\n"));
            return;
        }

        this.onSave(this.rule as FlashcardTagRule);
        this.close();
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
