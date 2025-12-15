/**
 * Rule Item Component
 * Displays a single flashcard rule in the rules list
 */

import { FlashcardRule } from "src/parser/rule-based/types";
import { setIcon } from "obsidian";

interface RuleItemProps {
    rule: FlashcardRule;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (enabled: boolean) => void;
}

/**
 * Create a rule item element
 */
export function createRuleItem(containerEl: HTMLElement, props: RuleItemProps): void {
    const { rule, onEdit, onDelete, onToggle } = props;

    const itemEl = containerEl.createDiv("flashcard-rule-item");

    // Left section: Toggle and info
    const leftSection = itemEl.createDiv("flashcard-rule-left");

    // Toggle switch
    const toggleContainer = leftSection.createDiv("flashcard-rule-toggle");
    const toggleInput = toggleContainer.createEl("input", { type: "checkbox" });
    toggleInput.checked = rule.enabled;
    toggleInput.addEventListener("change", () => {
        onToggle(toggleInput.checked);
    });

    // Rule info
    const infoContainer = leftSection.createDiv("flashcard-rule-info");
    
    const nameEl = infoContainer.createDiv("flashcard-rule-name");
    nameEl.textContent = rule.name || "(Unnamed Rule)";
    
    const metaEl = infoContainer.createDiv("flashcard-rule-meta");
    
    // Type badge
    const typeBadge = metaEl.createSpan("flashcard-rule-badge");
    typeBadge.textContent = rule.type;
    
    // Priority
    const prioritySpan = metaEl.createSpan("flashcard-rule-priority");
    prioritySpan.textContent = `Priority: ${rule.priority}`;
    
    // Tag pattern
    const tagSpan = metaEl.createSpan("flashcard-rule-tag");
    tagSpan.textContent = rule.tagPattern;

    // Right section: Actions
    const rightSection = itemEl.createDiv("flashcard-rule-actions");

    // Edit button
    const editBtn = rightSection.createEl("button", { cls: "flashcard-rule-action-btn" });
    setIcon(editBtn, "pencil");
    editBtn.setAttribute("aria-label", "Edit rule");
    editBtn.addEventListener("click", onEdit);

    // Delete button
    const deleteBtn = rightSection.createEl("button", { cls: "flashcard-rule-action-btn" });
    setIcon(deleteBtn, "trash");
    deleteBtn.setAttribute("aria-label", "Delete rule");
    deleteBtn.addEventListener("click", onDelete);
}
