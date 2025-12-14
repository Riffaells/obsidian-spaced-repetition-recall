/**
 * Reusable rule item component
 */

import { setIcon } from "obsidian";
import { FlashcardRule } from "src/parser/rule-based/types";

interface RuleItemProps {
    rule: FlashcardRule;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (enabled: boolean) => void;
}

/**
 * Create a rule item element
 */
export function createRuleItem(containerEl: HTMLElement, props: RuleItemProps): HTMLElement {
    const { rule, onEdit, onDelete, onToggle } = props;

    const itemEl = containerEl.createDiv("flashcard-rule-item");
    if (!rule.enabled) {
        itemEl.setAttribute("data-enabled", "false");
    }

    // Toggle checkbox
    const toggleEl = itemEl.createDiv({ cls: "rule-toggle" });
    const checkbox = toggleEl.createEl("input", { type: "checkbox" });
    checkbox.checked = rule.enabled;
    checkbox.addEventListener("change", () => onToggle(checkbox.checked));

    // Rule info
    const infoEl = itemEl.createDiv({ cls: "rule-info" });

    // Header with name and tag
    const headerEl = infoEl.createDiv({ cls: "rule-header" });

    const nameEl = headerEl.createSpan({ cls: "rule-name" });
    nameEl.textContent = rule.name;

    const tagEl = headerEl.createSpan({ cls: "rule-tag" });
    tagEl.textContent = rule.tagPattern || "";

    // Details
    const detailsEl = infoEl.createDiv({ cls: "rule-details" });

    // Source badge
    const sourceType = rule.type;

    const sourceBadge = detailsEl.createSpan({ cls: `rule-badge rule-badge-${sourceType}` });
    sourceBadge.textContent = sourceType.toUpperCase();

    // Priority badge (if > 0)
    if (rule.priority > 0) {
        const priorityBadge = detailsEl.createSpan({ cls: "rule-badge rule-badge-priority" });
        priorityBadge.textContent = `Priority: ${rule.priority}`;
    }

    // Configuration details
    const configText = getConfigurationText(rule);
    if (configText) {
        const configEl = detailsEl.createSpan({ cls: "rule-config" });
        configEl.textContent = configText;
    }

    // Actions
    const actionsEl = itemEl.createDiv({ cls: "rule-actions" });

    const editBtn = actionsEl.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `Edit ${rule.name}` },
    });
    setIcon(editBtn, "pencil");
    editBtn.addEventListener("click", onEdit);

    const deleteBtn = actionsEl.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `Delete ${rule.name}` },
    });
    setIcon(deleteBtn, "trash");
    deleteBtn.addEventListener("click", onDelete);

    return itemEl;
}

/**
 * Get human-readable configuration text
 */
function getConfigurationText(rule: FlashcardRule): string {
    const details: string[] = [];

    if (rule.type === "header") {
        const conf = rule.config;
        details.push(`Levels: ${conf.selection.levels.map((l) => `h${l}`).join(", ")}`);
        details.push(`Scope: ${conf.content.scope}`);
        if (conf.selection.strictPriority) details.push("Strict Priority");
    } else if (rule.type === "inline") {
        const conf = rule.config;
        details.push(`Separator: "${conf.separator}"`);
        if (conf.startOfLineOnly) details.push("Start of Line");
        if (conf.cloze?.enabled) details.push(`Cloze Patterns: ${conf.cloze.patterns?.length || 0}`);
    } else if (rule.type === "multiline") {
        const conf = rule.config;
        details.push(`Question: "${conf.questionLinePattern}"`);
        details.push(`Stop: ${conf.stopCondition.type}`);
    }

    return details.join(" • ");
}
