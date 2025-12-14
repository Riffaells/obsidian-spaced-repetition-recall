/**
 * Unified Flashcard Rules Manager
 * Manages both inline and header-based flashcard rules in a single interface
 */

import { ButtonComponent, Notice } from "obsidian";
import type SRPlugin from "src/main";
import { FlashcardRule } from "src/parser/rule-based/types";
import { FlashcardRuleModal } from "src/gui/modals/FlashcardRuleModal";

import { createInfoSection } from "./InfoSection";
import { createRuleItem } from "./RuleItem";
import { t } from "src/lang/helpers";

/**
 * Main rules manager component
 */
export function createFlashcardRulesManager(containerEl: HTMLElement, plugin: SRPlugin): void {
    // Info section at the top
    createInfoSection(containerEl, {
        title: t("FLASHCARD_RULES_MANAGER_TITLE"),
        icon: "file-text",
        description: t("FLASHCARD_RULES_MANAGER_DESC"),
        items: [
            t("FLASHCARD_RULES_MANAGER_ITEM_1"),
            t("FLASHCARD_RULES_MANAGER_ITEM_2"),
            t("FLASHCARD_RULES_MANAGER_ITEM_3"),
        ],
        tip: t("FLASHCARD_RULES_MANAGER_TIP"),
    });

    // Main container
    const mainContainer = containerEl.createDiv("flashcard-rules-main-container");

    // Header
    const headerDiv = mainContainer.createDiv("flashcard-rules-header");
    const headerTitle = headerDiv.createEl("h4", { cls: "sr-section-title" });
    headerTitle.textContent = t("MANAGE_RULES_TITLE");

    const headerDesc = headerDiv.createDiv({ cls: "sr-section-description" });
    headerDesc.textContent = t("MANAGE_RULES_DESC");

    const controlsContainer = mainContainer.createDiv("flashcard-rules-manager");

    // Add rule buttons
    const buttonsRow = controlsContainer.createDiv({ cls: "flashcard-rules-buttons" });

    new ButtonComponent(buttonsRow)
        .setButtonText(t("ADD_RULE_BUTTON"))
        .setCta()
        .onClick(() => {
            const defaultRule: FlashcardRule = {
                id: `rule-${Date.now()}`,
                name: "",
                enabled: true,
                priority: 0,
                tagPattern: "^#flashcards$",
                type: "inline",
                config: {
                    separator: "::",
                    separatorReverse: ":::",
                    startOfLineOnly: false,
                },
            };
            openRuleModal(plugin, defaultRule, false, rulesListEl);
        });

    // Rules list
    const rulesListEl = controlsContainer.createDiv("flashcard-rules-list");
    renderRulesList(rulesListEl, plugin);
}

/**
 * Render the list of all rules (optimized)
 */
function renderRulesList(containerEl: HTMLElement, plugin: SRPlugin): void {
    containerEl.empty();

    const rules = plugin.data.settings.flashcardRules;

    if (!rules || rules.length === 0) {
        const emptyMsg = containerEl.createDiv({ cls: "flashcard-rules-empty" });
        emptyMsg.textContent = t("NO_RULES_CONFIGURED");
        return;
    }

    // Group rules by source type (single pass)
    const rulesBySource: Record<string, FlashcardRule[]> = {
        inline: [],
        header: [],
        multiline: [],
        cloze: [],
    };

    for (const rule of rules) {
        if (rule.type === "header") {
            rulesBySource.header.push(rule);
        } else if (rule.type === "multiline") {
            rulesBySource.multiline.push(rule);
        } else if (rule.type === "inline") {
            // Heuristic: if it has cloze enabled and no separator, treat as cloze-only section
            if (rule.config?.cloze?.enabled && !rule.config.separator) {
                rulesBySource.cloze.push(rule);
            } else {
                rulesBySource.inline.push(rule);
            }
        } else {
            // Fallback
            rulesBySource.inline.push(rule);
        }
    }

    // Render sections
    const sections: Array<{ title: string; rules: FlashcardRule[]; id: string }> = [
        { title: t("INLINE_RULES_SECTION_TITLE"), rules: rulesBySource.inline, id: "inline" },
        { title: t("HEADER_BASED_RULES_SECTION_TITLE"), rules: rulesBySource.header, id: "header" },
        {
            title: t("MULTILINE_RULES_SECTION_TITLE"),
            rules: rulesBySource.multiline,
            id: "multiline",
        },
        { title: t("CLOZE_RULES_SECTION_TITLE"), rules: rulesBySource.cloze, id: "cloze" },
    ];

    for (const section of sections) {
        if (section.rules.length === 0) continue;

        const sectionTitle = containerEl.createEl("h5", { cls: "flashcard-rules-section-title" });
        sectionTitle.textContent = section.title;

        for (const rule of section.rules) {
            createRuleItem(containerEl, {
                rule,
                onEdit: () => editRule(plugin, rule, containerEl),
                onDelete: () => deleteRule(plugin, rule, containerEl),
                onToggle: (enabled) => toggleRule(plugin, rule, enabled, containerEl),
            });
        }
    }
}

/**
 * Edit a rule
 */
function editRule(plugin: SRPlugin, rule: FlashcardRule, containerEl: HTMLElement): void {
    openRuleModal(plugin, rule, true, containerEl);
}

/**
 * Open modal for creating/editing a rule
 */
function openRuleModal(
    plugin: SRPlugin,
    rule: FlashcardRule,
    isEditMode: boolean,
    containerEl: HTMLElement,
): void {
    const modal = new FlashcardRuleModal(
        plugin.app,
        rule,
        async (updatedRule: FlashcardRule) => {
            if (isEditMode) {
                // Update existing rule
                const index = plugin.data.settings.flashcardRules.findIndex(
                    (r) => r.id === rule.id,
                );
                if (index !== -1) {
                    plugin.data.settings.flashcardRules[index] = updatedRule;
                }
            } else {
                // Add new rule
                plugin.data.settings.flashcardRules.push(updatedRule);
            }

            await plugin.savePluginData();
            renderRulesList(containerEl, plugin);
            new Notice(
                isEditMode
                    ? t("RULE_UPDATED_NOTICE", { ruleName: updatedRule.name })
                    : t("RULE_CREATED_NOTICE", { ruleName: updatedRule.name }),
            );
        },
        () => {
            // Cancel - do nothing
        },
        isEditMode,
    );

    modal.open();
}

/**
 * Delete a rule
 */
async function deleteRule(
    plugin: SRPlugin,
    rule: FlashcardRule,
    containerEl: HTMLElement,
): Promise<void> {
    const confirmed = confirm(
        t("DELETE_RULE_CONFIRMATION_MSG", {
            ruleName: rule.name,
            tag: rule.tagPattern || "",
        }),
    );

    if (!confirmed) return;

    plugin.data.settings.flashcardRules = plugin.data.settings.flashcardRules.filter(
        (r) => r.id !== rule.id,
    );

    await plugin.savePluginData();
    renderRulesList(containerEl, plugin);
    new Notice(t("RULE_DELETED_NOTICE", { ruleName: rule.name }));
}

/**
 * Toggle rule enabled/disabled
 */
async function toggleRule(
    plugin: SRPlugin,
    rule: FlashcardRule,
    enabled: boolean,
    containerEl: HTMLElement,
): Promise<void> {
    const ruleIndex = plugin.data.settings.flashcardRules.findIndex((r) => r.id === rule.id);
    if (ruleIndex === -1) return;

    plugin.data.settings.flashcardRules[ruleIndex].enabled = enabled;
    await plugin.savePluginData();
    renderRulesList(containerEl, plugin);
}
