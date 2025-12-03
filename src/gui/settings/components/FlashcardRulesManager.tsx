/**
 * Unified Flashcard Rules Manager
 * Manages both inline and header-based flashcard rules in a single interface
 */

import { Notice, ButtonComponent } from "obsidian";
import type SRPlugin from "src/main";
import { FlashcardTagRule } from "src/parser/header-based/types";
import { createInlineRule, createHeaderRule } from "src/settings/flashcardTagRules";
import { FlashcardRuleModal } from "src/gui/modals/FlashcardRuleModal";
import { AddFlashcardRuleModal } from "src/gui/modals/AddFlashcardRuleModal";
import { createInfoSection } from "./InfoSection";
import { createRuleItem } from "./RuleItem";

/**
 * Main rules manager component
 */
export function createFlashcardRulesManager(
    containerEl: HTMLElement,
    plugin: SRPlugin,
): void {
    // Info section at the top
    createInfoSection(containerEl, {
        title: "Flashcard Tag Rules",
        icon: "file-text",
        description:
            "<strong>Правила определяют, как теги создают карточки.</strong> " +
            "Вы можете настроить разные типы карточек для разных тегов.",
        items: [
            "<strong>Inline карточки</strong> — используют разделители (::) внутри строки",
            "<strong>Header-based карточки</strong> — создаются из заголовков markdown",
            "<strong>Multiline карточки</strong> — используют многострочный формат с (?)",
        ],
        tip: "Начните с готовых правил по умолчанию, затем добавьте свои для специфичных нужд.",
    });

    // Main container
    const mainContainer = containerEl.createDiv("flashcard-rules-main-container");
    
    // Header
    const headerDiv = mainContainer.createDiv("flashcard-rules-header");
    const headerTitle = headerDiv.createEl("h4", { cls: "sr-section-title" });
    headerTitle.textContent = "Управление правилами";
    
    const headerDesc = headerDiv.createDiv({ cls: "sr-section-description" });
    headerDesc.textContent = "Создавайте, редактируйте и управляйте правилами для карточек. Каждое правило может иметь свой приоритет и настройки.";

    const controlsContainer = mainContainer.createDiv("flashcard-rules-manager");

    // Add rule buttons
    const buttonsRow = controlsContainer.createDiv({ cls: "flashcard-rules-buttons" });

    new ButtonComponent(buttonsRow)
        .setButtonText("+ Add Rule")
        .setCta()
        .onClick(() => {
            new AddFlashcardRuleModal(
                plugin.app,
                async (newRule) => {
                    plugin.data.settings.flashcardTagRules.push(newRule);
                    await plugin.savePluginData();
                    renderRulesList(rulesListEl, plugin);
                    new Notice(`Rule "${newRule.name}" created`);
                },
                () => {},
            ).open();
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

    const rules = plugin.data.settings.flashcardTagRules;

    if (!rules || rules.length === 0) {
        const emptyMsg = containerEl.createDiv({ cls: "flashcard-rules-empty" });
        emptyMsg.textContent = "No rules configured yet. Add a rule to get started.";
        return;
    }

    // Group rules by source type (single pass)
    const rulesBySource: Record<string, FlashcardTagRule[]> = {
        inline: [],
        header: [],
        multiline: [],
        cloze: [],
    };

    for (const rule of rules) {
        if (rule.headerRules) {
            rulesBySource.header.push(rule);
        } else if (rule.multilineRules) {
            rulesBySource.multiline.push(rule);
        } else if (rule.clozeRules) {
            rulesBySource.cloze.push(rule);
        } else {
            // Default to inline if no specific rules or if inlineRules are present
            rulesBySource.inline.push(rule);
        }
    }

    // Render sections
    const sections: Array<{ title: string; rules: FlashcardTagRule[] }> = [
        { title: "Inline Rules", rules: rulesBySource.inline },
        { title: "Header-Based Rules", rules: rulesBySource.header },
        { title: "Multiline Rules", rules: rulesBySource.multiline },
        { title: "Cloze Rules", rules: rulesBySource.cloze },
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
function editRule(plugin: SRPlugin, rule: FlashcardTagRule, containerEl: HTMLElement): void {
    openRuleModal(plugin, rule, true, containerEl);
}

/**
 * Open modal for creating/editing a rule
 */
function openRuleModal(
    plugin: SRPlugin,
    rule: FlashcardTagRule,
    isEditMode: boolean,
    containerEl: HTMLElement,
): void {
    const modal = new FlashcardRuleModal(
        plugin.app,
        rule,
        async (updatedRule: FlashcardTagRule) => {
            if (isEditMode) {
                // Update existing rule
                const index = plugin.data.settings.flashcardTagRules.findIndex(
                    (r) => r.id === rule.id,
                );
                if (index !== -1) {
                    plugin.data.settings.flashcardTagRules[index] = updatedRule;
                }
            } else {
                // Add new rule
                plugin.data.settings.flashcardTagRules.push(updatedRule);
            }

            await plugin.savePluginData();
            renderRulesList(containerEl, plugin);
            new Notice(
                isEditMode
                    ? `Rule "${updatedRule.name}" updated`
                    : `Rule "${updatedRule.name}" created`,
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
    rule: FlashcardTagRule,
    containerEl: HTMLElement,
): Promise<void> {
    const confirmed = confirm(
        `Are you sure you want to delete the rule "${rule.name}"?\n\n` +
            `Tag: ${rule.tagExact || rule.tagPattern}\n` +
            `This action cannot be undone.`,
    );

    if (!confirmed) return;

    plugin.data.settings.flashcardTagRules = plugin.data.settings.flashcardTagRules.filter(
        (r) => r.id !== rule.id,
    );

    await plugin.savePluginData();
    renderRulesList(containerEl, plugin);
    new Notice(`Rule "${rule.name}" deleted`);
}

/**
 * Toggle rule enabled/disabled
 */
async function toggleRule(
    plugin: SRPlugin,
    rule: FlashcardTagRule,
    enabled: boolean,
    containerEl: HTMLElement,
): Promise<void> {
    const ruleIndex = plugin.data.settings.flashcardTagRules.findIndex((r) => r.id === rule.id);
    if (ruleIndex === -1) return;

    plugin.data.settings.flashcardTagRules[ruleIndex].enabled = enabled;
    await plugin.savePluginData();
    renderRulesList(containerEl, plugin);
}
