import { App, Modal, Notice } from "obsidian";
import { FlashcardRule } from "src/parser/rule-based/types";
import { createTabs, TabStructure } from "../components/tabs";
import { t } from "src/lang/helpers";
import { renderInlineTab } from "./flashcard-rule-components/inline";
import { renderHeaderTab } from "./flashcard-rule-components/header";
import { renderMultilineTab } from "./flashcard-rule-components/multiline";
import { renderClozeTab } from "./flashcard-rule-components/cloze";

type ActiveTab = "inline" | "header" | "multiline" | "cloze";

export class FlashcardRuleModal extends Modal {
    private readonly onSave: (rule: FlashcardRule) => void;
    private readonly onCancel: () => void;
    private readonly isEditMode: boolean;

    // State
    private readonly rule: Partial<FlashcardRule>;
    private tabStructure: TabStructure;
    private activeTab: ActiveTab = "inline";

    constructor(
        app: App,
        rule: FlashcardRule,
        onSave: (rule: FlashcardRule) => void,
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
        if (this.rule.type === "header") this.activeTab = "header";
        else if (this.rule.type === "multiline") this.activeTab = "multiline";
        // Heuristic: if it's inline but has cloze patterns and no separator (or default), maybe it's cloze tab?
        // For now, just default to inline unless we add a specific flag.
        // But if the user clicks "Cloze" tab, we want to treat it as cloze.
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
                            this.rule as any, // Cast to any to avoid union issues in render
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode,
                        );
                    },
                },
                header: {
                    title: t("SETTINGS_MODAL_SECTION_HEADER"),
                    icon: "heading",
                    contentGenerator: async (el) => {
                        renderHeaderTab(
                            el,
                            this.rule as any,
                            () => this.handleSave(),
                        );
                    },
                },
                multiline: {
                    title: t("SETTINGS_MODAL_SECTION_MULTILINE"),
                    icon: "list",
                    contentGenerator: async (el) => {
                        renderMultilineTab(
                            el,
                            this.rule as any,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode,
                        );
                    },
                },
                cloze: {
                    title: t("SETTINGS_MODAL_SECTION_CLOZE"),
                    icon: "scissors",
                    contentGenerator: async (el) => {
                        renderClozeTab(
                            el,
                            this.rule as any,
                            () => this.handleSave(),
                            () => this.handleCancel(),
                            this.isEditMode,
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
                // Update rule type when switching tabs
                if (this.activeTab === "header") this.rule.type = "header";
                else if (this.activeTab === "multiline") this.rule.type = "multiline";
                else this.rule.type = "inline";
                
                // Reset config if switching types to avoid type mismatch
                // (Optional: could try to preserve some common fields, but safer to reset or let render init)
                if (!this.rule.config) this.rule.config = {} as any;
            });
        }
    }

    private handleSave(): void {
        // Finalize rule type based on active tab
        if (this.activeTab === "header") {
            this.rule.type = "header";
        } else if (this.activeTab === "multiline") {
            this.rule.type = "multiline";
        } else {
            this.rule.type = "inline";
        }

        this.onSave(this.rule as FlashcardRule);
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
