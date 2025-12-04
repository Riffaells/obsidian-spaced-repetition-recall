import { App, Modal, Notice } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { createTabs, TabStructure } from "../components/tabs";
import { validateRule } from "src/parser/header-based/ruleResolver";
import { t } from "src/lang/helpers";
import { renderInlineTab } from "./flashcard-rule-components/inline";
import { renderHeaderTab } from "./flashcard-rule-components/header";
import { renderMultilineTab } from "./flashcard-rule-components/multiline";
import { renderClozeTab } from "./flashcard-rule-components/cloze";

type ActiveTab = "inline" | "header" | "multiline" | "cloze";

export class FlashcardRuleModal extends Modal {
    private readonly onSave: (rule: FlashcardTagRule) => void;
    private readonly onCancel: () => void;
    private readonly isEditMode: boolean;

    // State
    private readonly rule: Partial<FlashcardTagRule>;
    private tabStructure: TabStructure;
    private activeTab: ActiveTab = "inline";

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
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-modal");

        contentEl.createEl("h2", {
            text: this.isEditMode ? t("EDIT_FLASHCARD_RULE") : t("CREATE_FLASHCARD_RULE"),
        });

        const tabsContainer = contentEl.createDiv("sr-modal-tabs");

        this.tabStructure = createTabs(
            tabsContainer,
            {
                inline: {
                    title: t("SETTINGS_MODAL_SECTION_INLINE"),
                    icon: "type",
                    contentGenerator: async (el) => {
                        renderInlineTab(
                            el,
                            this.rule as FlashcardTagRule,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode
                        );
                    },
                },
                header: {
                    title: t("SETTINGS_MODAL_SECTION_HEADER"),
                    icon: "heading",
                    contentGenerator: async (el) => {
                        renderHeaderTab(
                            el,
                            this.rule as FlashcardTagRule,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode
                        );
                    },
                },
                multiline: {
                    title: t("SETTINGS_MODAL_SECTION_MULTILINE"),
                    icon: "list",
                    contentGenerator: async (el) => {
                        renderMultilineTab(
                            el,
                            this.rule as FlashcardTagRule,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode
                        );
                    },
                },
                cloze: {
                    title: t("SETTINGS_MODAL_SECTION_CLOZE"),
                    icon: "scissors",
                    contentGenerator: async (el) => {
                        renderClozeTab(
                            el,
                            this.rule as FlashcardTagRule,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode
                        );
                    },
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

    private handleSave(): void {
        // Clear rule-specific properties based on active tab to ensure clean state
        if (this.activeTab !== "header") this.rule.headerRules = undefined;
        if (this.activeTab !== "inline") this.rule.inlineRules = undefined;
        if (this.activeTab !== "multiline") this.rule.multilineRules = undefined;
        if (this.activeTab !== "cloze") this.rule.clozeRules = undefined;

        // Final validation
        const errors = validateRule(this.rule as FlashcardTagRule);
        if (errors.length > 0) {
            new Notice(t("FLASHCARD_RULE_ERRORS", { errors: errors.join("\n") }));
            return;
        }

        this.onSave(this.rule as FlashcardTagRule);
        this.close();
    }

    private handleCancel(): void {
        this.onCancel();
        this.close();
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
