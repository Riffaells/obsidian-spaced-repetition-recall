/**
 * Flashcard Rule Modal
 * Modal for creating/editing flashcard rules with tabbed interface
 */

import { App, Modal } from "obsidian";
import { FlashcardRule, HeaderRule, InlineRule, MultilineRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

// Import component renderers
import { renderCommonSettings } from "./flashcard-rule-components/common";
import { renderInlineSettings } from "./flashcard-rule-components/inline";
import { renderHeaderSettings } from "./flashcard-rule-components/header";
import { renderMultilineSettings } from "./flashcard-rule-components/multiline";
import { renderClozeSettings } from "./flashcard-rule-components/cloze";

type RuleType = "inline" | "header" | "multiline";

export class FlashcardRuleModal extends Modal {
    private rule: FlashcardRule;
    private onSave: (rule: FlashcardRule) => void;
    private onCancel: () => void;
    private isEditMode: boolean;
    private activeTab: RuleType;

    constructor(
        app: App,
        rule: FlashcardRule,
        onSave: (rule: FlashcardRule) => void,
        onCancel: () => void,
        isEditMode: boolean = false,
    ) {
        super(app);
        // Clone rule to avoid mutating original until save
        this.rule = JSON.parse(JSON.stringify(rule));
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.isEditMode = isEditMode;
        this.activeTab = rule.type;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-flashcard-rule-modal");

        // Modal title
        const title = contentEl.createEl("h2");
        title.textContent = this.isEditMode ? t("EDIT_FLASHCARD_RULE") : t("CREATE_FLASHCARD_RULE");

        // Tabs
        this.renderTabs(contentEl);

        // Common settings (always visible)
        const commonSection = contentEl.createDiv("sr-common-section");
        renderCommonSettings(commonSection, this.rule);

        // Type-specific settings container
        const typeSpecificContainer = contentEl.createDiv("sr-type-specific-container");
        this.renderTypeSpecificSettings(typeSpecificContainer);

        // Cloze settings (optional for all types)
        const clozeContainer = contentEl.createDiv("sr-cloze-container");
        renderClozeSettings(clozeContainer, this.rule);

        // Buttons
        this.renderButtons(contentEl);
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Render tabs for rule types
     */
    private renderTabs(containerEl: HTMLElement): void {
        const tabsContainer = containerEl.createDiv("sr-rule-tabs");

        const tabs: Array<{ type: RuleType; label: string }> = [
            { type: "inline", label: t("INLINE_TAB") },
            { type: "header", label: t("HEADER_TAB") },
            { type: "multiline", label: t("MULTILINE_TAB") },
        ];

        for (const tab of tabs) {
            const tabEl = tabsContainer.createDiv("sr-rule-tab");
            tabEl.textContent = tab.label;

            if (tab.type === this.activeTab) {
                tabEl.addClass("sr-rule-tab-active");
            }

            tabEl.addEventListener("click", () => {
                // Update active tab
                this.activeTab = tab.type;
                this.rule.type = tab.type;

                // Initialize config for new type
                this.initializeConfigForType(tab.type);

                // Re-render modal
                this.onOpen();
            });
        }
    }

    /**
     * Initialize config when switching rule type
     */
    private initializeConfigForType(type: RuleType): void {
        if (type === "inline") {
            (this.rule as InlineRule).config = {
                separator: "::",
                startOfLineOnly: false,
            };
        } else if (type === "header") {
            (this.rule as HeaderRule).config = {
                selection: {
                    levels: [2, 3],
                    strictPriority: false,
                },
                content: {
                    scope: "full-section",
                    includeSubheaders: false,
                    stripTags: false,
                },
            };
        } else if (type === "multiline") {
            (this.rule as MultilineRule).config = {
                questionLinePattern: "^Q:",
                stopCondition: { type: "blank-line" },
            };
        }
    }

    /**
     * Render type-specific settings based on active tab
     */
    private renderTypeSpecificSettings(containerEl: HTMLElement): void {
        containerEl.empty();

        const section = containerEl.createDiv("sr-type-section");
        section.createEl("h3", { text: t("TYPE_SPECIFIC_SETTINGS") });

        if (this.activeTab === "inline") {
            renderInlineSettings(section, this.rule as InlineRule);
        } else if (this.activeTab === "header") {
            renderHeaderSettings(section, this.rule as HeaderRule);
        } else if (this.activeTab === "multiline") {
            renderMultilineSettings(section, this.rule as MultilineRule);
        }
    }

    /**
     * Render save/cancel buttons
     */
    private renderButtons(containerEl: HTMLElement): void {
        const buttonsContainer = containerEl.createDiv("sr-modal-buttons");

        // Cancel button
        const cancelBtn = buttonsContainer.createEl("button");
        cancelBtn.textContent = t("CANCEL");
        cancelBtn.addClass("sr-button-secondary");
        cancelBtn.addEventListener("click", () => {
            this.onCancel();
            this.close();
        });

        // Save button
        const saveBtn = buttonsContainer.createEl("button");
        saveBtn.textContent = t("SAVE");
        saveBtn.addClass("sr-button-primary");
        saveBtn.addEventListener("click", () => {
            if (this.validateRule()) {
                this.onSave(this.rule);
                this.close();
            }
        });
    }

    /**
     * Validate rule before saving
     */
    private validateRule(): boolean {
        if (!this.rule.name.trim()) {
            // Show error
            return false;
        }

        if (!this.rule.tagPattern.trim()) {
            // Show error
            return false;
        }

        return true;
    }
}
