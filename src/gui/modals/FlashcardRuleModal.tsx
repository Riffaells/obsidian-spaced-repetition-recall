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
import { t } from "src/lang/helpers";

type ActiveTab = "inline" | "header" | "multiline" | "cloze";

export class FlashcardRuleModal extends Modal {
    private onSave: (rule: FlashcardTagRule) => void;
    private onCancel: () => void;
    private isEditMode: boolean;

    // State
    private rule: Partial<FlashcardTagRule>;
    private tabStructure: TabStructure;
    private activeTab: ActiveTab = "inline";
    private tagInputType: "exact" | "pattern" = "exact";

    // Form inputs
    private nameInput: HTMLInputElement;
    private tagInput: HTMLInputElement;
    private priorityInput: HTMLInputElement;
    private enabledCheckbox: HTMLElement;

    // Header specific
    private headingLevelsCheckboxes: HTMLInputElement[] = [];
    private nestingModeSelect: HTMLSelectElement;
    private cardModeSelect: HTMLSelectElement;
    private qaSeparatorInput: HTMLInputElement;
    private includeParentsInput: HTMLInputElement;

    // Inline specific
    private inlineSeparatorInput: HTMLInputElement;
    private inlineReversedSeparatorInput: HTMLInputElement;

    // Multiline specific
    private multilineSeparatorInput: HTMLInputElement;
    private multilineReversedSeparatorInput: HTMLInputElement;
    private multilineEndMarkerInput: HTMLInputElement;

    // Cloze specific
    private clozePatternsInput: HTMLTextAreaElement;

    constructor(
        app: App,
        rule: FlashcardTagRule,
        onSave: (rule: FlashcardTagRule) => void,
        onCancel: () => void,
        isEditMode: boolean = true,
    ) {
        super(app);
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.isEditMode = isEditMode;

        // Clone rule to avoid mutating original before save
        this.rule = JSON.parse(JSON.stringify(rule));

        // Determine initial state
        if (this.rule.headerRules) this.activeTab = "header";
        else if (this.rule.multilineRules) this.activeTab = "multiline";
        else if (this.rule.clozeRules) this.activeTab = "cloze";
        else this.activeTab = "inline";

        if (this.rule.tagPattern) {
            this.tagInputType = "pattern";
        } else {
            this.tagInputType = "exact";
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-modal");

        contentEl.createEl("h2", { text: this.isEditMode ? t("EDIT_FLASHCARD_RULE") : t("CREATE_FLASHCARD_RULE") });

        const tabsContainer = contentEl.createDiv("sr-modal-tabs");

        this.tabStructure = createTabs(
            tabsContainer,
            {
                inline: {
                    title: t("SETTINGS_MODAL_SECTION_INLINE"),
                    icon: "type",
                    contentGenerator: async (el) => this.renderInlineTab(el),
                },
                header: {
                    title: t("SETTINGS_MODAL_SECTION_HEADER"),
                    icon: "heading",
                    contentGenerator: async (el) => this.renderHeaderTab(el),
                },
                multiline: {
                    title: t("SETTINGS_MODAL_SECTION_MULTILINE"),
                    icon: "list",
                    contentGenerator: async (el) => this.renderMultilineTab(el),
                },
                cloze: {
                    title: t("SETTINGS_MODAL_SECTION_CLOZE"),
                    icon: "scissors",
                    contentGenerator: async (el) => this.renderClozeTab(el),
                },
            },
            this.activeTab,
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
        new Setting(section).setName(t("RULE_NAME")).addText((text) => {
            this.nameInput = text.inputEl;
            text.setValue(this.rule.name || "").setPlaceholder(t("RULE_NAME_PLACEHOLDER"));
            text.onChange((v) => (this.rule.name = v));
        });

        // Tag Matching
        const tagSetting = new Setting(section)
            .setName(t("TAG_MATCHER"))
            .setDesc(t("TAG_MATCHER_DESC"));

        tagSetting.addDropdown((dropdown) => {
            dropdown
                .addOption("exact", t("EXACT_TAG"))
                .addOption("pattern", t("REGEX_PATTERN"))
                .setValue(this.tagInputType)
                .onChange((value: "exact" | "pattern") => {
                    this.tagInputType = value;
                    // Update placeholder and clear old values
                    if (value === "exact") {
                        this.tagInput.placeholder = t("TAG_PLACEHOLDER");
                        this.rule.tagPattern = undefined;
                    } else {
                        this.tagInput.placeholder = t("REGEX_PLACEHOLDER");
                        this.rule.tagExact = undefined;
                    }
                    this.tagInput.value = "";
                });
        });

        tagSetting.addText((text) => {
            this.tagInput = text.inputEl;
            this.tagInput.style.marginLeft = "8px";
            if (this.tagInputType === 'exact') {
                text.setValue(this.rule.tagExact || "").setPlaceholder(t("TAG_PLACEHOLDER"));
            } else {
                text.setValue(this.rule.tagPattern || "").setPlaceholder(t("REGEX_PLACEHOLDER"));
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
            .setName(t("PRIORITY"))
            .setDesc(t("PRIORITY_HINT"))
            .addText((text) => {
                this.priorityInput = text.inputEl;
                text.inputEl.type = "number";
                text.setValue(String(this.rule.priority || 0));
                text.onChange((v) => (this.rule.priority = parseInt(v) || 0));
            });

        new Setting(metaDiv).setName(t("ENABLED")).addToggle((toggle) => {
            this.enabledCheckbox = toggle.toggleEl;
            toggle.setValue(this.rule.enabled !== false); // Default to true if undefined
            toggle.onChange((v) => (this.rule.enabled = v));
        });
    }

    private async renderInlineTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_INLINE") });

        new Setting(section)
            .setName(t("SEPARATOR"))
            .setDesc(t("SEPARATOR_DESC_INLINE"))
            .addText((text) => {
                this.inlineSeparatorInput = text.inputEl;
                text.setValue(this.rule.inlineRules?.separator || "::");
            });

        new Setting(section)
            .setName(t("REVERSED_SEPARATOR"))
            .setDesc(t("REVERSED_SEPARATOR_DESC_INLINE"))
            .addText((text) => {
                this.inlineReversedSeparatorInput = text.inputEl;
                text.setValue(this.rule.inlineRules?.reversedSeparator || ":::");
            });

        this.renderButtons(containerEl);
    }

    private async renderHeaderTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_HEADER") });

        // Heading Levels
        const levelsSetting = new Setting(section)
            .setName(t("HEADING_LEVELS"))
            .setDesc(t("HEADING_LEVELS_DESC"));

        const levelsContainer = levelsSetting.controlEl.createDiv();
        levelsContainer.style.display = "flex";
        levelsContainer.style.gap = "8px";

        const currentLevels = this.rule.headerRules?.headingLevels || [2];
        this.headingLevelsCheckboxes = [];
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

        // Nesting Mode
        new Setting(section).setName(t("NESTING_MODE")).addDropdown((dropdown) => {
            this.nestingModeSelect = dropdown.selectEl;
            dropdown
                .addOption("nested", t("NESTING_MODE_NESTED"))
                .addOption("flat", t("NESTING_MODE_FLAT"))
                .setValue(this.rule.headerRules?.nestingMode || "nested");
        });

        // Card Mode
        new Setting(section).setName(t("CARD_MODE")).addDropdown((dropdown) => {
            this.cardModeSelect = dropdown.selectEl;
            dropdown
                .addOption("qa", t("CARD_MODE_QA"))
                .addOption("visual", t("CARD_MODE_VISUAL"))
                .addOption("cloze", t("CARD_MODE_CLOZE"))
                .addOption("all", t("CARD_MODE_ALL"))
                .setValue(this.rule.headerRules?.cardMode || "qa");
        });

        // QA Separator
        new Setting(section).setName(t("QA_SEPARATOR")).addText((text) => {
            this.qaSeparatorInput = text.inputEl;
            text.setValue(this.rule.headerRules?.qaSeparator || "?");
        });

        // Include Parents
        new Setting(section)
            .setName(t("INCLUDE_PARENTS"))
            .setDesc(t("INCLUDE_PARENTS_DESC"))
            .addText((text) => {
                this.includeParentsInput = text.inputEl;
                text.setValue(String(this.rule.headerRules?.includeParents ?? 1));
                text.inputEl.type = "number";
                text.inputEl.min = "-1";
            });

        this.renderButtons(containerEl);
    }

    private async renderMultilineTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_MULTILINE") });

        new Setting(section)
            .setName(t("SEPARATOR"))
            .setDesc(t("SEPARATOR_DESC_MULTILINE"))
            .addText((text) => {
                this.multilineSeparatorInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.separator || "?");
            });

        new Setting(section)
            .setName(t("REVERSED_SEPARATOR"))
            .setDesc(t("REVERSED_SEPARATOR_DESC_MULTILINE"))
            .addText((text) => {
                this.multilineReversedSeparatorInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.reversedSeparator || "??");
            });

        new Setting(section)
            .setName(t("END_MARKER"))
            .setDesc(t("END_MARKER_DESC"))
            .addText((text) => {
                this.multilineEndMarkerInput = text.inputEl;
                text.setValue(this.rule.multilineRules?.endMarker || "");
                text.setPlaceholder(t("END_MARKER_PLACEHOLDER"));
            });

        this.renderButtons(containerEl);
    }

    private async renderClozeTab(containerEl: HTMLElement): Promise<void> {
        this.renderCommonSettings(containerEl);

        const section = containerEl.createDiv("rule-modal-section");
        section.createEl("h3", { text: t("SETTINGS_MODAL_SECTION_CLOZE") });

        new Setting(section)
            .setName(t("PATTERNS"))
            .setDesc(t("PATTERNS_DESC"))
            .addTextArea((text) => {
                this.clozePatternsInput = text.inputEl;
                const patterns = this.rule.clozeRules?.patterns || ["==[123;;]answer[;;hint]=="];
                text.setValue(patterns.join("\n"));
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
        cancelBtn.textContent = t("CANCEL");
        cancelBtn.addEventListener("click", () => {
            this.onCancel();
            this.close();
        });

        const saveBtn = buttonsDiv.createEl("button");
        saveBtn.textContent = this.isEditMode ? t("SAVE") : t("CREATE");
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
                includeParents: parseInt(this.includeParentsInput.value) || 0,
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
            new Notice(t("FLASHCARD_RULE_ERRORS", { errors: errors.join("\n") }));
            return;
        }

        this.onSave(this.rule as FlashcardTagRule);
        this.close();
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
